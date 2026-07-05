const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? '/api/gaslighter'
    : "https://suntzv-github-io.vercel.app/api/gaslighter";

// UI Elements
const helpBtn = document.getElementById('help-btn');
const helpModal = document.getElementById('help-modal');
const closeHelpBtn = document.getElementById('close-help-btn');
const startGameBtn = document.getElementById('start-game-btn');
const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const msPaintImg = document.getElementById('ms-paint-img');
const canvasLoading = document.getElementById('canvas-loading');
const targetObjectText = document.getElementById('target-object-text');
const attemptsCount = document.getElementById('attempts-count');
const chatLog = document.getElementById('chat-log');
const chatInput = document.getElementById('chat-input');
const chatInputArea = document.querySelector('.chat-input-area');

// Game Over Modal
const gameOverModal = document.getElementById('game-over-modal');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainBtn = document.getElementById('play-again-btn');
const mainMenuBtn = document.getElementById('main-menu-btn');
const sendBtn = document.getElementById('send-btn');
const confidenceFill = document.getElementById('confidence-fill');

// State
// Loading Screen & Mini-game
const loadingScreen = document.getElementById('loading-screen');
const glassesBtn = document.getElementById('glasses-btn');
const glassesCounter = document.getElementById('glasses-counter');
let glassesCaught = 0;
let glassesInterval = null;

let attemptsLeft = 5;
let currentConfidence = 100;
let chatHistory = [];
let gameActive = false;
let currentActual = '';

// Help Modal
helpBtn.addEventListener('click', () => {
    helpModal.classList.remove('hidden');
});

closeHelpBtn.addEventListener('click', () => {
    helpModal.classList.add('hidden');
});

if (playAgainBtn) {
    playAgainBtn.addEventListener('click', () => {
        gameOverModal.classList.add('hidden');
        startGame();
    });
}

if (mainMenuBtn) {
    mainMenuBtn.addEventListener('click', () => {
        window.location.href = '../index.html';
    });
}

function endGame(win) {
    gameActive = false;
    chatInput.disabled = true;
    sendBtn.disabled = true;

    if (win) {
        gameOverTitle.textContent = "You Win!";
        gameOverMessage.textContent = "The professor finally broke! You are a master gaslighter.";
    } else {
        gameOverTitle.textContent = "You Lose";
        gameOverMessage.textContent = "The professor held his ground. You ran out of attempts.";
    }

    setTimeout(() => {
        gameOverModal.classList.remove('hidden');
    }, 1500); // Wait 1.5 seconds so player can read his final message
}

// Update Environment based on confidence
function updateEnvironment(confidence) {
    const morningTop = [135, 206, 235];
    const morningBot = [224, 246, 255];
    const nightTop = [10, 15, 40];
    const nightBot = [25, 30, 60];

    const factor = confidence / 100;
    const tR = Math.round(nightTop[0] + (morningTop[0] - nightTop[0]) * factor);
    const tG = Math.round(nightTop[1] + (morningTop[1] - nightTop[1]) * factor);
    const tB = Math.round(nightTop[2] + (morningTop[2] - nightTop[2]) * factor);

    const bR = Math.round(nightBot[0] + (morningBot[0] - nightBot[0]) * factor);
    const bG = Math.round(nightBot[1] + (morningBot[1] - nightBot[1]) * factor);
    const bB = Math.round(nightBot[2] + (morningBot[2] - nightBot[2]) * factor);

    document.documentElement.style.setProperty('--sky-top', `rgb(${tR}, ${tG}, ${tB})`);
    document.documentElement.style.setProperty('--sky-bottom', `rgb(${bR}, ${bG}, ${bB})`);

    confidenceFill.style.width = `${confidence}%`;

    if (confidence < 40) {
        document.body.classList.add('night-mode');
    } else {
        document.body.classList.remove('night-mode');
    }
}

function appendMessage(role, text) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `chat-msg ${role === 'user' ? 'msg-user' : 'msg-ai'}`;
    msgDiv.textContent = text;
    chatLog.appendChild(msgDiv);
    chatLog.scrollTop = chatLog.scrollHeight;
}

// Glasses mini game interaction
if (glassesBtn) {
    glassesBtn.addEventListener('click', () => {
        glassesCaught++;
        glassesCounter.textContent = glassesCaught;
        
        // Jump immediately when caught
        const newTop = Math.random() * 250;
        const newLeft = Math.random() * 250;
        glassesBtn.style.top = `${newTop}px`;
        glassesBtn.style.left = `${newLeft}px`;
    });
}

// Init Game
async function startGame() {
    if (glassesInterval) {
        clearInterval(glassesInterval);
    }
    
    startScreen.classList.add('hidden');
    loadingScreen.classList.remove('hidden');
    
    // Start mini-game
    glassesCaught = 0;
    if (glassesCounter) glassesCounter.textContent = glassesCaught;
    if (glassesBtn) {
        glassesBtn.style.top = '130px';
        glassesBtn.style.left = '130px';
    }
    
    glassesInterval = setInterval(() => {
        if (!loadingScreen.classList.contains('hidden') && glassesBtn) {
            const newTop = Math.random() * 250;
            const newLeft = Math.random() * 250;
            glassesBtn.style.top = `${newTop}px`;
            glassesBtn.style.left = `${newLeft}px`;
        }
    }, 700);

    gameScreen.classList.add('hidden');

    msPaintImg.classList.add('hidden');
    canvasLoading.classList.remove('hidden');
    canvasLoading.textContent = "Professor is setting up...";

    attemptsLeft = 5;
    currentConfidence = 100;
    chatHistory = [];
    gameActive = false;
    currentActual = '';

    attemptsCount.textContent = attemptsLeft;
    updateEnvironment(currentConfidence);
    chatLog.innerHTML = '';

    chatInput.disabled = true;
    sendBtn.disabled = true;

    try {
        const categories = ["sports equipment", "kitchen appliance", "office supply", "garden tool", "vehicle", "animal", "hand tool", "clothing item", "musical instrument", "electronic device", "piece of furniture", "food item", "toy", "medical item", "school supply", "bathroom item"];
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];

        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'init', category: randomCategory })
        });

        if (!res.ok) throw new Error("Failed to init game");

        const data = await res.json();
        currentActual = data.actual;

        // Load image from Pollinations (using turbo model for faster generation)
        const promptText = `A childish poorly drawn scribble of a ${data.actual}, microsoft paint style, jagged pixelated lines, basic bucket fill colors, amateur digital art, white background`;
        const imgUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(promptText)}?width=192&height=192&nologo=true&model=turbo&seed=${Math.floor(Math.random() * 10000)}`;

        msPaintImg.src = imgUrl;
        msPaintImg.onload = () => {
            loadingScreen.classList.add('hidden');
            gameScreen.classList.remove('hidden');

            msPaintImg.classList.remove('hidden');
            canvasLoading.classList.add('hidden');
            gameActive = true;
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        };

        targetObjectText.textContent = data.target;

        appendMessage('ai', `That right there is a perfectly normal ${data.actual}. I have studied its mechanics for years! Don't you dare tell me otherwise, you young whippersnapper.`);

    } catch (e) {
        canvasLoading.textContent = "Error loading game. Try again.";
        console.error(e);
    }
}

startGameBtn.addEventListener('click', startGame);

async function sendChat() {
    const text = chatInput.value.trim();
    if (!text || !gameActive) return;

    chatInput.value = '';
    chatInput.disabled = true;
    sendBtn.disabled = true;

    appendMessage('user', text);
    chatHistory.push({ role: 'user', content: text });

    attemptsLeft--;
    attemptsCount.textContent = attemptsLeft;

    // Add typing indicator
    const typingDiv = document.createElement('div');
    typingDiv.className = 'chat-msg msg-ai';
    typingDiv.textContent = 'Professor is typing...';
    typingDiv.id = 'typing-indicator';
    chatLog.appendChild(typingDiv);
    chatLog.scrollTop = chatLog.scrollHeight;

    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'chat',
                history: chatHistory,
                actual: currentActual,
                target: targetObjectText.textContent,
                currentConfidence: currentConfidence
            })
        });

        const data = await res.json();

        document.getElementById('typing-indicator').remove();

        appendMessage('ai', data.response);
        chatHistory.push({ role: 'assistant', content: data.response });

        if (data.confidence < currentConfidence) {
            // Screen shake if confidence dropped
            document.body.classList.add('shake');
            setTimeout(() => document.body.classList.remove('shake'), 500);
        }

        currentConfidence = data.confidence;
        updateEnvironment(currentConfidence);

        if (currentConfidence <= 0) {
            endGame(true);
        } else if (attemptsLeft <= 0) {
            endGame(false);
        } else {
            chatInput.disabled = false;
            sendBtn.disabled = false;
            chatInput.focus();
        }

    } catch (e) {
        document.getElementById('typing-indicator').remove();
        appendMessage('ai', "Error connecting to Professor's brain.");
        console.error(e);
        // Refund attempt
        attemptsLeft++;
        attemptsCount.textContent = attemptsLeft;
        chatHistory.pop();
        chatInput.disabled = false;
        sendBtn.disabled = false;
    }
}

sendBtn.addEventListener('click', sendChat);
chatInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendChat();
});
