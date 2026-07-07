const chessboard = document.getElementById("chessboard");
const piecesLayer = document.getElementById("pieces-layer");
const highlightsLayer = document.getElementById("highlights-layer");
const difficultySelect = document.getElementById("difficulty");
const startBtn = document.getElementById("start-btn");
const statusMessage = document.getElementById("status-message");

let game = null;
let engine = null;
let isGameActive = false;
let isPlayerTurn = true;
let pieceElements = {}; // square -> DOM element

// Drag/Click states
let selectedSquare = null;
let isDragging = false;
let draggedPieceSquare = null;
let dragStartX = 0, dragStartY = 0;

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
    } else if (moveObj && moveObj.promotion) {
        sounds.promote.currentTime = 0; sounds.promote.play();
    } else if (moveObj && moveObj.captured) {
        sounds.capture.currentTime = 0; sounds.capture.play();
    } else {
        sounds.move.currentTime = 0; sounds.move.play();
    }
}

const PIECES = {
    'p': 'pawn-b.svg', 'n': 'knight-b.svg', 'b': 'bishop-b.svg', 'r': 'rook-b.svg', 'q': 'queen-b.svg', 'k': 'king-b.svg',
    'P': 'pawn-w.svg', 'N': 'knight-w.svg', 'B': 'bishop-w.svg', 'R': 'rook-w.svg', 'Q': 'queen-w.svg', 'K': 'king-w.svg'
};

function sqToCoords(sq) {
    const c = sq.charCodeAt(0) - 97;
    const r = 8 - parseInt(sq[1]);
    return { c, r };
}

function setPiecePosition(elem, sq) {
    const { c, r } = sqToCoords(sq);
    elem.style.left = `${c * 12.5}%`;
    elem.style.top = `${r * 12.5}%`;
    elem.dataset.square = sq;
}

function initBoardDOM() {
    chessboard.innerHTML = "";
    piecesLayer.innerHTML = "";
    highlightsLayer.innerHTML = "";
    pieceElements = {};
    
    // Draw background squares
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
    
    // Populate pieces
    const board = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const sq = String.fromCharCode(97 + c) + (8 - r);
            const p = board[r][c];
            if (p) {
                createPieceDOM(p.color, p.type, sq);
            }
        }
    }
}

function createPieceDOM(color, type, sq) {
    const char = color === 'w' ? type.toUpperCase() : type;
    const piece = document.createElement("div");
    piece.className = `piece ${color}`;
    piece.style.backgroundImage = `url('../assets/chess_pieces/${PIECES[char]}')`;
    setPiecePosition(piece, sq);
    
    piece.addEventListener("mousedown", onDragStart);
    piece.addEventListener("touchstart", onDragStart, {passive: false});
    
    piecesLayer.appendChild(piece);
    pieceElements[sq] = piece;
    return piece;
}

function executeMoveVisually(move) {
    if (move.captured) {
        if (move.flags.includes('e')) { // En passant
            const epRank = move.color === 'w' ? 5 : 4;
            const epSquare = move.to[0] + epRank;
            if (pieceElements[epSquare]) {
                pieceElements[epSquare].remove();
                delete pieceElements[epSquare];
            }
        } else {
            if (pieceElements[move.to]) {
                pieceElements[move.to].remove();
            }
        }
    }

    const pElem = pieceElements[move.from];
    delete pieceElements[move.from];
    pieceElements[move.to] = pElem;
    setPiecePosition(pElem, move.to);

    if (move.promotion) {
        const char = move.color === 'w' ? move.promotion.toUpperCase() : move.promotion;
        pElem.style.backgroundImage = `url('../assets/chess_pieces/${PIECES[char]}')`;
    }

    if (move.flags.includes('k')) { // Kingside
        const rFrom = 'h' + move.to[1];
        const rTo = 'f' + move.to[1];
        const rElem = pieceElements[rFrom];
        delete pieceElements[rFrom];
        pieceElements[rTo] = rElem;
        setPiecePosition(rElem, rTo);
    } else if (move.flags.includes('q')) { // Queenside
        const rFrom = 'a' + move.to[1];
        const rTo = 'd' + move.to[1];
        const rElem = pieceElements[rFrom];
        delete pieceElements[rFrom];
        pieceElements[rTo] = rElem;
        setPiecePosition(rElem, rTo);
    }
    
    drawLastMoveHighlight(move.from, move.to);
    playSound(move);
}

function attemptMove(from, to) {
    const piece = game.get(from);
    let isPromotion = false;
    if (piece && piece.type === 'p') {
        if ((piece.color === 'w' && to[1] === '8') || (piece.color === 'b' && to[1] === '1')) {
            isPromotion = true;
        }
    }
    
    let move = null;
    try {
        const moveObj = { from: from, to: to };
        if (isPromotion) moveObj.promotion = 'q';
        move = game.move(moveObj);
    } catch (e) {
        console.error("Invalid move caught", e);
    }
    
    if (move) {
        clearHighlights();
        executeMoveVisually(move);
        isPlayerTurn = false;
        
        if (game.game_over()) {
            endGame();
        } else {
            triggerBotWithDelay();
        }
        return true;
    }
    
    // Invalid move
    sounds.illegal.currentTime = 0; sounds.illegal.play();
    return false;
}

// Global click handler
let lastDragEndTime = 0;
let ignoreNextClick = false;

document.querySelector('.board-container').addEventListener('click', (e) => {
    if (Date.now() - lastDragEndTime < 50) return; // Ignore click triggered right after drag
    
    if (ignoreNextClick) {
        ignoreNextClick = false;
        return;
    }
    
    const elem = e.target.closest('.square, .piece, .move-hint');
    if (elem && elem.dataset.square) {
        onSquareClick(elem.dataset.square);
    }
});

// UI Interaction
function onSquareClick(sq) {
    if (!isGameActive || !isPlayerTurn) return;

    // If we have a selected piece, try to move to the clicked square
    if (selectedSquare) {
        if (selectedSquare === sq) {
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

    // Try selecting
    const piece = game.get(sq);
    if (piece && piece.color === 'w') {
        selectedSquare = sq;
        drawValidMoves(sq);
    } else {
        clearHighlights();
    }
}

let didDragMove = false;
let boardRect = null;
let pieceWidth = 0;
let pieceHeight = 0;
let hoverSquare = null;

function onDragStart(e) {
    if (!isGameActive || !isPlayerTurn) return;
    const pElem = e.target;
    const sq = pElem.dataset.square;
    const piece = game.get(sq);
    if (!piece || piece.color !== 'w') return;

    isDragging = true;
    didDragMove = false;
    draggedPieceSquare = sq;
    
    // Setup real piece for drag
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
    
    boardRect = chessboard.getBoundingClientRect();
    pieceWidth = boardRect.width / 8;
    pieceHeight = boardRect.height / 8;
    
    if (selectedSquare !== sq) {
        selectedSquare = sq;
        drawValidMoves(sq);
        ignoreNextClick = true; // prevent immediate click from clearing this
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
        pElem.style.left = `${clientX - boardRect.left - pieceWidth/2}px`;
        pElem.style.top = `${clientY - boardRect.top - pieceHeight/2}px`;
        
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
    
    // Find square under cursor
    pElem.style.display = 'none';
    const elemBelow = document.elementFromPoint(clientX, clientY);
    pElem.style.display = '';
    
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
                setPiecePosition(pElem, draggedPieceSquare); // snap back
            }
        } else {
            setPiecePosition(pElem, draggedPieceSquare); // snap back
        }
    } else {
        setPiecePosition(pElem, draggedPieceSquare); // snap back
    }
}

// Highlighting
function drawValidMoves(sq) {
    highlightsLayer.innerHTML = "";
    
    // Highlight selected square
    const selDiv = document.createElement("div");
    selDiv.className = "highlight-selected";
    const { c, r } = sqToCoords(sq);
    selDiv.style.left = `${c * 12.5}%`;
    selDiv.style.top = `${r * 12.5}%`;
    highlightsLayer.appendChild(selDiv);
    
    // Hints
    const moves = game.moves({ square: sq, verbose: true });
    moves.forEach(m => {
        const hint = document.createElement("div");
        const hc = sqToCoords(m.to).c;
        const hr = sqToCoords(m.to).r;
        hint.style.left = `${hc * 12.5}%`;
        hint.style.top = `${hr * 12.5}%`;
        hint.dataset.square = m.to;
        
        const targetPiece = game.get(m.to);
        hint.className = `move-hint ${targetPiece ? 'capture' : 'empty'}`;
        
        hint.addEventListener("click", () => {
            attemptMove(sq, m.to);
        });
        
        highlightsLayer.appendChild(hint);
    });
}

function clearHighlights() {
    selectedSquare = null;
    highlightsLayer.innerHTML = "";
}

function drawLastMoveHighlight(from, to) {
    const existing = document.querySelectorAll(".highlight-last-move");
    existing.forEach(e => e.remove());
    
    [from, to].forEach(sq => {
        const div = document.createElement("div");
        div.className = "highlight-last-move";
        const { c, r } = sqToCoords(sq);
        div.style.left = `${c * 12.5}%`;
        div.style.top = `${r * 12.5}%`;
        chessboard.appendChild(div); // Put behind pieces and hints
    });
}

// Bot Logic
function initEngine() {
    engine = new Worker("stockfish.js");
    engine.onmessage = function(event) {
        const line = event.data || event;
        if (line === "uciok") {
            engine.postMessage("isready");
        } else if (line === "readyok") {
            console.log("Stockfish ready");
        } else if (line.startsWith("bestmove")) {
            const match = line.match(/^bestmove ([a-h][1-8])([a-h][1-8])([qrbn])?/);
            if (match) {
                const from = match[1];
                const to = match[2];
                const promotion = match[3] || 'q';
                
                const move = game.move({from, to, promotion, sloppy: true});
                if (move) {
                    executeMoveVisually(move);
                    isPlayerTurn = true;
                    statusMessage.textContent = "Your turn.";
                    
                    if (game.game_over()) {
                        endGame();
                    }
                }
            }
        }
    };
    engine.postMessage("uci");
}

function setSkillLevel() {
    const elo = parseInt(difficultySelect.value);
    document.getElementById('bot-elo').textContent = elo;
    
    let skillLevel = 0;
    let depth = 1;
    if (elo === 800) { skillLevel = 0; depth = 1; }
    else if (elo === 1400) { skillLevel = 10; depth = 5; }
    else if (elo === 2000) { skillLevel = 20; depth = 10; }
    
    engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
    return depth;
}

function triggerBotWithDelay() {
    if (!isGameActive) return;
    statusMessage.textContent = "Stockfish is thinking...";
    
    setTimeout(() => {
        const depth = setSkillLevel();
        engine.postMessage(`position fen ${game.fen()}`);
        engine.postMessage(`go depth ${depth}`);
    }, Math.random() * 800 + 500);
}

function endGame() {
    isGameActive = false;
    let msg = "Game Over! Draw.";
    if (game.in_checkmate()) {
        msg = game.turn() === 'w' ? "Checkmate! Stockfish wins." : "Checkmate! You win!";
    }
    statusMessage.textContent = msg;
    sounds.end.currentTime = 0; sounds.end.play();
}

startBtn.addEventListener("click", () => {
    if (typeof Chess === 'function') {
        game = new Chess();
    } else {
        console.error("chess.js not loaded properly.");
        return;
    }
    
    if (!engine) initEngine();
    
    isGameActive = true;
    isPlayerTurn = true;
    
    document.querySelectorAll('.highlight-last-move').forEach(e => e.remove());
    statusMessage.textContent = "Your turn. Good luck.";
    
    setSkillLevel();
    initBoardDOM();
    sounds.start.currentTime = 0; sounds.start.play();
});

// Load engine script early
initEngine();
