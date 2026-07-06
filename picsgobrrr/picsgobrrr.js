const datePicker = document.getElementById('date-picker');
const gridBtn = document.getElementById('grid-btn');
const toggleNumbersBtn = document.getElementById('toggle-numbers-btn');
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
let autoSolveInterval = null;
let numbersVisible = true;

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
    const currentGrid = parseInt(gridBtn.dataset.grid);
    const imgUrl = getImageUrlForDate(dateVal);

    const img = new Image();
    
    img.onload = () => {
        hideAllOverlays();
        puzzleBoard.innerHTML = '';
        puzzleBoard.className = 'puzzle-board show-numbers';
        if (!numbersVisible) {
            puzzleBoard.classList.remove('show-numbers');
        }
        
        grid = currentGrid;
        currentImage = imgUrl;
        setupBoard();
        
        autoSolveUsed = false;
        movesCount = 0;
        targetMoves = -1;
        updateHUD();
        
        // Yield to browser to paint before animation
        setTimeout(() => {
            playShuffleAnimation(() => {
                shuffleBoard();
                
                // Yield before solving
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
                }, 100);
            });
        }, 50);
    };
    
    img.onerror = () => {
        hideAllOverlays();
        errorOverlay.classList.remove('hidden');
    };
    
    img.src = imgUrl;
    
    // Only show loading overlay if the image isn't instantly available from cache
    if (!img.complete) {
        hideAllOverlays();
        loadingOverlay.classList.remove('hidden');
    }
}

function resetAndShuffle() {
    if (tiles.length !== grid * grid) {
        initGame();
        return;
    }
    
    if (autoSolveInterval) {
        clearInterval(autoSolveInterval);
        autoSolveInterval = null;
        autoSolveBtn.textContent = 'DO THE MATH FOR ME';
    }
    
    hideAllOverlays();
    autoSolveUsed = false;
    movesCount = 0;
    targetMoves = -1;
    updateHUD();
    
    puzzleBoard.classList.remove('seamless', 'glowing');
    const missing = document.querySelector('.missing-piece-reveal');
    if (missing) missing.remove();
    
    autoSolveBtn.classList.add('hidden');
    
    playShuffleAnimation(() => {
        const fallbackPath = shuffleBoard();
        
        // Show calculating state
        autoSolveBtn.textContent = 'CALCULATING...';
        autoSolveBtn.classList.remove('hidden');
        
        setTimeout(() => {
            let pathResult = solvePuzzle(tiles, grid);
            
            // Check if IDA* found an optimal path (must be an array)
            if (Array.isArray(pathResult) && pathResult.length > 0) {
                targetMoves = pathResult.length;
                optimalPath = pathResult;
            } else {
                // If it timed out or was too deep, use the mathematically perfect inverse shuffle path!
                targetMoves = fallbackPath.length;
                optimalPath = fallbackPath;
            }
            
            autoSolveBtn.textContent = 'DO THE MATH FOR ME';
            updateHUD();
        }, 100);
    });
}

function updateHUD() {
    document.getElementById('moves-counter').innerText = `MOVES: ${movesCount}`;
    const targetEl = document.getElementById('target-counter');
    
    if (targetMoves > -1) {
        targetEl.innerText = `TARGET: ${targetMoves}`;
    } else {
        targetEl.innerText = `TARGET: 0`;
    }
    targetEl.classList.remove('hidden');
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
            
            // Temporarily disable transition so they don't animate from top-left (0,0)
            tile.style.transition = 'none';
            
            // Add click listener
            tile.addEventListener('click', () => handleTileClick(i + 1));
            
            puzzleBoard.appendChild(tile);
        }
    }
    emptyIndex = numTiles - 1;
    renderBoard();
    
    // Force browser reflow to apply the initial positions synchronously
    void puzzleBoard.offsetHeight;
    
    // Restore CSS transitions
    const allTiles = puzzleBoard.querySelectorAll('.tile');
    allTiles.forEach(t => t.style.transition = '');
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
                tile.style.left = `0`;
                tile.style.top = `0`;
                tile.style.transform = `translate(${currentX * 100}%, ${currentY * 100}%)`;
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
        // Invalidate the optimal/fallback path if the user makes a manual move
        optimalPath = null;
        
        updateHUD();
        
        // Removed hiding auto solve to allow it from current position
        
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
    let fallbackPath = []; // Record the path to guarantee a solve!
    
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
        
        // Record the empty index BEFORE swap. Clicking this index will undo the move!
        fallbackPath.push(emptyIndex);
        
        // Swap
        tiles[emptyIndex] = tiles[randomIdx];
        tiles[randomIdx] = 0;
        lastMoved = emptyIndex;
        emptyIndex = randomIdx;
    }
    
    renderBoard();
    return fallbackPath.reverse(); // The exact sequence of clicks to reverse the entire shuffle
}

function playShuffleAnimation(callback) {
    const animationSteps = 5;
    let currentStep = 0;
    
    // Choose a random shuffle animation style
    const styles = ['scatter', 'implode', 'twirl', 'spiral', 'drop'];
    const chosenStyle = styles[Math.floor(Math.random() * styles.length)];
    
    // Add shuffling-anim class for faster transition
    for (let i = 1; i < tiles.length; i++) {
        const tile = document.getElementById(`tile-${i}`);
        if (tile) tile.classList.add('shuffling-anim');
    }
    
    const interval = setInterval(() => {
        if (currentStep >= animationSteps) {
            clearInterval(interval);
            for (let i = 1; i < tiles.length; i++) {
                const tile = document.getElementById(`tile-${i}`);
                if (tile) {
                    tile.classList.remove('shuffling-anim');
                }
            }
            // Add a tiny delay to let the remove class apply before callback
            setTimeout(callback, 50);
            return;
        }
        
        // Randomly scatter tiles based on chosen style
        for (let i = 1; i < tiles.length; i++) {
            const tile = document.getElementById(`tile-${i}`);
            if (tile) {
                const maxTrans = (grid - 1) * 100;
                let tx = 0, ty = 0, rot = 0, scale = 1;
                
                switch (chosenStyle) {
                    case 'scatter':
                        tx = (Math.random() - 0.5) * maxTrans;
                        ty = (Math.random() - 0.5) * maxTrans;
                        rot = (Math.random() - 0.5) * 60;
                        scale = 0.9;
                        break;
                    case 'implode':
                        tx = 0; ty = 0; rot = 180; scale = 0.3;
                        break;
                    case 'twirl':
                        tx = (Math.random() - 0.5) * maxTrans;
                        ty = (Math.random() - 0.5) * maxTrans;
                        rot = 720; scale = 0.5;
                        break;
                    case 'spiral':
                        const angle = i * (Math.PI * 2) / (tiles.length - 1) + currentStep;
                        tx = Math.cos(angle) * (maxTrans / 2);
                        ty = Math.sin(angle) * (maxTrans / 2);
                        rot = 360;
                        break;
                    case 'drop':
                        tx = 0;
                        ty = 100 + (Math.random() * 200);
                        rot = (Math.random() - 0.5) * 90;
                        break;
                }
                
                // Get current position in grid to base the translation off of it
                const currentIdx = tiles.indexOf(i);
                let currentX = 0, currentY = 0;
                if (currentIdx !== -1) {
                    currentX = currentIdx % grid;
                    currentY = Math.floor(currentIdx / grid);
                }
                
                // Add the tile's current actual position to the shuffle offset
                const finalTx = (currentX * 100) + tx;
                const finalTy = (currentY * 100) + ty;
                
                tile.style.transform = `translate(${finalTx}%, ${finalTy}%) rotate(${rot}deg) scale(${scale})`;
            }
        }
        
        currentStep++;
    }, 150); // Quick jumps
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
        } else if (targetMoves > -1) {
            if (movesCount <= targetMoves) {
                winMsg.innerHTML = `FLAWLESS VICTORY!<br>You matched the mathematically perfect path (${movesCount} moves)!`;
            } else {
                winMsg.innerHTML = `Solved in ${movesCount} moves.<br>(Optimal was ${targetMoves}. Can you do better?)`;
            }
        } else {
            winMsg.innerHTML = `Solved in ${movesCount} moves!`;
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
            missingTile.style.left = `0`;
            missingTile.style.top = `0`;
            missingTile.style.transform = `translate(${targetX * 100}%, ${targetY * 100}%)`;
            
            const xPercent = grid > 1 ? (targetX / (grid - 1)) * 100 : 0;
            const yPercent = grid > 1 ? (targetY / (grid - 1)) * 100 : 0;
            missingTile.style.backgroundPosition = `${xPercent}% ${yPercent}%`;
            
            puzzleBoard.appendChild(missingTile);
            
            // 3. Make seamless and wait
            setTimeout(() => {
                puzzleBoard.classList.add('seamless');
                
                // Wait 1.2 seconds showing full image
                setTimeout(() => {
                    // Randomly choose victory animation
                    const victoryType = Math.random() > 0.5 ? 'flip' : 'shatter';
                    
                    if (victoryType === 'flip') {
                        puzzleBoard.classList.add('victory-flip');
                        setTimeout(() => {
                            puzzleBoard.classList.remove('victory-flip');
                            winOverlay.classList.remove('hidden');
                            winOverlay.classList.add('win-crazy-pop');
                        }, 1800); // Wait for flip animation
                    } else {
                        spawnShatterParticles();
                        setTimeout(() => {
                            winOverlay.classList.remove('hidden');
                            winOverlay.classList.add('win-crazy-pop');
                        }, 1500); // Wait for shatter drop
                    }
                    
                }, 1200); // 1.2s full image pause
                
            }, 1000); // Wait for piece to fade in
            
        }, 200);
    }
}

function spawnShatterParticles() {
    const rect = puzzleBoard.getBoundingClientRect();
    const rows = grid;
    const cols = grid;
    const width = rect.width / cols;
    const height = rect.height / rows;
    
    // Create a flash effect on the board
    puzzleBoard.style.filter = 'brightness(2)';
    setTimeout(() => puzzleBoard.style.filter = '', 200);
    
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const p = document.createElement('div');
            p.className = 'shatter-piece';
            p.style.backgroundImage = `url(${currentImage})`;
            
            p.style.width = width + 'px';
            p.style.height = height + 'px';
            p.style.left = (rect.left + c * width) + 'px';
            p.style.top = (rect.top + r * height) + 'px';
            
            p.style.backgroundSize = `${rect.width}px ${rect.height}px`;
            p.style.backgroundPosition = `-${c * width}px -${r * height}px`;
            
            const angle = (Math.random() - 0.5) * Math.PI;
            const velocityX = Math.cos(angle) * (Math.random() * 400 - 200);
            
            p.style.setProperty('--tx', velocityX + 'px');
            p.style.setProperty('--rot', (Math.random() - 0.5) * 720 + 'deg');
            p.style.animationDelay = (Math.random() * 0.3) + 's';
            
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 2000);
        }
    }
}

function hideAllOverlays() {
    loadingOverlay.classList.add('hidden');
    errorOverlay.classList.add('hidden');
    winOverlay.classList.add('hidden');
    winOverlay.classList.remove('win-crazy-pop');
}

// Event Listeners
shuffleBtn.addEventListener('click', resetAndShuffle);
playAgainBtn.addEventListener('click', resetAndShuffle);

autoSolveBtn.addEventListener('click', () => {
    if (autoSolveUsed) return;
    
    autoSolveUsed = true;
    
    // Show 'SOLVING...' text and hide shuffle
    autoSolveBtn.textContent = 'SOLVING...';
    shuffleBtn.classList.add('hidden');
    
    // Yield to the browser so the button text updates before freezing during calculation
    setTimeout(() => {
        // Calculate the path from the *current* state of the tiles
        let pathResult = solvePuzzle(tiles, grid);
        
        // If IDA* timed out (returns "TIMEOUT") or failed, use the fallback if available
        if (!Array.isArray(pathResult) || pathResult.length === 0) {
            if (optimalPath && optimalPath.length > 0) {
                pathResult = optimalPath;
            } else {
                // If they made manual moves and we can't solve it, we must give up
                autoSolveBtn.classList.add('hidden');
                shuffleBtn.classList.remove('hidden');
                autoSolveBtn.textContent = 'DO THE MATH FOR ME';
                autoSolveUsed = false;
                return;
            }
        }
        
        autoSolveBtn.classList.add('hidden');
            
            let step = 0;
            if (autoSolveInterval) clearInterval(autoSolveInterval);
            
            autoSolveInterval = setInterval(() => {
                if (step >= pathResult.length) {
                    clearInterval(autoSolveInterval);
                    autoSolveInterval = null;
                    shuffleBtn.classList.remove('hidden');
                    autoSolveBtn.textContent = 'DO THE MATH FOR ME';
                    return;
                }
                
                const targetIdx = pathResult[step];
                const tileNumber = tiles[targetIdx];
                
                if (tileNumber) {
                    handleTileClick(tileNumber);
                }
                
                step++;
            }, 250); // 250ms per move
    }, 50);
});

gridBtn.addEventListener('click', () => {
    let curr = parseInt(gridBtn.dataset.grid);
    curr++;
    if (curr > 5) curr = 3;
    gridBtn.dataset.grid = curr;
    gridBtn.textContent = `GRID: ${curr}x${curr}`;
    initGame();
});

toggleNumbersBtn.addEventListener('click', () => {
    numbersVisible = !numbersVisible;
    if (numbersVisible) {
        puzzleBoard.classList.add('show-numbers');
        toggleNumbersBtn.textContent = 'NUMBERS: ON';
    } else {
        puzzleBoard.classList.remove('show-numbers');
        toggleNumbersBtn.textContent = 'NUMBERS: OFF';
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
