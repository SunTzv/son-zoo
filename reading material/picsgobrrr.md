# Building Pics Go Brrr

Pics Go Brrr implements a sliding 15-puzzle using CSS rendering techniques rather than sliced image assets.

### 1. Structural Layout (HTML)
The DOM structure consists of a main wrapper for the game board, an overlay container for loading or error messages, a move counter display, and a victory screen hidden by default.

### 2. The Visual Trick (CSS)
A grid layout forms the puzzle board. Every puzzle tile is an empty `div` assigned the identical `background-image` source. Individual tiles display specific image segments by manipulating the `background-position` property. Mathematical percentages dictate the offset, ensuring each tile renders only its designated slice. As tiles move, their visual segment travels with them.

### 3. Core Puzzle Logic (JavaScript)
A JavaScript engine manages the internal coordinate system and interactivity.
- **Data Loading**: An image asset is dynamically fetched based on the current date.
- **Board Initialization**: An array of coordinate objects representing the grid is generated. One coordinate is removed to function as the empty space. A shuffling algorithm scrambles the remaining tiles while ensuring the resulting configuration remains mathematically solvable.
- **Movement Engine**: Tile clicks trigger adjacency checks against the empty space. If the difference between their X or Y coordinates equals 1, the move is valid. Internal coordinates are swapped, the move counter increments, and physical DOM positions are updated via CSS transforms.
- **Victory Checking**: Following every move, a validation function compares each tile's current coordinates against its original target coordinates. If the entire grid aligns perfectly, the board locks, the missing piece is revealed, and the victory overlay renders.
