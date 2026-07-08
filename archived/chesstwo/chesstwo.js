const chessboard = document.getElementById("chessboard");
const piecesLayer = document.getElementById("pieces-layer");
const highlightsLayer = document.getElementById("highlights-layer");
const difficultySelect = document.getElementById("difficulty");
const timeControlSelect = document.getElementById("time-control");
const startBtn = document.getElementById("start-btn");
const statusMessage = document.getElementById("status-message");
const botEloElem = document.getElementById("bot-elo");

// Clocks
const playerClock = document.getElementById("player-clock");
const botClock = document.getElementById("bot-clock");

let wTime = 0, bTime = 0;
let wInc = 0, bInc = 0;
let clockInterval = null;
let lastTick = 0;
let timeActive = false;
const MILLISECONDS = 1000;

// Game State
let game = null;
let engine = null;
let isGameActive = false;
let isPlayerTurn = true;
let pieceElements = {}; // square -> DOM element

// History / Move Log
let fenHistory = [];
let sanHistory = [];
let currentHistoryIndex = 0;
const moveLogElem = document.getElementById("move-log");

// Premoves
let activePremove = null; // {from, to}

// Arrows & Drawings
const svgLayer = document.getElementById("drawing-layer");
const drawArrowsGroup = document.getElementById("draw-arrows");
const drawHighlightsGroup = document.getElementById("draw-highlights");
let rightClickStartSq = null;
let persistentDrawings = []; // [{type: 'arrow', from, to}, {type: 'highlight', sq}]

// Drag/Click states
let selectedSquare = null;
let isDragging = false;
let draggedPieceSquare = null;
let dragStartX = 0, dragStartY = 0;
let didDragMove = false;
let boardRect = null;
let pieceWidth = 0;
let pieceHeight = 0;
let hoverSquare = null;
let lastDragEndTime = 0;
let ignoreNextClick = false;

// Audio
const sounds = {
    move: document.getElementById('snd-move'),
    capture: document.getElementById('snd-capture'),
    check: document.getElementById('snd-check'),
    promote: document.getElementById('snd-promote'),
    start: document.getElementById('snd-start'),
    end: document.getElementById('snd-end'),
    illegal: document.getElementById('snd-illegal')
};

function playSound(moveObj) {
    if (game.in_checkmate() || game.in_draw() || game.in_stalemate()) {
        sounds.end.currentTime = 0; sounds.end.play();
    } else if (game.in_check()) {
        sounds.check.currentTime = 0; sounds.check.play();
    } else if (moveObj.promotion) {
        sounds.promote.currentTime = 0; sounds.promote.play();
    } else if (moveObj.captured) {
        sounds.capture.currentTime = 0; sounds.capture.play();
    } else {
        sounds.move.currentTime = 0; sounds.move.play();
    }
}

// ----------------------------------------------------
// INITIALIZATION
// ----------------------------------------------------

const typeNameMap = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function initBoardDOM(fen) {
    piecesLayer.innerHTML = "";
    pieceElements = {};
    
    // Create grid layout if not exists
    if (chessboard.children.length === 0) {
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const squareId = String.fromCharCode(97 + c) + (8 - r);
                const isLight = (r + c) % 2 === 0;
                const square = document.createElement("div");
                square.className = `square ${isLight ? 'light' : 'dark'}`;
                square.dataset.square = squareId;
                chessboard.appendChild(square);
            }
        }
    }
    
    // Place pieces based on FEN (using a temporary chess instance)
    const temp = new Chess(fen);
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const squareId = String.fromCharCode(97 + c) + (8 - r);
            const piece = temp.get(squareId);
            
            if (piece) {
                const pElem = document.createElement("div");
                pElem.className = "piece";
                const typeName = typeNameMap[piece.type];
                pElem.style.backgroundImage = `url('../../assets/chess_pieces/${typeName}-${piece.color}.svg')`;
                setPiecePosition(pElem, squareId);
                piecesLayer.appendChild(pElem);
                pieceElements[squareId] = pElem;
            }
        }
    }
}

function setPiecePosition(elem, sq) {
    const { c, r } = sqToCoords(sq);
    elem.style.left = `${c * 12.5}%`;
    elem.style.top = `${r * 12.5}%`;
    elem.dataset.square = sq;
}

function sqToCoords(sq) {
    const c = sq.charCodeAt(0) - 97; // a -> 0
    const r = 8 - parseInt(sq[1]);   // 8 -> 0
    return { c, r };
}

function clearHighlights() {
    highlightsLayer.innerHTML = "";
    selectedSquare = null;
}

function clearArrows() {
    drawArrowsGroup.innerHTML = "";
    drawHighlightsGroup.innerHTML = "";
    persistentDrawings = [];
}

// ----------------------------------------------------
// CLOCK LOGIC
// ----------------------------------------------------

function formatTime(ms) {
    if (ms <= 0) return "00:00";
    let totalSeconds = Math.ceil(ms / 1000);
    let minutes = Math.floor(totalSeconds / 60);
    let seconds = totalSeconds % 60;
    if (totalSeconds < 10) {
        // Show tenths of a second if < 10s
        let tenths = Math.floor((ms % 1000) / 100);
        return `${seconds}.${tenths}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

function updateClockUI() {
    playerClock.textContent = formatTime(wTime);
    botClock.textContent = formatTime(bTime);
    
    if (wTime < 10000) playerClock.classList.add('low-time');
    else playerClock.classList.remove('low-time');
    
    if (bTime < 10000) botClock.classList.add('low-time');
    else botClock.classList.remove('low-time');
    
    if (isGameActive) {
        if (isPlayerTurn) {
            playerClock.classList.add('active');
            botClock.classList.remove('active');
        } else {
            botClock.classList.add('active');
            playerClock.classList.remove('active');
        }
    } else {
        playerClock.classList.remove('active');
        botClock.classList.remove('active');
    }
}

function gameTick() {
    if (!timeActive || !isGameActive) return;
    const now = Date.now();
    const dt = now - lastTick;
    lastTick = now;
    
    if (isPlayerTurn) {
        wTime -= dt;
        if (wTime <= 0) {
            wTime = 0;
            endGame("Timeout! Bot wins.");
        }
    } else {
        bTime -= dt;
        if (bTime <= 0) {
            bTime = 0;
            endGame("Timeout! Player wins.");
        }
    }
    updateClockUI();
}

// ----------------------------------------------------
// MOVES & TRAVERSAL
// ----------------------------------------------------

function renderMoveLog() {
    moveLogElem.innerHTML = "";
    let html = "";
    for (let i = 0; i < sanHistory.length; i += 2) {
        const moveNum = (i / 2) + 1;
        const wMove = sanHistory[i];
        const bMove = sanHistory[i+1] || "";
        
        const wClass = (i + 1 === currentHistoryIndex) ? 'active' : '';
        const bClass = (i + 2 === currentHistoryIndex) ? 'active' : '';
        
        html += `<div class="log-row">
            <div class="log-num">${moveNum}.</div>
            <div class="log-move ${wClass}" data-index="${i+1}">${wMove}</div>
            <div class="log-move ${bClass}" data-index="${i+2}">${bMove}</div>
        </div>`;
    }
    moveLogElem.innerHTML = html;
    moveLogElem.scrollTop = moveLogElem.scrollHeight;
}

moveLogElem.addEventListener('click', (e) => {
    if (e.target.classList.contains('log-move') && e.target.textContent.trim() !== "") {
        viewHistory(parseInt(e.target.dataset.index));
    }
});

function viewHistory(index) {
    if (index < 0) index = 0;
    if (index > fenHistory.length - 1) index = fenHistory.length - 1;
    currentHistoryIndex = index;
    
    initBoardDOM(fenHistory[currentHistoryIndex]);
    renderMoveLog();
    
    // Draw last move highlight for this state if > 0
    clearHighlights();
    if (index > 0) {
        // Find what the move was by looking at game history
        const moves = game.history({verbose: true});
        if (moves[index - 1]) {
            drawLastMoveHighlight(moves[index-1].from, moves[index-1].to);
        }
    }
}

document.getElementById('btn-start').addEventListener('click', () => viewHistory(0));
document.getElementById('btn-prev').addEventListener('click', () => viewHistory(currentHistoryIndex - 1));
document.getElementById('btn-next').addEventListener('click', () => viewHistory(currentHistoryIndex + 1));
document.getElementById('btn-end').addEventListener('click', () => viewHistory(fenHistory.length - 1));

document.addEventListener('keydown', (e) => {
    if (!isGameActive && fenHistory.length === 0) return;
    if (e.key === 'ArrowLeft') viewHistory(currentHistoryIndex - 1);
    if (e.key === 'ArrowRight') viewHistory(currentHistoryIndex + 1);
    if (e.key === 'Home') viewHistory(0);
    if (e.key === 'End') viewHistory(fenHistory.length - 1);
});

function executeMoveVisually(move) {
    // If not viewing current, jump to current before moving
    if (currentHistoryIndex !== fenHistory.length - 1) {
        viewHistory(fenHistory.length - 1);
    }

    clearHighlights();
    clearArrows();
    
    if (move.captured || move.flags.includes('e')) {
        let capSq = move.to;
        if (move.flags.includes('e')) { // En passant
            const { c, r } = sqToCoords(move.to);
            capSq = String.fromCharCode(97 + c) + (8 - (move.color === 'w' ? r + 1 : r - 1));
        }
        if (pieceElements[capSq]) {
            pieceElements[capSq].remove();
            delete pieceElements[capSq];
        }
    }

    const pElem = pieceElements[move.from];
    delete pieceElements[move.from];
    pieceElements[move.to] = pElem;
    setPiecePosition(pElem, move.to);

    if (move.flags.includes('k') || move.flags.includes('q')) {
        let rSq, rTo;
        if (move.to === 'g1') { rSq = 'h1'; rTo = 'f1'; }
        else if (move.to === 'c1') { rSq = 'a1'; rTo = 'd1'; }
        else if (move.to === 'g8') { rSq = 'h8'; rTo = 'f8'; }
        else if (move.to === 'c8') { rSq = 'a8'; rTo = 'd8'; }
        
        if (rSq && pieceElements[rSq]) {
            const rook = pieceElements[rSq];
            delete pieceElements[rSq];
            pieceElements[rTo] = rook;
            setPiecePosition(rook, rTo);
        }
    }

    if (move.promotion) {
        const typeName = typeNameMap[move.promotion];
        pElem.style.backgroundImage = `url('../../assets/chess_pieces/${typeName}-${move.color}.svg')`;
    }

    playSound(move);
    drawLastMoveHighlight(move.from, move.to);
    
    // Add to history
    fenHistory.push(game.fen());
    sanHistory.push(move.san);
    currentHistoryIndex = fenHistory.length - 1;
    renderMoveLog();
}

function drawLastMoveHighlight(from, to) {
    document.querySelectorAll('.highlight-last-move').forEach(e => e.remove());
    
    const divs = [document.createElement("div"), document.createElement("div")];
    divs[0].className = "highlight-last-move";
    divs[1].className = "highlight-last-move";
    
    const { c: c1, r: r1 } = sqToCoords(from);
    divs[0].style.left = `${c1 * 12.5}%`;
    divs[0].style.top = `${r1 * 12.5}%`;
    
    const { c: c2, r: r2 } = sqToCoords(to);
    divs[1].style.left = `${c2 * 12.5}%`;
    divs[1].style.top = `${r2 * 12.5}%`;
    
    chessboard.appendChild(divs[0]);
    chessboard.appendChild(divs[1]);
}

function drawPremoveHighlight(from, to) {
    // Clear old
    document.querySelectorAll('.highlight-premove').forEach(e => e.remove());
    if (!from || !to) return;
    
    const divs = [document.createElement("div"), document.createElement("div")];
    divs[0].className = "highlight-premove";
    divs[1].className = "highlight-premove";
    
    const { c: c1, r: r1 } = sqToCoords(from);
    divs[0].style.left = `${c1 * 12.5}%`;
    divs[0].style.top = `${r1 * 12.5}%`;
    
    const { c: c2, r: r2 } = sqToCoords(to);
    divs[1].style.left = `${c2 * 12.5}%`;
    divs[1].style.top = `${r2 * 12.5}%`;
    
    highlightsLayer.appendChild(divs[0]);
    highlightsLayer.appendChild(divs[1]);
}

// ----------------------------------------------------
// BOT LOGIC
// ----------------------------------------------------

function botMove() {
    if (!isGameActive) return;
    
    // Human-like time management heuristic
    const turnCount = game.history().length;
    let thinkTime = 500;
    
    if (turnCount < 10) {
        // Opening prep is fast
        thinkTime = Math.random() * 600 + 200; // 200ms - 800ms
    } else {
        // Budget about 1/30th of remaining time, capping at 3.5 seconds
        thinkTime = Math.random() * (bTime / 30) + (bTime / 60);
        if (thinkTime > 3500) thinkTime = 3500;
        if (thinkTime > bTime) thinkTime = Math.max(100, bTime - 500); // don't flag
    }
    
    engine.postMessage(`position fen ${game.fen()}`);
    engine.postMessage(`go movetime ${Math.floor(thinkTime)}`);
}

engine = new Worker("stockfish.js");
engine.onmessage = function(event) {
    const line = event.data;
    if (line.startsWith("bestmove")) {
        const match = line.match(/^bestmove\s([a-h][1-8])([a-h][1-8])([qrbn])?/);
        if (match) {
            const moveData = {
                from: match[1],
                to: match[2],
                promotion: match[3] || undefined
            };
            
            // Execute bot move
            const move = game.move(moveData);
            executeMoveVisually(move);
            bTime += bInc; // Increment bot clock
            
            // Turn over to player
            isPlayerTurn = true;
            statusMessage.textContent = "Your turn.";
            
            checkGameOver();
            
            if (isGameActive && activePremove) {
                // Attempt to execute premove!
                statusMessage.textContent = "Executing premove...";
                const p = activePremove;
                activePremove = null;
                drawPremoveHighlight(null, null);
                
                // Try it
                const pMove = game.move({ from: p.from, to: p.to, promotion: 'q' });
                if (pMove) {
                    wTime -= 100; // Small penalty for premove
                    if (wTime < 0) wTime = 0;
                    wTime += wInc;
                    executeMoveVisually(pMove);
                    isPlayerTurn = false;
                    statusMessage.textContent = "Stockfish is thinking...";
                    botMove();
                } else {
                    sounds.illegal.currentTime = 0; sounds.illegal.play();
                    statusMessage.textContent = "Premove failed.";
                }
            }
        }
    }
};

// ----------------------------------------------------
// GAME START
// ----------------------------------------------------

startBtn.addEventListener("click", () => {
    // Parse time
    const [tSecs, tInc] = timeControlSelect.value.split(',').map(Number);
    wTime = tSecs * MILLISECONDS;
    bTime = tSecs * MILLISECONDS;
    wInc = tInc * MILLISECONDS;
    bInc = tInc * MILLISECONDS;
    updateClockUI();
    
    // Config Bot
    const diff = parseInt(difficultySelect.value);
    botEloElem.textContent = diff;
    let skillLevel = 20;
    if (diff === 800) skillLevel = 0;
    if (diff === 1400) skillLevel = 2; // Nerfed heavily as requested
    
    engine.postMessage("uci");
    engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
    
    game = new Chess();
    fenHistory = [game.fen()];
    sanHistory = [];
    currentHistoryIndex = 0;
    renderMoveLog();
    
    initBoardDOM(game.fen());
    clearHighlights();
    clearArrows();
    drawPremoveHighlight(null, null);
    activePremove = null;
    
    isGameActive = true;
    isPlayerTurn = true;
    statusMessage.textContent = "Your turn.";
    sounds.start.currentTime = 0; sounds.start.play();
    
    // Start loop
    lastTick = Date.now();
    timeActive = true;
    if (clockInterval) clearInterval(clockInterval);
    clockInterval = setInterval(gameTick, 50);
});

function checkGameOver() {
    if (game.game_over()) {
        isGameActive = false;
        timeActive = false;
        if (game.in_checkmate()) statusMessage.textContent = isPlayerTurn ? "Checkmate! Stockfish wins." : "Checkmate! You win!";
        else if (game.in_draw()) statusMessage.textContent = "Draw!";
        else statusMessage.textContent = "Game Over";
    }
}

function endGame(msg) {
    isGameActive = false;
    timeActive = false;
    statusMessage.textContent = msg;
    sounds.end.currentTime = 0; sounds.end.play();
}

// ----------------------------------------------------
// INPUT (DRAG/CLICK/PREMOVE)
// ----------------------------------------------------

function attemptMove(from, to) {
    // Must be viewing present to move
    if (currentHistoryIndex !== fenHistory.length - 1) {
        viewHistory(fenHistory.length - 1);
        return false;
    }

    if (!isPlayerTurn) {
        // PREMOVE LOGIC
        activePremove = { from, to };
        drawPremoveHighlight(from, to);
        return true; 
    }

    // NORMAL LOGIC
    try {
        const moveObj = { from, to, promotion: 'q' }; // auto queen for simplicity
        const move = game.move(moveObj);
        
        if (move) {
            executeMoveVisually(move);
            
            wTime += wInc; // Increment player clock
            
            isPlayerTurn = false;
            statusMessage.textContent = "Stockfish is thinking...";
            checkGameOver();
            
            if (isGameActive) {
                botMove();
            }
            return true;
        } else {
            sounds.illegal.currentTime = 0; sounds.illegal.play();
            return false;
        }
    } catch (e) {
        // Invalid syntax (e.g. dropping off board)
        return false;
    }
}

function drawValidMoves(sq) {
    highlightsLayer.innerHTML = "";
    
    // Highlight selected
    const selDiv = document.createElement("div");
    selDiv.className = "highlight-selected";
    const { c, r } = sqToCoords(sq);
    selDiv.style.left = `${c * 12.5}%`;
    selDiv.style.top = `${r * 12.5}%`;
    highlightsLayer.appendChild(selDiv);
    
    // Only show valid moves if it's player's turn
    if (!isPlayerTurn) return;
    
    const moves = game.moves({ square: sq, verbose: true });
    moves.forEach(m => {
        const md = document.createElement("div");
        const { c: mc, r: mr } = sqToCoords(m.to);
        md.className = `move-hint ${m.captured ? 'capture' : 'empty'}`;
        md.style.left = `${mc * 12.5}%`;
        md.style.top = `${mr * 12.5}%`;
        md.dataset.square = m.to;
        highlightsLayer.appendChild(md);
    });
}

function onDragStart(e) {
    if (!isGameActive || e.button === 2) return; // ignore right clicks here
    const pElem = e.target;
    const sq = pElem.dataset.square;
    const piece = game.get(sq);
    if (!piece || piece.color !== 'w') return;

    // Disallow if viewing history
    if (currentHistoryIndex !== fenHistory.length - 1) return;

    isDragging = true;
    didDragMove = false;
    draggedPieceSquare = sq;
    
    pElem.classList.add("dragging");
    
    let clientX, clientY;
    if (e.type === "touchstart") {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
        e.preventDefault();
    }
    
    dragStartX = clientX;
    dragStartY = clientY;
    
    if (selectedSquare !== sq) {
        selectedSquare = sq;
        drawValidMoves(sq);
        ignoreNextClick = true; 
    } else {
        ignoreNextClick = false;
    }

    document.addEventListener("mousemove", onDragMove);
    document.addEventListener("touchmove", onDragMove, {passive: false});
    document.addEventListener("mouseup", onDragEnd);
    document.addEventListener("touchend", onDragEnd);
}

function updateHoverHint(clientX, clientY) {
    if (hoverSquare) {
        hoverSquare.classList.remove('drop-hint');
        hoverSquare = null;
    }
    
    const elemBelow = document.elementFromPoint(clientX, clientY);
    if (elemBelow) {
        const sqElem = elemBelow.closest('.square, .move-hint, .piece');
        if (sqElem && sqElem.dataset.square) {
            hoverSquare = document.querySelector(`.square[data-square="${sqElem.dataset.square}"]`);
            if (hoverSquare) hoverSquare.classList.add('drop-hint');
        }
    }
}

function onDragMove(e) {
    if (!isDragging) return;
    
    let clientX, clientY;
    if (e.type === "touchmove") {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
        e.preventDefault();
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const dx = clientX - dragStartX;
    const dy = clientY - dragStartY;
    
    if (!didDragMove && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        didDragMove = true;
    }
    
    if (didDragMove) {
        const pElem = pieceElements[draggedPieceSquare];
        pElem.style.transform = `translate(${dx}px, ${dy}px) scale(1.2)`;
        
        updateHoverHint(clientX, clientY);
    }
}

function onDragEnd(e) {
    if (!isDragging) return;
    isDragging = false;
    
    document.removeEventListener("mousemove", onDragMove);
    document.removeEventListener("touchmove", onDragMove);
    document.removeEventListener("mouseup", onDragEnd);
    document.removeEventListener("touchend", onDragEnd);
    
    if (hoverSquare) {
        hoverSquare.classList.remove('drop-hint');
        hoverSquare = null;
    }
    
    const pElem = pieceElements[draggedPieceSquare];
    pElem.classList.remove("dragging");
    pElem.style.transform = "";
    
    let clientX, clientY;
    if (e.type === "touchend") {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
    } else {
        clientX = e.clientX;
        clientY = e.clientY;
    }
    
    const elemBelow = document.elementFromPoint(clientX, clientY);
    let targetSq = null;
    if (elemBelow) {
        const sqElem = elemBelow.closest('.square, .move-hint, .piece');
        if (sqElem) targetSq = sqElem.dataset.square;
    }
    
    if (didDragMove) {
        lastDragEndTime = Date.now();
        if (targetSq && targetSq !== draggedPieceSquare) {
            const success = attemptMove(draggedPieceSquare, targetSq);
            if (!success) {
                setPiecePosition(pElem, draggedPieceSquare); 
            }
        } else {
            setPiecePosition(pElem, draggedPieceSquare);
        }
    } else {
        setPiecePosition(pElem, draggedPieceSquare);
    }
}

function onSquareClick(sq) {
    if (!isGameActive) return;
    
    // If not at current history, jump forward
    if (currentHistoryIndex !== fenHistory.length - 1) {
        viewHistory(fenHistory.length - 1);
        return;
    }

    if (selectedSquare) {
        if (selectedSquare === sq) {
            clearHighlights();
            return;
        }
        
        // Premove logic allows clicking anywhere to anywhere
        if (!isPlayerTurn) {
            attemptMove(selectedSquare, sq);
            clearHighlights();
            return;
        }
        
        const moves = game.moves({ square: selectedSquare, verbose: true });
        const validMove = moves.find(m => m.to === sq);
        
        if (validMove) {
            attemptMove(selectedSquare, sq);
            return;
        }
    }

    // Only allow selecting White pieces for player (unless we're observing, but player is always white)
    const piece = game.get(sq);
    if (piece && piece.color === 'w') {
        selectedSquare = sq;
        drawValidMoves(sq);
    } else {
        clearHighlights();
    }
}

document.querySelector('.board-container').addEventListener('click', (e) => {
    if (Date.now() - lastDragEndTime < 50) return;

    // Clear right-click arrows on left click
    if (e.button === 0) clearArrows();
    
    // Clear premoves if we click anywhere while it's bot's turn
    if (!isPlayerTurn && activePremove) {
        activePremove = null;
        drawPremoveHighlight(null, null);
    }
    
    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }
    
    const elem = e.target.closest('.square, .piece, .move-hint');
    if (elem && elem.dataset.square) {
        onSquareClick(elem.dataset.square);
    }
});

piecesLayer.addEventListener("mousedown", onDragStart);
piecesLayer.addEventListener("touchstart", onDragStart, {passive: false});

// ----------------------------------------------------
// RIGHT CLICK DRAWING (ARROWS / HIGHLIGHTS)
// ----------------------------------------------------

// Allow all arrows
function isPlausibleMove(from, to) {
    return true;
}

function getSquareFromEvent(e) {
    const rect = chessboard.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    const c = Math.floor((x / rect.width) * 8);
    const r = Math.floor((y / rect.height) * 8);
    return String.fromCharCode(97 + c) + (8 - r);
}

document.querySelector('.board-container').addEventListener('contextmenu', e => {
    e.preventDefault();
});

document.querySelector('.board-container').addEventListener('mousedown', e => {
    if (e.button !== 2) return; // Only Right Click
    
    // Clear premoves on right click
    if (activePremove) {
        activePremove = null;
        drawPremoveHighlight(null, null);
    }

    const sq = getSquareFromEvent(e);
    if (!sq) return;
    rightClickStartSq = sq;
    
    const onRightDragMove = (em) => {
        const currentSq = getSquareFromEvent(em);
        if (!currentSq || currentSq === rightClickStartSq) {
            // Draw temporary highlight
            renderTemporaryDrawing(rightClickStartSq, null);
        } else {
            // Draw temporary arrow
            renderTemporaryDrawing(rightClickStartSq, currentSq);
        }
    };
    
    const onRightDragEnd = (eu) => {
        document.removeEventListener('mousemove', onRightDragMove);
        document.removeEventListener('mouseup', onRightDragEnd);
        
        const endSq = getSquareFromEvent(eu);
        if (endSq) {
            if (endSq === rightClickStartSq) {
                togglePersistentHighlight(endSq);
            } else if (isPlausibleMove(rightClickStartSq, endSq)) {
                togglePersistentArrow(rightClickStartSq, endSq);
            }
        }
        renderAllDrawings();
    };
    
    document.addEventListener('mousemove', onRightDragMove);
    document.addEventListener('mouseup', onRightDragEnd);
});

function togglePersistentHighlight(sq) {
    const idx = persistentDrawings.findIndex(d => d.type === 'highlight' && d.sq === sq);
    if (idx !== -1) persistentDrawings.splice(idx, 1);
    else persistentDrawings.push({ type: 'highlight', sq });
}

function togglePersistentArrow(from, to) {
    const idx = persistentDrawings.findIndex(d => d.type === 'arrow' && d.from === from && d.to === to);
    if (idx !== -1) persistentDrawings.splice(idx, 1);
    else persistentDrawings.push({ type: 'arrow', from, to });
}

function renderTemporaryDrawing(from, to) {
    renderAllDrawings(); // start with persistant
    
    if (!to) {
        // Draw highlight
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        const { c, r } = sqToCoords(from);
        rect.setAttribute("x", `${c * 12.5}%`);
        rect.setAttribute("y", `${r * 12.5}%`);
        rect.setAttribute("width", "12.5%");
        rect.setAttribute("height", "12.5%");
        rect.setAttribute("fill", "rgba(235, 97, 80, 0.8)");
        drawHighlightsGroup.appendChild(rect);
    } else if (isPlausibleMove(from, to)) {
        // Draw arrow
        appendArrowSVG(from, to);
    }
}

function renderAllDrawings() {
    drawHighlightsGroup.innerHTML = "";
    drawArrowsGroup.innerHTML = "";
    
    persistentDrawings.forEach(d => {
        if (d.type === 'highlight') {
            const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
            const { c, r } = sqToCoords(d.sq);
            rect.setAttribute("x", `${c * 12.5}%`);
            rect.setAttribute("y", `${r * 12.5}%`);
            rect.setAttribute("width", "12.5%");
            rect.setAttribute("height", "12.5%");
            rect.setAttribute("fill", "rgba(235, 97, 80, 0.8)");
            drawHighlightsGroup.appendChild(rect);
        } else if (d.type === 'arrow') {
            appendArrowSVG(d.from, d.to);
        }
    });
}

function appendArrowSVG(from, to) {
    const { c: c1, r: r1 } = sqToCoords(from);
    const { c: c2, r: r2 } = sqToCoords(to);
    
    const x1 = (c1 + 0.5) * 12.5;
    const y1 = (r1 + 0.5) * 12.5;
    const x2 = (c2 + 0.5) * 12.5;
    const y2 = (r2 + 0.5) * 12.5;
    
    // Offset end slightly so the arrowhead fits inside the square
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.sqrt(dx*dx + dy*dy);
    if (len === 0) return;
    
    const ox = (dx / len) * 4;
    const oy = (dy / len) * 4;
    
    const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
    line.setAttribute("x1", `${x1}%`);
    line.setAttribute("y1", `${y1}%`);
    line.setAttribute("x2", `${x2 - ox}%`);
    line.setAttribute("y2", `${y2 - oy}%`);
    line.setAttribute("stroke", "rgba(255, 170, 0, 0.8)");
    line.setAttribute("stroke-width", "2.5%");
    line.setAttribute("marker-end", "url(#arrowhead)");
    line.setAttribute("stroke-linecap", "round");
    
    drawArrowsGroup.appendChild(line);
}
