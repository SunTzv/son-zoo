# Building Quickle

Quickle recreates popular daily word-guessing mechanics as a high-speed blitz game. The architecture is split into three main components: structure, styling, and game logic.

### 1. Structural Layout (HTML)
The HTML shell establishes the foundation. The interface includes a header area to display real-time statistics (Time Left, Solved Count, Best Streak), a main game board, and an on-screen mobile keyboard. The game board is a dynamic container; rows and letter tiles are injected into the DOM via JavaScript when the game initializes.

### 2. Styling and Animations (CSS)
CSS Grid ensures the letter tiles align perfectly in a 6x5 matrix. Predefined classes like `.correct` (green), `.present` (yellow), and `.absent` (gray) manage dynamic visual states. CSS keyframe animations handle feedback, such as a subtle shake effect triggered by invalid word submissions, and a quick pop animation upon typing letters.

### 3. Core Game Engine (JavaScript)
A JavaScript state machine drives the game mechanics.
- **Initialization**: A predefined dictionary of valid 5-letter words is loaded into memory. Upon initialization, a target word is randomly selected, the score is reset, and a `setInterval` loop begins ticking down from 60 seconds.
- **Input Handling**: Global event listeners capture keystrokes, including letters, backspaces, and the Enter key. Non-alphabet characters are filtered out, and the active row on the board is visually updated.
- **Evaluation Algorithm**: An Enter keypress triggers a two-pass validation algorithm. First, word length is verified. Then, perfect letter matches are flagged green. Finally, remaining letters in the target word are scanned to assign yellow flags to partial matches, avoiding false hints for duplicate letters.
- **Game Loop**: Instead of halting upon a correct guess, the solve time is logged, the streak increments, a new target word is selected, the board clears, and the timer continues uninterrupted. The session concludes only when the master clock reaches zero.
