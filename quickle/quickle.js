const board = document.querySelector("#board");
const timeDisplay = document.querySelector("#time");
const solvedDisplay = document.querySelector("#solved");
const averageDisplay = document.querySelector("#average");
const streakDisplay = document.querySelector("#streak");
const bestDisplay = document.querySelector("#best");
const message = document.querySelector("#message");
const startButton = document.querySelector("#start-button");
const mobileKeyboard = document.querySelector("#mobile-keyboard");

const fallbackWords = [
    "brisk",
    "crane",
    "flame",
    "ghost",
    "proud",
    "sling",
    "vivid",
    "waltz",
    "zesty",
    "mango"
];

const state = {
    words: fallbackWords,
    target: "",
    guess: "",
    row: 0,
    running: false,
    solved: 0,
    streak: 0,
    best: null,
    roundStartedAt: 0,
    totalSolveMs: 0,
    timeLeft: 60,
    endTime: 0,
    timerId: null,
    locked: false,
    roundToken: 0
};

function buildBoard() {
    board.innerHTML = "";

    for (let row = 0; row < 6; row += 1) {
        const rowElement = document.createElement("div");
        rowElement.className = "row";

        for (let col = 0; col < 5; col += 1) {
            const tile = document.createElement("div");
            tile.className = "tile";
            rowElement.append(tile);
        }

        board.append(rowElement);
    }
}

function loadWords() {
    try {
        if (!window.QUICKLE_WORDLIST) {
            throw new Error("wordlist missing");
        }

        const text = window.QUICKLE_WORDLIST;
        const words = text
            .split(/[\s,]+/)
            .map((word) => word.trim().toLowerCase())
            .filter((word) => /^[a-z]{5}$/.test(word));

        if (words.length > 0) {
            state.words = words;
            message.textContent = `Ready when your fingers are. (hint: AEIOU is good)`;
        }
    } catch {
        message.textContent = "Some error but no problem for you go play anyway.";
    }
}

function pickTarget() {
    state.roundToken += 1;
    state.target = state.words[Math.floor(Math.random() * state.words.length)];
    state.guess = "";
    state.row = 0;
    state.locked = false;
    state.roundStartedAt = performance.now();
    buildBoard();
}

function updateStats() {
    timeDisplay.textContent = state.timeLeft.toFixed(1);
    solvedDisplay.textContent = state.solved;
    streakDisplay.textContent = state.streak;
    bestDisplay.textContent = state.best === null ? "--" : `${(state.best / 1000).toFixed(1)}s`;
    averageDisplay.textContent = state.solved === 0 ? "--" : `${(state.totalSolveMs / state.solved / 1000).toFixed(1)}s`;
}

function currentTiles() {
    return Array.from(board.children[state.row].children);
}

function paintGuess(guess, target) {
    const tiles = currentTiles();
    const result = Array(5).fill("absent");
    const remaining = {};

    for (let index = 0; index < 5; index += 1) {
        if (guess[index] === target[index]) {
            result[index] = "correct";
        } else {
            remaining[target[index]] = (remaining[target[index]] || 0) + 1;
        }
    }

    for (let index = 0; index < 5; index += 1) {
        if (result[index] === "correct") {
            continue;
        }

        if (remaining[guess[index]] > 0) {
            result[index] = "present";
            remaining[guess[index]] -= 1;
        }
    }

    tiles.forEach((tile, index) => {
        tile.className = `tile ${result[index]}`;
    });
}

function renderGuess() {
    const tiles = currentTiles();

    tiles.forEach((tile, index) => {
        tile.textContent = state.guess[index] || "";
        tile.classList.toggle("filled", index < state.guess.length);
    });
}

function flashRow() {
    const row = board.children[state.row];

    row.classList.remove("shake");
    row.offsetHeight;
    row.classList.add("shake");
}

function nextRound(text) {
    const token = state.roundToken;

    state.locked = true;
    message.textContent = text;
    window.setTimeout(() => {
        if (!state.running || token !== state.roundToken) {
            return;
        }

        pickTarget();
        message.textContent = "Next word. Go.";
    }, 650);
}

function submitGuess() {
    if (state.guess.length !== 5) {
        flashRow();
        return;
    }

    const guess = state.guess;
    paintGuess(guess, state.target);

    if (guess === state.target) {
        const solveMs = performance.now() - state.roundStartedAt;

        state.solved += 1;
        state.streak += 1;
        state.totalSolveMs += solveMs;
        state.best = state.best === null ? solveMs : Math.min(state.best, solveMs);
        updateStats();
        nextRound(`Nailed it in ${(solveMs / 1000).toFixed(1)}s.`);
        return;
    }

    state.row += 1;
    state.guess = "";

    if (state.row >= 6) {
        state.streak = 0;
        updateStats();
        nextRound(`It was ${state.target.toUpperCase()}. Keep blitzing.`);
        return;
    }

    renderGuess();
}

function tick() {
    state.timeLeft = Math.max(0, (state.endTime - performance.now()) / 1000);
    updateStats();

    if (state.timeLeft <= 0) {
        state.running = false;
        window.clearInterval(state.timerId);
        startButton.textContent = "AGAIN";
        message.textContent = `Time. ${state.solved} solved.`;
    }
}

function startGame() {
    state.running = true;
    state.solved = 0;
    state.streak = 0;
    state.best = null;
    state.totalSolveMs = 0;
    state.timeLeft = 60;
    state.endTime = performance.now() + 60000;
    window.clearInterval(state.timerId);
    state.timerId = window.setInterval(tick, 100);
    startButton.textContent = "RESTART";
    startButton.blur();
    pickTarget();
    updateStats();
    message.textContent = "Type any 5 letters. Enter slams it in.";
}

function handleInput(key) {
    if (!state.running || state.locked) {
        return;
    }

    if (/^[a-z]$/i.test(key) && state.guess.length < 5) {
        state.guess += key.toLowerCase();
        renderGuess();
        return;
    }

    if (key === "Backspace") {
        state.guess = state.guess.slice(0, -1);
        renderGuess();
        return;
    }

    if (key === "Enter") {
        submitGuess();
    }
}

function handleKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey) {
        return;
    }
    
    if (event.key === "Enter") {
        event.preventDefault();
    }

    handleInput(event.key);
}

buildBoard();
updateStats();
loadWords();
startButton.addEventListener("click", startGame);
window.addEventListener("keydown", handleKeydown);
mobileKeyboard?.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button) return;
    
    const key = button.dataset.key;
    if (key) {
        handleInput(key);
    }
    button.blur();
});
