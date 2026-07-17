const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const rollBtn = document.getElementById('roll-btn');
const statusText = document.getElementById('player-status');
const diceEl = document.getElementById('dice');
const promptText = document.getElementById('interaction-prompt');

const baseHuman = document.getElementById('base-human');
const baseBot = document.getElementById('base-bot');
const startMenu = document.getElementById('start-menu');

const BOARD_SIZE = 10;
const TOTAL_CELLS = BOARD_SIZE * BOARD_SIZE;
const CELL_SIZE = canvas.width / BOARD_SIZE;

let cells = [];
let snakes = [];
let ladders = [];

let players = [
    { type: 'human', name: 'Player 1', color: '#3b82f6', pieces: [], baseEl: baseHuman },
    { type: 'bot', name: 'Bot', color: '#ef4444', pieces: [], baseEl: baseBot }
];
let currentPlayerIdx = 0;
let movingPiece = null;
let currentRoll = 0;
let validPieces = [];

let gameState = 'START_MENU'; 
let time = 0;
let boardAlpha = 1.0;
let animatingWin = false;
let winPlayerIdx = 0;
let winPhase = 0; // 0: gameplay, 1: wave up, 2: form letters

// Multiplayer
let peer = null;
let conn = null;
let gameMode = 'pve'; // pve, local, online-host, online-join
let myPlayerIdx = 0; 
let targetSnakeFormations = [];

const COLORS = {
    cell1: 'rgba(255, 255, 255, 0.5)',
    cell2: 'rgba(255, 255, 255, 0.2)',
    text: '#14532d',
    snake: '#10b981',
    snakeHead: '#059669',
    ladder: '#92400e',
    ladderRung: '#b45309'
};

const LETTER_SHAPES = {
    'Y': [[0,0, 10,15, 10,30, 10,30], [20,0, 10,15, 10,15, 10,15]],
    'O': [[10,0, 20,15, 10,30, 0,15]],
    'U': [[0,0, 0,20, 10,30, 20,0]],
    'W': [[0,0, 5,30, 10,15, 10,15], [10,15, 15,30, 20,0, 20,0]],
    'I': [[10,0, 10,10, 10,20, 10,30]],
    'N': [[0,30, 0,0, 20,30, 20,0]],
    'S': [[20,0, 0,0, 20,30, 0,30]],
    'B': [[0,30, 0,0, 20,15, 0,30]],
    'T': [[0,0, 20,0, 10,0, 10,30]],
    'P': [[0,30, 0,0, 20,10, 0,20]],
    '1': [[0,10, 10,0, 10,30, 10,30]],
    '2': [[0,0, 20,0, 0,30, 20,30]],
    '!': [[10,0, 10,20, 10,20, 10,20], [10,27, 10,30, 10,30, 10,30]],
    ' ': []
};

// UI Navigation
let currentModeSelect = null;
window.navMenu = function(target, mode) {
    document.getElementById('menu-main').classList.add('hidden');
    document.getElementById('menu-online').classList.add('hidden');
    document.getElementById('menu-pieces').classList.add('hidden');
    document.getElementById('menu-lobby').classList.add('hidden');
    
    if (target === 'main') {
        document.getElementById('menu-main').classList.remove('hidden');
        if (peer) { peer.destroy(); peer = null; }
    } else if (target === 'online') {
        document.getElementById('menu-online').classList.remove('hidden');
    } else if (target === 'pieces') {
        document.getElementById('menu-pieces').classList.remove('hidden');
        if (mode) currentModeSelect = mode; 
    }
};

window.joinLobby = function() {
    let id = document.getElementById('join-id').value.trim();
    if (!id) return;
    document.getElementById('network-status').innerText = "Connecting...";
    
    gameMode = 'online-join';
    players[0].name = "Opponent (P1)";
    players[1].name = "You (P2)";
    players[1].type = 'human';
    document.getElementById('label-player2').innerText = "Your Base";
    myPlayerIdx = 1;
    
    peer = new Peer();
    peer.on('open', () => {
        conn = peer.connect(id);
        setupConnection(null);
    });
};

window.cancelLobby = function() {
    navMenu('main');
};

function setupConnection(hostPieces) {
    conn.on('open', () => {
        if (gameMode === 'online-host') {
            conn.send({ type: 'start', pieces: hostPieces });
            startActualGame(hostPieces);
        } else {
            document.getElementById('network-status').innerText = "Connected! Waiting for host...";
        }
    });
    
    conn.on('data', data => {
        if (data.type === 'start') {
            startActualGame(data.pieces);
        } else if (data.type === 'roll') {
            currentRoll = data.value;
            triggerRollVisuals(true);
        } else if (data.type === 'move') {
            let p = players[data.pIdx].pieces[data.pieceId];
            startMove(p, true);
        } else if (data.type === 'shift_snake') {
            applySnakeShift(data);
        } else if (data.type === 'shift_ladder') {
            applyLadderShift(data);
        }
    });
}

window.startGame = function(pieces) {
    if (currentModeSelect === 'pve') {
        gameMode = 'pve';
        players[0].name = "You";
        players[1].name = "Bot";
        players[1].type = 'bot';
        myPlayerIdx = 0;
        startActualGame(pieces);
    } else if (currentModeSelect === 'local') {
        gameMode = 'local';
        players[0].name = "Player 1";
        players[1].name = "Player 2";
        players[1].type = 'human';
        myPlayerIdx = 0; // Both are local
        document.getElementById('label-player2').innerText = "P2 Base";
        startActualGame(pieces);
    } else if (currentModeSelect === 'host') {
        gameMode = 'online-host';
        players[0].name = "You (P1)";
        players[1].name = "Opponent (P2)";
        players[1].type = 'human';
        myPlayerIdx = 0;
        document.getElementById('label-player2').innerText = "Opponent Base";
        
        document.getElementById('menu-pieces').classList.add('hidden');
        document.getElementById('menu-lobby').classList.remove('hidden');
        
        let otp = Math.floor(1000 + Math.random() * 9000).toString();
        peer = new Peer(otp);
        peer.on('open', id => {
            document.getElementById('lobby-id').innerText = id;
        });
        peer.on('connection', c => {
            conn = c;
            setupConnection(pieces);
        });
    }
};

function startActualGame(count) {
    startMenu.classList.add('hidden');
    initCells();
    initPieces(count);
    initEntities();
    
    gameState = 'IDLE';
    updateTurnUI();
    requestAnimationFrame(gameLoop);
}

// Logic Utils
function initCells() {
    cells = [];
    for (let i = 1; i <= TOTAL_CELLS; i++) {
        let row = Math.floor((i - 1) / BOARD_SIZE);
        let col = (i - 1) % BOARD_SIZE;
        if (row % 2 !== 0) col = BOARD_SIZE - 1 - col;
        let cx = col * CELL_SIZE + CELL_SIZE / 2;
        let cy = canvas.height - (row * CELL_SIZE + CELL_SIZE / 2);
        cells.push({ id: i, cx, cy });
    }
}

function getColRow(id) {
    let zeroIdx = id - 1;
    let row = Math.floor(zeroIdx / BOARD_SIZE);
    let col = zeroIdx % BOARD_SIZE;
    if (row % 2 !== 0) col = BOARD_SIZE - 1 - col;
    return { col, row };
}

function getId(col, row) {
    if (col < 0 || col >= BOARD_SIZE || row < 0 || row >= BOARD_SIZE) return null;
    let logicalCol = (row % 2 !== 0) ? (BOARD_SIZE - 1 - col) : col;
    return row * BOARD_SIZE + logicalCol + 1;
}

function getAdjacentIds(id) {
    let cr = getColRow(id);
    return [
        getId(cr.col + 1, cr.row),
        getId(cr.col - 1, cr.row),
        getId(cr.col, cr.row + 1),
        getId(cr.col, cr.row - 1)
    ].filter(v => v !== null && v >= 2 && v <= 99);
}

function initPieces(count) {
    for (let pIdx = 0; pIdx < 2; pIdx++) {
        let player = players[pIdx];
        player.baseEl.innerHTML = '';
        player.pieces = [];
        for (let i = 0; i < count; i++) {
            let domEl = document.createElement('div');
            domEl.className = 'dom-piece';
            domEl.style.backgroundColor = player.color;
            player.baseEl.appendChild(domEl);

            let piece = { 
                id: i, sq: 0, targetSq: 0, 
                px: 0, py: 0, 
                animating: false, ridingEntity: false, playerIdx: pIdx, domEl: domEl 
            };
            player.pieces.push(piece);

            domEl.addEventListener('click', () => {
                if (gameState === 'AWAITING_SELECTION' && validPieces.includes(piece)) {
                    if (gameMode.startsWith('online') && currentPlayerIdx !== myPlayerIdx) return;
                    startMove(piece, false);
                }
            });
        }
    }
}

function getCell(id) {
    return cells[id - 1];
}

function getOccupiedCells() {
    let occ = new Set();
    for (let s of snakes) {
        if (s.segments) s.segments.forEach(seg => occ.add(seg));
    }
    for (let l of ladders) { occ.add(l.start); occ.add(l.end); }
    return occ;
}

function isOccupied(sq) {
    return getOccupiedCells().has(sq);
}

function createSnake() {
    let head, segments;
    let attempts = 0;
    while (attempts < 50) {
        attempts++;
        head = Math.floor(Math.random() * 70) + 20; 
        if (isOccupied(head)) continue;
        
        segments = [head];
        let curr = head;
        let valid = true;
        
        for (let i = 0; i < 3; i++) {
            let adjs = getAdjacentIds(curr).filter(id => !isOccupied(id) && !segments.includes(id) && id < curr); 
            if (adjs.length === 0) adjs = getAdjacentIds(curr).filter(id => !isOccupied(id) && !segments.includes(id));
            if (adjs.length === 0) { valid = false; break; }
            let next = adjs[Math.floor(Math.random() * adjs.length)];
            segments.push(next);
            curr = next;
        }
        
        if (valid && segments.length >= 4) {
            let visSegments = segments.map(sq => {
                let c = getCell(sq);
                return { cx: c.cx, cy: c.cy };
            });
            return { type: 'snake', segments, visSegments, growNext: false };
        }
    }
    let h = Math.floor(Math.random()*40)+40;
    return { type: 'snake', segments: [h, h-1, h-2, h-3], visSegments: [getCell(h), getCell(h-1), getCell(h-2), getCell(h-3)].map(c => ({cx:c.cx, cy:c.cy})), growNext: false };
}

function createLadder() {
    let start, end;
    let attempts = 0;
    do {
        start = Math.floor(Math.random() * 80) + 10;
        end = Math.floor(Math.random() * (95 - start)) + start + 5;
        attempts++;
        if (attempts > 50) break;
    } while (Math.abs(start - end) < 10 || isOccupied(start) || isOccupied(end));
    
    let startCell = getCell(start);
    let endCell = getCell(end);
    
    return {
        type: 'ladder',
        start: start, end: end,
        visStartX: startCell.cx, visStartY: startCell.cy,
        visEndX: endCell.cx, visEndY: endCell.cy
    };
}

function initEntities() {
    snakes = [];
    ladders = [];
    for (let i = 0; i < 5; i++) snakes.push(createSnake());
    for (let i = 0; i < 5; i++) ladders.push(createLadder());
}

function applySnakeShift(data) {
    let entity = snakes[data.idx];
    entity.segments.unshift(data.next);
    if (data.growNext) {
        entity.growNext = false;
        let tailVis = entity.visSegments[entity.visSegments.length - 1];
        entity.visSegments.push({ cx: tailVis.cx, cy: tailVis.cy });
    } else {
        entity.segments.pop();
    }
}

function applyLadderShift(data) {
    let entity = ladders[data.idx];
    if (data.shiftStart) entity.start = data.newSq;
    else entity.end = data.newSq;
}

function shiftEntities() {
    if (gameState === 'WIN_ANIMATION') return;
    if (gameMode === 'online-join') return; // Only host shifts
    if (Math.random() > 0.09) return;
    let pool = snakes.concat(ladders);
    if (pool.length === 0) return;
    
    let entityIdx = Math.floor(Math.random() * pool.length);
    let entity = pool[entityIdx];

    if (entity.type === 'snake') {
        let head = entity.segments[0];
        let adjs = getAdjacentIds(head).filter(id => !isOccupied(id));
        if (adjs.length > 0) {
            let next = adjs[Math.floor(Math.random() * adjs.length)];
            let sIdx = snakes.indexOf(entity);
            let grow = entity.growNext;
            applySnakeShift({ idx: sIdx, next: next, growNext: grow });
            if (conn && gameMode === 'online-host') conn.send({ type: 'shift_snake', idx: sIdx, next, growNext: grow });
        }
    } else {
        let shiftStart = Math.random() > 0.5;
        let oldSq = shiftStart ? entity.start : entity.end;
        let newSq;

        if (Math.random() > 0.85) {
            newSq = Math.floor(Math.random() * 98) + 2; 
        } else {
            let cr = getColRow(oldSq);
            let dirs = [{c:1,r:0}, {c:-1,r:0}, {c:0,r:1}, {c:0,r:-1}];
            let d = dirs[Math.floor(Math.random() * dirs.length)];
            newSq = getId(cr.col + d.c, cr.row + d.r);
        }

        if (!newSq || newSq < 2 || newSq > 99) return;
        if (shiftStart && newSq >= entity.end - 5) return;
        if (!shiftStart && newSq <= entity.start + 5) return;
        
        let occ = getOccupiedCells();
        occ.delete(oldSq);
        if (occ.has(newSq)) return;

        let lIdx = ladders.indexOf(entity);
        applyLadderShift({ idx: lIdx, shiftStart, newSq });
        if (conn && gameMode === 'online-host') conn.send({ type: 'shift_ladder', idx: lIdx, shiftStart, newSq });
    }
}

function updatePhysics() {
    time += 0.05;
    
    if (gameState === 'WIN_ANIMATION') {
        if (winPhase === 1) { // Wave up
            let allExited = true;
            for (let s of snakes) {
                for (let v of s.visSegments) {
                    v.cy -= 10; // move up fast
                    if (v.cy > -50) allExited = false;
                }
            }
            if (allExited) setupWinLetters();
        } else if (winPhase === 2) { // Form letters
            for (let i = 0; i < snakes.length; i++) {
                let s = snakes[i];
                let targets = targetSnakeFormations[i];
                for (let j = 0; j < s.visSegments.length && j < targets.length; j++) {
                    s.visSegments[j].cx += (targets[j].x - s.visSegments[j].cx) * 0.05;
                    s.visSegments[j].cy += (targets[j].y - s.visSegments[j].cy) * 0.05;
                }
            }
        }
        return; 
    }

    shiftEntities();

    // Auto-sweep any pieces sitting on a snake or ladder
    for (let player of players) {
        for (let p of player.pieces) {
            if (p.sq > 0 && p.sq < 100 && !p.animating && !p.ridingEntity) {
                let ladder = ladders.find(l => l.start === p.sq);
                if (ladder) {
                    p.targetSq = ladder.end;
                    p.ridingEntity = true;
                    p.animating = true;
                } else {
                    let snake = snakes.find(s => s.segments && s.segments[0] === p.sq);
                    if (snake) {
                        p.targetSq = snake.segments[snake.segments.length - 1];
                        p.ridingEntity = true;
                        p.animating = true;
                        snake.growNext = true; 
                    }
                }
            }
        }
    }

    for (let s of snakes) {
        if (s.segments) {
            for (let j = 0; j < s.segments.length; j++) {
                let sc = getCell(s.segments[j]);
                s.visSegments[j].cx += (sc.cx - s.visSegments[j].cx) * 0.06;
                s.visSegments[j].cy += (sc.cy - s.visSegments[j].cy) * 0.06;
            }
        }
    }
    
    for (let l of ladders) {
        let sc = getCell(l.start);
        let ec = getCell(l.end);
        l.visStartX += (sc.cx - l.visStartX) * 0.06;
        l.visStartY += (sc.cy - l.visStartY) * 0.06;
        l.visEndX += (ec.cx - l.visEndX) * 0.06;
        l.visEndY += (ec.cy - l.visEndY) * 0.06;
    }

    for (let player of players) {
        for (let p of player.pieces) {
            if (p.sq === 0) {
                p.domEl.style.display = 'block';
                if (gameState === 'AWAITING_SELECTION' && validPieces.includes(p)) p.domEl.classList.add('selectable');
                else p.domEl.classList.remove('selectable');
            } else {
                p.domEl.style.display = 'none';
                p.domEl.classList.remove('selectable');
                
                let targetCell = getCell(p.sq);
                if (p.px === 0 && p.py === 0) {
                    p.px = targetCell.cx; p.py = targetCell.cy;
                }

                if (p.animating) {
                    if (p.ridingEntity) {
                        let finalCell = getCell(p.targetSq);
                        let dx = finalCell.cx - p.px;
                        let dy = finalCell.cy - p.py;
                        p.px += dx * 0.05; 
                        p.py += dy * 0.05;
                        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                            p.px = finalCell.cx; p.py = finalCell.cy;
                            p.sq = p.targetSq;
                            p.animating = false;
                            p.ridingEntity = false;
                        }
                    } else {
                        let dx = targetCell.cx - p.px;
                        let dy = targetCell.cy - p.py;
                        p.px += dx * 0.1; 
                        p.py += dy * 0.1;
                        if (Math.abs(dx) < 2 && Math.abs(dy) < 2) {
                            p.px = targetCell.cx; p.py = targetCell.cy;
                            p.animating = false;
                        }
                    }
                } else {
                    p.px = targetCell.cx; p.py = targetCell.cy;
                }
            }
        }
    }
}

function setupWinLetters() {
    winPhase = 2;
    // Generate extra snakes if needed
    while (snakes.length < 15) snakes.push({ type: 'snake', segments: [], visSegments: [{},{},{},{}], winSnake: true });
    
    let msg = winPlayerIdx === 0 ? "YOU WIN" : "BOT WINS";
    if (gameMode === 'local' || gameMode.startsWith('online')) {
        msg = winPlayerIdx === 0 ? "P1 WINS" : "P2 WINS";
    }

    targetSnakeFormations = [];
    let startX = 50;
    let startY = canvas.height / 2 - 30;
    let snakeIdx = 0;

    for (let char of msg) {
        if (char === ' ') { startX += 40; continue; }
        let shapes = LETTER_SHAPES[char] || LETTER_SHAPES['I'];
        for (let shape of shapes) {
            if (snakeIdx >= snakes.length) break;
            
            let pts = [];
            for (let i = 0; i < shape.length; i += 2) {
                pts.push({ x: startX + shape[i] * 1.5, y: startY + shape[i+1] * 1.5 });
            }
            
            // Pad points if snake is longer than 4 (rare but just in case)
            while (pts.length < 10) pts.push(pts[pts.length - 1]);

            targetSnakeFormations.push(pts);
            
            // Teleport snake to bottom
            let s = snakes[snakeIdx];
            s.visSegments = pts.map(p => ({ cx: p.x, cy: p.y + 400 + Math.random() * 200 }));
            snakeIdx++;
        }
        startX += 50;
    }

    // Hide remaining snakes
    for (; snakeIdx < snakes.length; snakeIdx++) {
        targetSnakeFormations.push([{x:-100, y:-100}, {x:-100, y:-100}, {x:-100, y:-100}, {x:-100, y:-100}]);
    }
}

function drawBoard() {
    if (gameState === 'WIN_ANIMATION') {
        boardAlpha -= 0.02;
        if (boardAlpha < 0) boardAlpha = 0;
    }
    
    // Draw Sky
    ctx.fillStyle = '#bae6fd';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Sun
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.arc(canvas.width - 80, 80, 60, 0, Math.PI * 2);
    ctx.fill();

    // Draw Clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    let c1x = (time * 15) % (canvas.width + 200) - 100;
    ctx.beginPath();
    ctx.arc(c1x, 120, 30, 0, Math.PI*2);
    ctx.arc(c1x + 40, 110, 40, 0, Math.PI*2);
    ctx.arc(c1x + 80, 120, 30, 0, Math.PI*2);
    ctx.fill();

    let c2x = (time * 8 + 300) % (canvas.width + 200) - 100;
    ctx.beginPath();
    ctx.arc(c2x, 250, 40, 0, Math.PI*2);
    ctx.arc(c2x + 50, 230, 50, 0, Math.PI*2);
    ctx.arc(c2x + 100, 250, 40, 0, Math.PI*2);
    ctx.fill();

    // Draw Trees
    function drawTree(tx, ty) {
        ctx.fillStyle = '#78350f'; 
        ctx.fillRect(tx - 10, ty - 40, 20, 40);
        ctx.fillStyle = '#16a34a'; 
        ctx.beginPath();
        ctx.moveTo(tx - 40, ty - 30); ctx.lineTo(tx, ty - 100); ctx.lineTo(tx + 40, ty - 30); ctx.fill();
        ctx.beginPath();
        ctx.moveTo(tx - 30, ty - 70); ctx.lineTo(tx, ty - 130); ctx.lineTo(tx + 30, ty - 70); ctx.fill();
    }
    
    drawTree(100, canvas.height);
    drawTree(300, canvas.height);
    drawTree(500, canvas.height);

    if (boardAlpha > 0) {
        ctx.globalAlpha = boardAlpha;
        for (let i = 0; i < TOTAL_CELLS; i++) {
            let c = cells[i];
            let row = Math.floor(i / BOARD_SIZE);
            let col = i % BOARD_SIZE;
            ctx.fillStyle = (row + col) % 2 === 0 ? COLORS.cell1 : COLORS.cell2;
            ctx.fillRect(c.cx - CELL_SIZE / 2, c.cy - CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);
        }
        ctx.globalAlpha = 1.0;
    }
}

function drawNumbers() {
    if (boardAlpha > 0) {
        ctx.globalAlpha = boardAlpha;
        ctx.fillStyle = COLORS.text;
        ctx.font = 'bold 16px Nunito';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        for (let i = 0; i < TOTAL_CELLS; i++) {
            let c = cells[i];
            ctx.fillText(c.id, c.cx - CELL_SIZE / 2 + 8, c.cy - CELL_SIZE / 2 + 8);
        }
        ctx.globalAlpha = 1.0;
    }
}

function drawEntities() {
    ctx.lineWidth = 12; ctx.lineCap = 'round';
    if (boardAlpha > 0) {
        ctx.globalAlpha = boardAlpha;
        for (let l of ladders) {
            let dx = l.visEndX - l.visStartX;
            let dy = l.visEndY - l.visStartY;
            let dist = Math.sqrt(dx * dx + dy * dy);
            let nx = -dy / dist * 12; let ny = dx / dist * 12;

            ctx.strokeStyle = COLORS.ladderRung; 
            ctx.lineWidth = 10;
            let steps = Math.floor(dist / 30);
            ctx.beginPath();
            for (let i = 1; i < steps; i++) {
                let t = i / steps;
                let cx = l.visStartX + dx * t; let cy = l.visStartY + dy * t;
                ctx.moveTo(cx + nx, cy + ny); ctx.lineTo(cx - nx, cy - ny);
            }
            ctx.stroke();

            ctx.strokeStyle = COLORS.ladder; 
            ctx.lineWidth = 14;
            ctx.beginPath();
            ctx.moveTo(l.visStartX + nx, l.visStartY + ny);
            ctx.lineTo(l.visEndX + nx, l.visEndY + ny);
            ctx.moveTo(l.visStartX - nx, l.visStartY - ny);
            ctx.lineTo(l.visEndX - nx, l.visEndY - ny);
            ctx.stroke();
        }
        ctx.globalAlpha = 1.0;
    }

    for (let s of snakes) {
        if (s.visSegments && s.visSegments.length > 0) {
            if (boardAlpha <= 0 && winPhase === 1) continue; // Hide snakes if wave is done

            ctx.globalAlpha = (gameState === 'WIN_ANIMATION') ? 1.0 : boardAlpha;
            ctx.strokeStyle = COLORS.snake; 
            ctx.lineWidth = 26; 
            ctx.lineJoin = 'round';
            ctx.lineCap = 'round';
            ctx.beginPath();
            
            let pts = s.visSegments;
            ctx.moveTo(pts[0].cx, pts[0].cy);
            if (pts.length > 2) {
                for (let j = 1; j < pts.length - 1; j++) {
                    let xc = (pts[j].cx + pts[j+1].cx) / 2;
                    let yc = (pts[j].cy + pts[j+1].cy) / 2;
                    ctx.quadraticCurveTo(pts[j].cx, pts[j].cy, xc, yc);
                }
                ctx.lineTo(pts[pts.length-1].cx, pts[pts.length-1].cy);
            } else if (pts.length === 2) {
                ctx.lineTo(pts[1].cx, pts[1].cy);
            }
            ctx.stroke();

            ctx.fillStyle = COLORS.snakeHead;
            ctx.beginPath();
            ctx.arc(pts[0].cx, pts[0].cy, 20, 0, Math.PI * 2);
            ctx.fill();
            
            let dx = 0, dy = -1;
            if (pts.length > 1) {
                dx = pts[0].cx - pts[1].cx;
                dy = pts[0].cy - pts[1].cy;
                let len = Math.sqrt(dx*dx + dy*dy);
                if (len > 0) { dx /= len; dy /= len; }
            }
            let nx = -dy * 8, ny = dx * 8; 
            
            ctx.fillStyle = '#fff'; ctx.beginPath();
            ctx.arc(pts[0].cx + nx + dx*4, pts[0].cy + ny + dy*4, 5, 0, Math.PI * 2);
            ctx.arc(pts[0].cx - nx + dx*4, pts[0].cy - ny + dy*4, 5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#000'; ctx.beginPath();
            ctx.arc(pts[0].cx + nx + dx*6, pts[0].cy + ny + dy*6, 2, 0, Math.PI * 2);
            ctx.arc(pts[0].cx - nx + dx*6, pts[0].cy - ny + dy*6, 2, 0, Math.PI * 2); ctx.fill();
            
            ctx.globalAlpha = 1.0;
        }
    }
}

function drawPlayers() {
    if (boardAlpha <= 0) return;
    ctx.globalAlpha = boardAlpha;

    let sqMap = {};
    for (let player of players) {
        for (let p of player.pieces) {
            if (p.sq === 0) continue;
            let currentSq = p.ridingEntity ? p.targetSq : p.sq;
            if (!sqMap[currentSq]) sqMap[currentSq] = [];
            sqMap[currentSq].push(p);
        }
    }

    for (let player of players) {
        for (let p of player.pieces) {
            if (p.sq === 0) continue;

            let currentSq = p.ridingEntity ? p.targetSq : p.sq;
            let offsetX = 0, offsetY = 0;
            if (sqMap[currentSq].length > 1 && !p.ridingEntity) {
                let idx = sqMap[currentSq].indexOf(p);
                offsetX = (idx % 2 === 0 ? -8 : 8);
                offsetY = (idx < 2 ? -8 : 8);
            }

            ctx.fillStyle = 'rgba(0,0,0,0.2)';
            ctx.beginPath(); ctx.arc(p.px + offsetX, p.py + offsetY + 3, 10, 0, Math.PI * 2); ctx.fill();

            ctx.fillStyle = player.color;
            ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.arc(p.px + offsetX, p.py + offsetY, 10, 0, Math.PI * 2);
            ctx.fill(); ctx.stroke();

            if (gameState === 'AWAITING_SELECTION' && validPieces.includes(p)) {
                ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 3;
                ctx.beginPath(); ctx.arc(p.px + offsetX, p.py + offsetY, 16, 0, Math.PI * 2); ctx.stroke();
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.5)';
                ctx.beginPath(); ctx.arc(p.px + offsetX, p.py + offsetY, 16 + Math.sin(Date.now() / 150) * 4, 0, Math.PI * 2); ctx.stroke();
            }
        }
    }
    ctx.globalAlpha = 1.0;
}

function gameLoop() {
    if (gameState === 'START_MENU') return;
    
    updatePhysics();
    drawBoard();
    drawEntities();
    drawNumbers();
    drawPlayers();

    if (gameState === 'MOVING' && movingPiece) {
        let p = movingPiece;
        if (!p.animating) {
            if (p.sq < p.targetSq) {
                p.sq++; p.animating = true;
            } else if (p.sq > p.targetSq) {
                p.sq--; p.animating = true;
            } else {
                gameState = 'EVENT';
                setTimeout(checkSquareEvents, 300);
            }
        }
    }

    requestAnimationFrame(gameLoop);
}

function checkSquareEvents() {
    if (players[currentPlayerIdx].pieces.every(pc => pc.sq === 100)) {
        statusText.textContent = `${players[currentPlayerIdx].name} Wins!`;
        statusText.style.color = players[currentPlayerIdx].color;
        promptText.textContent = "Game Over!";
        gameState = 'WIN_ANIMATION';
        winPhase = 1; // start wave
        winPlayerIdx = currentPlayerIdx;
        rollBtn.disabled = true;
        return;
    }
    endTurn();
}

function updateTurnUI() {
    let nextPlayer = players[currentPlayerIdx];
    statusText.textContent = nextPlayer.name + "'s Turn";
    statusText.style.color = nextPlayer.color;
    promptText.textContent = "";

    if (nextPlayer.type === 'bot') {
        rollBtn.disabled = true;
        rollBtn.textContent = 'Bot is rolling...';
        setTimeout(() => triggerRollVisuals(false), 1000);
    } else {
        if (gameMode.startsWith('online') && currentPlayerIdx !== myPlayerIdx) {
            rollBtn.disabled = true;
            rollBtn.textContent = 'Waiting for Opponent...';
        } else {
            rollBtn.disabled = false;
            rollBtn.textContent = 'Roll the Dice!';
        }
    }
}

function endTurn() {
    currentPlayerIdx = 1 - currentPlayerIdx;
    gameState = 'IDLE';
    movingPiece = null;

    for (let p of players) {
        for (let piece of p.pieces) piece.domEl.classList.remove('selectable');
    }
    updateTurnUI();
}

// fromBtn determines if it was initiated manually vs from a sync packet
window.executeRoll = function(fromBtn) {
    if (gameState !== 'IDLE') return;
    if (gameMode.startsWith('online') && currentPlayerIdx !== myPlayerIdx) return;
    
    triggerRollVisuals(false);
};

function triggerRollVisuals(fromRemote) {
    gameState = 'ROLLING';
    rollBtn.disabled = true;
    diceEl.classList.add('rolling');
    promptText.textContent = "Rolling...";
    
    if (!fromRemote) {
        currentRoll = Math.floor(Math.random() * 6) + 1;
        if (conn && gameMode.startsWith('online')) conn.send({ type: 'roll', value: currentRoll });
    }
    
    setTimeout(() => {
        diceEl.classList.remove('rolling');
        let transformStr = "translateZ(-40px) ";
        if (currentRoll === 1) transformStr += "rotateY(0deg)";
        else if (currentRoll === 2) transformStr += "rotateX(-90deg)";
        else if (currentRoll === 3) transformStr += "rotateY(-90deg)";
        else if (currentRoll === 4) transformStr += "rotateY(90deg)";
        else if (currentRoll === 5) transformStr += "rotateX(90deg)";
        else if (currentRoll === 6) transformStr += "rotateY(180deg)";
        diceEl.style.transform = transformStr;
        
        setTimeout(processRoll, 800);
    }, 800);
}

function processRoll() {
    let player = players[currentPlayerIdx];
    validPieces = [];

    for (let p of player.pieces) {
        if (p.sq === 0 && (currentRoll === 1 || currentRoll === 6)) validPieces.push(p);
        else if (p.sq > 0 && p.sq + currentRoll <= 100) validPieces.push(p);
    }

    if (validPieces.length === 0) {
        promptText.textContent = "No valid moves!";
        setTimeout(endTurn, 1500);
    } else if (validPieces.length === 1) {
        promptText.textContent = "Moving piece...";
        if (player.type === 'bot' || (!gameMode.startsWith('online')) || currentPlayerIdx === myPlayerIdx) {
            startMove(validPieces[0], false);
        }
    } else {
        if (player.type === 'bot') {
            promptText.textContent = "Bot is choosing...";
            setTimeout(() => {
                let best = validPieces.sort((a, b) => (b.sq === 0 ? 1000 : b.sq) - (a.sq === 0 ? 1000 : a.sq))[0];
                startMove(best, false);
            }, 1000);
        } else {
            if (gameMode.startsWith('online') && currentPlayerIdx !== myPlayerIdx) {
                promptText.textContent = "Opponent is choosing...";
            } else {
                promptText.textContent = "Click a piece to move!";
                gameState = 'AWAITING_SELECTION';
            }
        }
    }
}

function startMove(p, fromRemote) {
    if (!fromRemote && conn && gameMode.startsWith('online')) {
        conn.send({ type: 'move', pIdx: p.playerIdx, pieceId: p.id });
    }

    validPieces = [];
    for (let piece of players[currentPlayerIdx].pieces) {
        piece.domEl.classList.remove('selectable');
    }

    promptText.textContent = "";
    movingPiece = p;
    
    if (p.sq === 0) p.targetSq = 1;
    else p.targetSq = p.sq + currentRoll;
    
    gameState = 'MOVING';
    p.animating = true;
    if (p.sq < p.targetSq) p.sq++;
}

canvas.addEventListener('click', (e) => {
    if (gameState !== 'AWAITING_SELECTION') return;
    if (gameMode.startsWith('online') && currentPlayerIdx !== myPlayerIdx) return;
    
    let rect = canvas.getBoundingClientRect();
    let x = e.clientX - rect.left;
    let y = e.clientY - rect.top;

    for (let p of validPieces) {
        if (p.sq === 0) continue;
        let dx = p.px - x;
        let dy = p.py - y;
        if (Math.sqrt(dx * dx + dy * dy) < 25) {
            startMove(p, false);
            break;
        }
    }
});

rollBtn.addEventListener('click', () => {
    executeRoll(true);
});
