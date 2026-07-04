const datePicker = document.getElementById('date-picker');
const gridBtn = document.getElementById('grid-btn');
const toggleNumbers = document.getElementById('toggle-numbers');
const shuffleBtn = document.getElementById('shuffle-btn');
const autoSolveBtn = document.getElementById('auto-solve-btn');
const playAgainBtn = document.getElementById('play-again-btn');

const puzzleBoard = document.getElementById('puzzle-board');
const loadingOverlay = document.getElementById('loading-overlay');
const errorOverlay = document.getElementById('error-overlay');
const winOverlay = document.getElementById('win-overlay');

let currentImage = null;
let grid = 4;
let tiles = []; // 1D array representing the board. 0 is empty.
let emptyIndex = -1; // Index in the 1D array
let movesCount = 0;
let targetMoves = -1;
let autoSolveUsed = false;

// Use URL param for date, otherwise today
const urlParams = new URLSearchParams(window.location.search);
const dateParam = urlParams.get('date');

let dateVal = '';
if (dateParam) {
    dateVal = dateParam;
} else {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateVal = `${yyyy}-${mm}-${dd}`;
}

function getImageUrlForDate(dateString) {
    // Input format: YYYY-MM-DD
    const parts = dateString.split('-');
    if (parts.length !== 3) return null;
    // Output format: DD_MM_YYYY.png
    return `../assets/daily_pics/${parts[2]}_${parts[1]}_${parts[0]}.png`;
}

function initGame() {
    hideAllOverlays();
    loadingOverlay.classList.remove('hidden');
    puzzleBoard.innerHTML = '';
    puzzleBoard.className = 'puzzle-board show-numbers';
    if (!toggleNumbers.checked) {
        puzzleBoard.classList.remove('show-numbers');
    }
    
    grid = parseInt(gridBtn.dataset.grid);
    const imgUrl = getImageUrlForDate(dateVal);

    // Preload image to check if it exists and to get dimensions (even though we assume 1:1)
    const img = new Image();
    img.onload = () => {
        currentImage = imgUrl;
        loadingOverlay.classList.add('hidden');
        setupBoard();
        
        autoSolveUsed = false;
        movesCount = 0;
        targetMoves = -1;
        updateHUD();
        
        shuffleBoard();
        
        // Yield to browser to paint the shuffled board before running the heavy IDA* math engine
        setTimeout(() => {
            let pathResult = solvePuzzle(tiles, grid);
            
            if (pathResult && pathResult.length > 0) {
                targetMoves = pathResult.length;
                optimalPath = pathResult;
                autoSolveBtn.classList.remove('hidden');
            } else {
                targetMoves = -1;
                optimalPath = null;
                autoSolveBtn.classList.add('hidden');
            }
            updateHUD();
        }, 50);
    };
    img.onerror = () => {
        loadingOverlay.classList.add('hidden');
        errorOverlay.classList.remove('hidden');
    };
    img.src = imgUrl;
}

function updateHUD() {
    document.getElementById('moves-counter').innerText = `MOVES: ${movesCount}`;
    const targetEl = document.getElementById('target-counter');
    
    if (targetMoves > -1) {
        targetEl.innerText = `TARGET: ${targetMoves}`;
        targetEl.classList.remove('hidden');
    } else {
        targetEl.classList.add('hidden');
    }
}

function setupBoard() {
    puzzleBoard.innerHTML = '';
    tiles = [];
    
    // We will dynamically get the board width to calculate tile size
    // Using CSS variables to handle responsive resizing
    const numTiles = grid * grid;
    
    for (let i = 0; i < numTiles; i++) {
        if (i === numTiles - 1) {
            // The last tile is the empty space
            tiles.push(0);
        } else {
            tiles.push(i + 1); // Tile numbers 1 to (N*N - 1)
            
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.id = `tile-${i + 1}`;
            tile.setAttribute('data-number', i + 1);
            tile.draggable = false; // Prevent ghost dragging of the background image
            
            // Set background image
            tile.style.backgroundImage = `url(${currentImage})`;
            
            // Calculate % background position based on solved position
            const targetX = i % grid;
            const targetY = Math.floor(i / grid);
            
            // e.g. for 3x3, grid = 3. Steps are 0%, 50%, 100%. Denominator is grid - 1.
            const xPercent = grid > 1 ? (targetX / (grid - 1)) * 100 : 0;
            const yPercent = grid > 1 ? (targetY / (grid - 1)) * 100 : 0;
            
            tile.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
            
            // Add click listener
            tile.addEventListener('click', () => handleTileClick(i + 1));
            
            puzzleBoard.appendChild(tile);
        }
    }
    emptyIndex = numTiles - 1;
    renderBoard();
}

function renderBoard() {
    // Update CSS Variable for board size so JS and CSS sync
    puzzleBoard.style.setProperty('--board-size', `${puzzleBoard.clientWidth}px`);
    
    const tileSize = 100 / grid; // percentage width/height
    
    for (let i = 0; i < tiles.length; i++) {
        const val = tiles[i];
        if (val !== 0) {
            const tile = document.getElementById(`tile-${val}`);
            if (tile) {
                const currentX = i % grid;
                const currentY = Math.floor(i / grid);
                
                tile.style.width = `${tileSize}%`;
                tile.style.height = `${tileSize}%`;
                tile.style.left = `${currentX * tileSize}%`;
                tile.style.top = `${currentY * tileSize}%`;
            }
        }
    }
}

// Window resize handling to keep background scale correct
window.addEventListener('resize', () => {
    if (tiles.length > 0) renderBoard();
});

function handleTileClick(tileNumber) {
    const tileIndex = tiles.indexOf(tileNumber);
    if (canMove(tileIndex)) {
        // Swap
        tiles[emptyIndex] = tileNumber;
        tiles[tileIndex] = 0;
        emptyIndex = tileIndex;
        
        movesCount++;
        updateHUD();
        
        // Hide auto solve if user makes a move manually
        autoSolveBtn.classList.add('hidden');
        
        renderBoard();
        checkWin();
    }
}

function canMove(index) {
    // Check if index is adjacent to emptyIndex (up, down, left, right)
    const emptyX = emptyIndex % grid;
    const emptyY = Math.floor(emptyIndex / grid);
    const tileX = index % grid;
    const tileY = Math.floor(index / grid);
    
    const isHorizontal = Math.abs(emptyX - tileX) === 1 && emptyY === tileY;
    const isVertical = Math.abs(emptyY - tileY) === 1 && emptyX === tileX;
    
    return isHorizontal || isVertical;
}

function shuffleBoard() {
    // Deep shuffle! For 4x4, 60 moves guarantees a mathematically perfect optimal path around 40-50 moves.
    let moves = 100;
    if (grid === 4) moves = 60;
    if (grid === 5) moves = 40;
    
    let lastMoved = -1;
    
    for (let i = 0; i < moves; i++) {
        const emptyX = emptyIndex % grid;
        const emptyY = Math.floor(emptyIndex / grid);
        
        let validNeighbors = [];
        if (emptyX > 0) validNeighbors.push(emptyIndex - 1); // left
        if (emptyX < grid - 1) validNeighbors.push(emptyIndex + 1); // right
        if (emptyY > 0) validNeighbors.push(emptyIndex - grid); // up
        if (emptyY < grid - 1) validNeighbors.push(emptyIndex + grid); // down
        
        // Prevent moving the same tile back and forth immediately
        validNeighbors = validNeighbors.filter(idx => idx !== lastMoved);
        
        const randomIdx = validNeighbors[Math.floor(Math.random() * validNeighbors.length)];
        
        // Swap
        tiles[emptyIndex] = tiles[randomIdx];
        tiles[randomIdx] = 0;
        lastMoved = emptyIndex;
        emptyIndex = randomIdx;
    }
    
    renderBoard();
}

function checkWin() {
    let won = true;
    for (let i = 0; i < tiles.length - 1; i++) {
        if (tiles[i] !== i + 1) {
            won = false;
            break;
        }
    }
    if (won && tiles[tiles.length - 1] === 0) {
        // Customize Win Message based on mode!
        const winMsg = document.getElementById('win-message');
        if (autoSolveUsed) {
            winMsg.innerHTML = `AUTO-SOLVED!<br>(No credit for you!)`;
            winMsg.style.color = 'var(--goofy-pink)';
        } else if (targetMoves > -1) {
            if (movesCount <= targetMoves) {
                winMsg.innerHTML = `FLAWLESS VICTORY!<br>You matched the mathematically perfect path (${movesCount} moves)!`;
                winMsg.style.color = 'var(--goofy-cyan)';
            } else {
                winMsg.innerHTML = `Solved in ${movesCount} moves.<br>(Optimal was ${targetMoves}. Can you do better?)`;
                winMsg.style.color = 'var(--ink-black)';
            }
        } else {
            winMsg.innerHTML = `Solved in ${movesCount} moves!`;
            winMsg.style.color = 'var(--ink-black)';
        }

        // WIN SEQUENCE
        setTimeout(() => {
            // 1. Glow border on sliding pieces
            puzzleBoard.classList.add('glowing');
            
            // 2. Attach missing piece
            const missingTile = document.createElement('div');
            missingTile.className = 'tile missing-piece-reveal';
            missingTile.style.backgroundImage = `url(${currentImage})`;
            
            const tileSize = 100 / grid;
            const targetX = emptyIndex % grid;
            const targetY = Math.floor(emptyIndex / grid);
            
            missingTile.style.width = `${tileSize}%`;
            missingTile.style.height = `${tileSize}%`;
            missingTile.style.left = `${targetX * tileSize}%`;
            missingTile.style.top = `${targetY * tileSize}%`;
            
            const xPercent = grid > 1 ? (targetX / (grid - 1)) * 100 : 0;
            const yPercent = grid > 1 ? (targetY / (grid - 1)) * 100 : 0;
            missingTile.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
            
            puzzleBoard.appendChild(missingTile);
            
            // 3. Make seamless and spawn butterflies
            setTimeout(() => {
                puzzleBoard.classList.add('seamless');
                spawnButterflies();
                winOverlay.classList.remove('hidden');
            }, 1000);
            
        }, 200);
    }
}

function spawnButterflies() {
    const rect = puzzleBoard.getBoundingClientRect();
    
    for (let i = 0; i < 30; i++) {
        const b = document.createElement('div');
        b.className = 'butterfly';
        b.style.backgroundImage = `url(${currentImage})`;
        
        // Random starting position near center of board
        const startX = rect.left + rect.width / 2 + (Math.random() - 0.5) * 100;
        const startY = rect.top + rect.height / 2 + (Math.random() - 0.5) * 100;
        b.style.left = startX + 'px';
        b.style.top = startY + 'px';
        
        // Random background section for butterfly
        b.style.backgroundPosition = `${Math.random() * 100}% ${Math.random() * 100}%`;
        
        // Random trajectory
        const tx = (Math.random() - 0.5) * 1000 + 'px';
        const ty = (Math.random() - 0.5) * 1000 - 500 + 'px'; // tend to fly up
        const rot = (Math.random() - 0.5) * 720 + 'deg';
        
        b.style.setProperty('--tx', tx);
        b.style.setProperty('--ty', ty);
        b.style.setProperty('--rot', rot);
        
        document.body.appendChild(b);
        
        setTimeout(() => b.remove(), 2500);
    }
}

function hideAllOverlays() {
    loadingOverlay.classList.add('hidden');
    errorOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
}

// Event Listeners
shuffleBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

autoSolveBtn.addEventListener('click', () => {
    if (!optimalPath || optimalPath.length === 0) return;
    
    autoSolveUsed = true;
    
    // Hide buttons during animation
    autoSolveBtn.classList.add('hidden');
    shuffleBtn.classList.add('hidden');
    
    let step = 0;
    const interval = setInterval(() => {
        if (step >= optimalPath.length) {
            clearInterval(interval);
            shuffleBtn.classList.remove('hidden');
            return;
        }
        
        // optimalPath[step] contains the index where the empty space needs to move.
        // We find the tile currently at that index and 'click' it.
        const targetIdx = optimalPath[step];
        const tileNumber = tiles[targetIdx];
        
        if (tileNumber) {
            handleTileClick(tileNumber);
            // Re-show auto solve if handleTileClick hid it, since we're in auto mode
            // Actually, handleTileClick hides it, which is fine, we don't need it visible while solving.
        }
        
        step++;
    }, 250); // 250ms per move
});

gridBtn.addEventListener('click', () => {
    let curr = parseInt(gridBtn.dataset.grid);
    curr++;
    if (curr > 5) curr = 3;
    gridBtn.dataset.grid = curr;
    gridBtn.textContent = `GRID: ${curr}x${curr}`;
    initGame();
});

toggleNumbers.addEventListener('change', (e) => {
    if (e.target.checked) {
        puzzleBoard.classList.add('show-numbers');
    } else {
        puzzleBoard.classList.remove('show-numbers');
    }
});

// Start game initially
initGame();

// --- IDA* SOLVER ENGINE ---

const DIRS = [
    {dx: 0, dy: -1}, // 0: Up
    {dx: 1, dy: 0},  // 1: Right
    {dx: 0, dy: 1},  // 2: Down
    {dx: -1, dy: 0}  // 3: Left
];

function getLinearConflict(state, size) {
    let conflict = 0;
    // Row conflicts
    for (let r = 0; r < size; r++) {
        for (let c1 = 0; c1 < size; c1++) {
            let t1 = state[r * size + c1];
            if (t1 !== 0 && Math.floor((t1 - 1) / size) === r) {
                for (let c2 = c1 + 1; c2 < size; c2++) {
                    let t2 = state[r * size + c2];
                    if (t2 !== 0 && Math.floor((t2 - 1) / size) === r) {
                        if (t1 > t2) conflict += 2;
                    }
                }
            }
        }
    }
    // Col conflicts
    for (let c = 0; c < size; c++) {
        for (let r1 = 0; r1 < size; r1++) {
            let t1 = state[r1 * size + c];
            if (t1 !== 0 && (t1 - 1) % size === c) {
                for (let r2 = r1 + 1; r2 < size; r2++) {
                    let t2 = state[r2 * size + c];
                    if (t2 !== 0 && (t2 - 1) % size === c) {
                        if (t1 > t2) conflict += 2;
                    }
                }
            }
        }
    }
    return conflict;
}

function getManhattan(state, size) {
    let dist = 0;
    for (let i = 0; i < state.length; i++) {
        if (state[i] !== 0) {
            let targetX = (state[i] - 1) % size;
            let targetY = Math.floor((state[i] - 1) / size);
            let currentX = i % size;
            let currentY = Math.floor(i / size);
            dist += Math.abs(targetX - currentX) + Math.abs(targetY - currentY);
        }
    }
    return dist;
}

let optimalPath = null;
let idaIterations = 0;

function solvePuzzle(startState, size) {
    let state = [...startState];
    let bound = getManhattan(state, size) + getLinearConflict(state, size);
    let emptyIdx = state.indexOf(0);
    optimalPath = null;
    idaIterations = 0;
    
    // Increased max iterations because Linear Conflict pruning is incredibly strong
    let maxIterations = 5000000;
    
    // Iterative Deepening A*
    while (true) {
        let t = search(state, 0, bound, size, emptyIdx, -1, [], maxIterations);
        if (t === "FOUND") return optimalPath; 
        if (t === "TIMEOUT") return "TIMEOUT";
        if (t > 50 || t === -1) return null; // Fallback to prevent freezing if too deep
        bound = t;
    }
}

function search(state, g, bound, size, emptyIdx, lastDir, path, maxIterations) {
    idaIterations++;
    if (idaIterations > maxIterations) return "TIMEOUT";
    
    let h = getManhattan(state, size) + getLinearConflict(state, size);
    let f = g + h;
    if (f > bound) return f;
    
    // Check if fully solved (Manhattan is 0)
    if (h === 0 || getManhattan(state, size) === 0) {
        optimalPath = [...path];
        return "FOUND";
    }
    
    let min = Infinity;
    let emptyX = emptyIdx % size;
    let emptyY = Math.floor(emptyIdx / size);
    
    for (let d = 0; d < 4; d++) {
        // Prevent reverse move
        if (lastDir !== -1 && Math.abs(lastDir - d) === 2) continue;
        
        let nx = emptyX + DIRS[d].dx;
        let ny = emptyY + DIRS[d].dy;
        
        if (nx >= 0 && nx < size && ny >= 0 && ny < size) {
            let nIdx = ny * size + nx;
            
            // Swap
            let temp = state[emptyIdx];
            state[emptyIdx] = state[nIdx];
            state[nIdx] = temp;
            
            path.push(nIdx);
            let t = search(state, g + 1, bound, size, nIdx, d, path, maxIterations);
            if (t === "FOUND") return "FOUND";
            if (t === "TIMEOUT") return "TIMEOUT";
            path.pop();
            
            if (t < min) min = t;
            
            // Backtrack
            temp = state[emptyIdx];
            state[emptyIdx] = state[nIdx];
            state[nIdx] = temp;
        }
    }
    return min;
}
