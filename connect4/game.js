// --- AUDIO SYNTHESIS ---
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTone(freq, type, duration, vol=0.1) {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
}

function playDropSound() {
    playTone(300, 'sine', 0.2, 0.2);
    setTimeout(() => playTone(400, 'sine', 0.1, 0.2), 100);
}

function playPoofSound() {
    // A weird noisy sliding sound
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.3);
    
    gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
    
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
}

function playWinSound() {
    playTone(400, 'square', 0.2, 0.2);
    setTimeout(() => playTone(500, 'square', 0.2, 0.2), 200);
    setTimeout(() => playTone(600, 'square', 0.4, 0.2), 400);
}

// --- GAME STATE ---
const ROWS = 6;
const COLS = 7;
let board = [];
let currentPlayer = 1; // 1 = Red, 2 = Yellow
let gameActive = false;
let gameMode = 'hotseat'; // 'hotseat', 'pve', 'online'
let myPlayerId = 1; // Used for PVE and Online to know which color 'I' am
let intervalTimer = null;
let secondsLeft = 13;

// --- PEER JS STATE ---
let peer = null;
let conn = null;

// --- DOM ELEMENTS ---
const menu = document.getElementById('main-menu');
const lobby = document.getElementById('online-lobby');
const gameArea = document.getElementById('game-area');
const boardEl = document.getElementById('board');
const currentPlayerDot = document.getElementById('current-player-color');
const turnText = document.getElementById('turn-text');
const timerBarFill = document.getElementById('disappear-timer-bar');
const timerText = document.getElementById('timer-text');
const gameOverPanel = document.getElementById('game-over-panel');
const winnerText = document.getElementById('winner-text');

// --- INIT ---
function initBoard() {
    board = Array(ROWS).fill(null).map(() => Array(COLS).fill(0));
    boardEl.innerHTML = '';
    
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.r = r;
            cell.dataset.c = c;
            cell.addEventListener('click', () => handleCellClick(c));
            boardEl.appendChild(cell);
        }
    }
}

function startGame(mode) {
    gameMode = mode;
    currentPlayer = 1;
    gameActive = true;
    secondsLeft = 13;
    gameOverPanel.classList.add('hidden');
    menu.classList.add('hidden');
    lobby.classList.add('hidden');
    gameArea.classList.remove('hidden');
    
    initBoard();
    updateUI();
    startTimer();
    
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

// --- LOGIC ---
function handleCellClick(c) {
    if (!gameActive) return;
    
    // Check if it's my turn
    if (gameMode === 'pve' && currentPlayer !== 1) return; // AI's turn
    if (gameMode === 'online' && currentPlayer !== myPlayerId) return; // Opponent's turn

    dropPiece(c, currentPlayer, true);
}

function dropPiece(c, player, isLocalMove) {
    // Find empty row
    let r = ROWS - 1;
    while (r >= 0 && board[r][c] !== 0) {
        r--;
    }
    
    if (r < 0) return; // Column full

    // Place piece
    board[r][c] = player;
    playDropSound();
    
    if (isLocalMove && gameMode === 'online' && conn) {
        conn.send({ type: 'move', c: c, player: player });
    }

    renderBoard();
    
    if (checkWin(player)) {
        endGame(player);
        return;
    }

    // Switch turn
    currentPlayer = currentPlayer === 1 ? 2 : 1;
    updateUI();
    
    // AI Move
    if (gameMode === 'pve' && currentPlayer === 2 && gameActive) {
        setTimeout(makeAIMove, 800);
    }
}

function checkWin(player) {
    // Horizontal, Vertical, Diagonal
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] === player) {
                if (c + 3 < COLS && board[r][c+1] === player && board[r][c+2] === player && board[r][c+3] === player) return true;
                if (r + 3 < ROWS && board[r+1][c] === player && board[r+2][c] === player && board[r+3][c] === player) return true;
                if (r + 3 < ROWS && c + 3 < COLS && board[r+1][c+1] === player && board[r+2][c+2] === player && board[r+3][c+3] === player) return true;
                if (r + 3 < ROWS && c - 3 >= 0 && board[r+1][c-1] === player && board[r+2][c-2] === player && board[r+3][c-3] === player) return true;
            }
        }
    }
    return false;
}

// --- CHAOS MECHANIC (GRAVITY / DISAPPEAR) ---
function startTimer() {
    if (intervalTimer) clearInterval(intervalTimer);
    intervalTimer = setInterval(() => {
        if (!gameActive) return;
        
        secondsLeft--;
        updateTimerUI();
        
        if (secondsLeft <= 0) {
            triggerChaos();
            secondsLeft = 13;
        }
    }, 1000);
}

function updateTimerUI() {
    timerText.innerText = secondsLeft;
    const pct = (secondsLeft / 13) * 100;
    timerBarFill.style.width = `${pct}%`;
}

function triggerChaos() {
    // Only host triggers chaos online to keep sync
    if (gameMode === 'online' && myPlayerId !== 1) return; 

    // Find all played pieces
    let pieces = [];
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            if (board[r][c] !== 0) pieces.push({r, c});
        }
    }
    
    if (pieces.length === 0) return; // Board is empty
    
    // Pick a random piece
    const idx = Math.floor(Math.random() * pieces.length);
    const target = pieces[idx];
    
    executeChaos(target.r, target.c);
    
    if (gameMode === 'online' && conn) {
        conn.send({ type: 'chaos', r: target.r, c: target.c });
    }
}

function executeChaos(r, c) {
    board[r][c] = 0; // Remove
    playPoofSound();
    
    // Visual Poof
    const cellIdx = r * COLS + c;
    const cell = boardEl.children[cellIdx];
    const pieceEl = cell.querySelector('.piece');
    if (pieceEl) {
        pieceEl.classList.remove('fall', 'dropIn');
        pieceEl.classList.add('poof');
        setTimeout(() => pieceEl.remove(), 400);
    }
    
    // Apply full gravity (pieces above fall down)
    setTimeout(() => {
        let piecesFell = false;
        for (let col = 0; col < COLS; col++) {
            // Read column bottom to top
            let newCol = [];
            for (let row = ROWS - 1; row >= 0; row--) {
                if (board[row][col] !== 0) {
                    newCol.push(board[row][col]);
                }
            }
            
            // Fill with 0s at the top
            while (newCol.length < ROWS) {
                newCol.push(0);
            }
            
            // Write back top to bottom
            for (let row = 0; row < ROWS; row++) {
                let val = newCol[ROWS - 1 - row];
                if (board[row][col] !== val) piecesFell = true;
                board[row][col] = val;
            }
        }
        
        if (piecesFell) {
            playDropSound(); // smaller sound for falling
        }
        renderBoard();
        
        // Re-check wins because gravity might cause a win!
        if (checkWin(1)) {
            endGame(1);
        } else if (checkWin(2)) {
            endGame(2);
        }
    }, 400);
}


// --- RENDERING ---
function renderBoard() {
    for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
            const cellIdx = r * COLS + c;
            const cell = boardEl.children[cellIdx];
            const val = board[r][c];
            
            // If cell has a piece but shouldn't, or wrong piece
            const existing = cell.querySelector('.piece');
            if (val === 0) {
                if (existing && !existing.classList.contains('poof')) existing.remove();
            } else {
                if (!existing) {
                    const p = document.createElement('div');
                    p.className = `piece ${val === 1 ? 'red' : 'yellow'}`;
                    cell.appendChild(p);
                } else {
                    // Update color if gravity changed it
                    existing.className = `piece ${val === 1 ? 'red' : 'yellow'} fall`;
                }
            }
        }
    }
}

function updateUI() {
    currentPlayerDot.className = `player-dot ${currentPlayer === 1 ? 'red' : 'yellow'}`;
    let turnName = currentPlayer === 1 ? 'Red' : 'Yellow';
    if (gameMode === 'pve' && currentPlayer === 2) turnName = 'AI';
    if (gameMode === 'online') turnName = currentPlayer === myPlayerId ? 'Your' : "Opponent's";
    
    turnText.innerText = `${turnName} Turn`;
}

function endGame(player) {
    gameActive = false;
    clearInterval(intervalTimer);
    playWinSound();
    
    let winner = player === 1 ? 'Red' : 'Yellow';
    if (gameMode === 'pve' && player === 2) winner = 'AI';
    if (gameMode === 'online') {
        winner = player === myPlayerId ? 'You Win!' : 'You Lose!';
    } else {
        winner += ' Wins!';
    }
    
    winnerText.innerText = winner;
    gameOverPanel.classList.remove('hidden');
}


// --- AI (PVE) ---
function makeAIMove() {
    if (!gameActive) return;
    
    // Very simple AI: random valid column
    let validCols = [];
    for (let c = 0; c < COLS; c++) {
        if (board[0][c] === 0) validCols.push(c);
    }
    
    if (validCols.length > 0) {
        // Try to find a winning move or block a loss
        let bestCol = -1;
        
        // 1. Can AI win?
        bestCol = findWinningMove(2);
        // 2. Can Player win? (Block it)
        if (bestCol === -1) bestCol = findWinningMove(1);
        // 3. Random
        if (bestCol === -1) bestCol = validCols[Math.floor(Math.random() * validCols.length)];
        
        dropPiece(bestCol, 2, false);
    }
}

function findWinningMove(player) {
    for (let c = 0; c < COLS; c++) {
        // Simulate drop
        let r = ROWS - 1;
        while (r >= 0 && board[r][c] !== 0) r--;
        if (r >= 0) {
            board[r][c] = player;
            if (checkWin(player)) {
                board[r][c] = 0; // undo
                return c;
            }
            board[r][c] = 0; // undo
        }
    }
    return -1;
}


// --- PEER JS (ONLINE P2P) ---
function setupOnlineLobby() {
    menu.classList.add('hidden');
    lobby.classList.remove('hidden');
    
    if (!peer) {
        peer = new Peer();
        peer.on('open', (id) => {
            document.getElementById('my-peer-id').innerText = id;
        });
        
        peer.on('connection', (connection) => {
            conn = connection;
            setupConnection(false); // They connected to me, I am host (Red)
        });
    }
}

function joinGame() {
    const friendId = document.getElementById('join-peer-id').value;
    if (!friendId) return;
    
    document.getElementById('join-status').innerText = 'Connecting...';
    conn = peer.connect(friendId);
    
    conn.on('open', () => {
        setupConnection(true); // I connected to them, I am joiner (Yellow)
    });
    
    conn.on('error', (err) => {
        document.getElementById('join-status').innerText = 'Connection failed.';
    });
}

function setupConnection(isJoiner) {
    myPlayerId = isJoiner ? 2 : 1;
    
    conn.on('data', (data) => {
        if (data.type === 'start') {
            startGame('online');
        }
        else if (data.type === 'move') {
            dropPiece(data.c, data.player, false);
        }
        else if (data.type === 'chaos') {
            secondsLeft = 13;
            executeChaos(data.r, data.c);
        }
        else if (data.type === 'rematch') {
            startGame('online');
        }
    });
    
    if (!isJoiner) {
        // Host starts game
        conn.send({ type: 'start' });
        startGame('online');
    }
}


// --- EVENT LISTENERS ---
document.getElementById('btn-pve').addEventListener('click', () => startGame('pve'));
document.getElementById('btn-hotseat').addEventListener('click', () => startGame('hotseat'));
document.getElementById('btn-online').addEventListener('click', setupOnlineLobby);
document.getElementById('btn-back-from-lobby').addEventListener('click', () => {
    lobby.classList.add('hidden');
    menu.classList.remove('hidden');
});
document.getElementById('btn-copy-id').addEventListener('click', () => {
    navigator.clipboard.writeText(document.getElementById('my-peer-id').innerText);
});
document.getElementById('btn-join').addEventListener('click', joinGame);

document.getElementById('btn-rematch').addEventListener('click', () => {
    if (gameMode === 'online' && conn) {
        conn.send({ type: 'rematch' });
    }
    startGame(gameMode);
});

document.getElementById('btn-menu').addEventListener('click', () => {
    gameOverPanel.classList.add('hidden');
    gameArea.classList.add('hidden');
    menu.classList.remove('hidden');
    if (intervalTimer) clearInterval(intervalTimer);
});
