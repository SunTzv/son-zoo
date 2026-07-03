const datePicker = document.getElementById('date-picker');
const gridBtn = document.getElementById('grid-btn');
const toggleNumbers = document.getElementById('toggle-numbers');
const shuffleBtn = document.getElementById('shuffle-btn');

const puzzleBoard = document.getElementById('puzzle-board');
const loadingOverlay = document.getElementById('loading-overlay');
const errorOverlay = document.getElementById('error-overlay');
const winOverlay = document.getElementById('win-overlay');

let currentImage = null;
let grid = 4;
let tiles = []; // 1D array representing the board. 0 is empty.
let emptyIndex = -1; // Index in the 1D array

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
        shuffleBoard();
    };
    img.onerror = () => {
        loadingOverlay.classList.add('hidden');
        errorOverlay.classList.remove('hidden');
    };
    img.src = imgUrl;
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
    // Instead of random generation (which might be unsolvable), 
    // we make random valid moves backwards from the solved state.
    let moves = grid * grid * 10; // More moves for larger grids
    
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
