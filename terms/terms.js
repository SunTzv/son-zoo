document.addEventListener('DOMContentLoaded', () => {
    // Force scroll to top on load and prevent browser from restoring previous scroll
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);

    const scrollArea = document.getElementById('scroll-area');
    const content = document.getElementById('terms-content');
    const checkboxWrapper = document.querySelector('.checkbox-wrapper');
    const agreeCheckbox = document.getElementById('agree-checkbox');
    const submitBtn = document.getElementById('submit-btn');
    const agreementSection = document.getElementById('agreement-section');

    const overlay = document.getElementById('modal-overlay');
    const modals = {
        ad: document.getElementById('game-ad'),
        toggles: document.getElementById('game-toggles'),
        typo: document.getElementById('game-typo'),
        captcha: document.getElementById('game-captcha'),
        quiz: document.getElementById('game-quiz'),
        keypad: document.getElementById('game-keypad'),
        endless: document.getElementById('game-endless'),
        timer: document.getElementById('game-timer'),
        drunk: document.getElementById('game-drunk')
    };

    // --- Generate Absurdly Long Legalese ---
    const jargon = [
        "heretofore", "notwithstanding", "party of the first part", "ipso facto", 
        "synergistic liabilities", "quantum indemnification", "temporal waivers",
        "sub-clause 42.b.9", "retroactive obligations", "null and void", 
        "in perpetuity throughout the universe", "including but not limited to",
        "soul binding clause", "firstborn collateral", "mandatory fun allocation"
    ];

    let termsHTML = "";
    for (let i = 1; i <= 100; i++) {
        let para = `<strong>SECTION ${i}:</strong> `;
        let length = 20 + Math.floor(Math.random() * 30);
        for (let j = 0; j < length; j++) {
            para += jargon[Math.floor(Math.random() * jargon.length)] + " ";
        }
        para += "and furthermore, the user agrees to standard protocol.<br><br>";
        termsHTML += para;
    }
    content.innerHTML = termsHTML;

    // --- Scroll Triggers (Randomized!) ---
    const allGames = [
        { id: 'ad', type: 'modal' },
        { id: 'quiz', type: 'modal' },
        { id: 'toggles', type: 'modal' },
        { id: 'popups', type: 'swarm' },
        { id: 'typo', type: 'modal' },
        { id: 'keypad', type: 'modal' },
        { id: 'captcha', type: 'modal' },
        { id: 'endless', type: 'modal' },
        { id: 'timer', type: 'modal' },
        { id: 'drunk', type: 'modal' }
    ];

    // Shuffle the games array
    const shuffledGames = allGames.sort(() => Math.random() - 0.5);
    
    // Assign progress thresholds evenly (10 games = approx every 9%)
    let triggers = shuffledGames.map((game, index) => {
        return {
            progress: 0.09 * (index + 1), // 9%, 18%, 27%...
            game: game.id,
            type: game.type,
            done: false
        };
    });

    let isGameActive = false;
    let lockScrollTop = 0;

    window.addEventListener('scroll', () => {
        if (isGameActive) {
            // Force scroll back to the locked position if they try to bypass
            window.scrollTo(0, lockScrollTop);
            return;
        }

        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
        
        // Prevent division by zero if content is small
        if (maxScroll <= 0) return;
        
        const progress = scrollTop / maxScroll;

        for (let trigger of triggers) {
            if (!trigger.done && progress >= trigger.progress) {
                trigger.done = true;
                isGameActive = true;
                lockScrollTop = scrollTop; // Lock scroll exactly here
                document.body.style.overflow = 'hidden'; // Hide main scrollbar
                document.documentElement.style.overflow = 'hidden'; // Ensure it applies to html
                
                if (trigger.type === 'modal') {
                    launchGame(trigger.game);
                } else if (trigger.type === 'swarm') {
                    launchSwarm();
                }
                break; // Only trigger one game at a time!
            }
        }
    });

    function launchGame(gameId) {
        overlay.classList.remove('hidden');
        Object.values(modals).forEach(m => m.classList.add('hidden'));
        if (modals[gameId]) modals[gameId].classList.remove('hidden');
    }

    function closeGame() {
        overlay.classList.add('hidden');
        isGameActive = false;
        document.body.style.overflow = ''; 
        document.documentElement.style.overflow = ''; 
    }

    // --- Prevent Keyboard Cheesing ---
    window.addEventListener('keydown', (e) => {
        // Block Ctrl+F / Cmd+F to prevent cheating on the typo hunt
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
            e.preventDefault();
            return;
        }

        // If the user is currently typing in the input field, allow letters/spaces
        if (e.target.tagName && e.target.tagName.toLowerCase() === 'input') {
            const forbiddenKeysInInput = ["PageUp", "PageDown", "End", "Home", "Tab", "Enter"];
            if (forbiddenKeysInInput.includes(e.key)) {
                e.preventDefault();
            }
            return; 
        }
        
        // Otherwise, block all navigation keys globally (but allow up/down arrows)
        const forbiddenKeys = ["PageUp", "PageDown", "End", "Home", " ", "Spacebar", "Tab", "Enter"];
        if (forbiddenKeys.includes(e.key)) {
            e.preventDefault();
        }
    });

    // --- Game: Ad Popup ---
    document.getElementById('ad-close').addEventListener('click', () => {
        closeGame();
    });

    // --- Game: Toggles (Lights out style) ---
    const toggleContainer = document.getElementById('toggles-container');
    const numToggles = 5;
    let toggleStates = [false, false, false, false, false];

    function renderToggles() {
        toggleContainer.innerHTML = '';
        toggleStates.forEach((state, i) => {
            const t = document.createElement('div');
            t.className = `toggle-switch ${state ? 'on' : ''}`;
            t.innerHTML = '<div class="toggle-knob"></div>';
            t.addEventListener('click', () => {
                // Toggle clicked and the one to its right
                toggleStates[i] = !toggleStates[i];
                if (i + 1 < numToggles) toggleStates[i+1] = !toggleStates[i+1];
                renderToggles();
                checkToggles();
            });
            toggleContainer.appendChild(t);
        });
    }

    function checkToggles() {
        if (toggleStates.every(s => s === true)) {
            setTimeout(closeGame, 500);
        }
    }
    renderToggles();

    // --- Game: Typo Hunt ---
    const typoText = document.getElementById('typo-text');
    let words = [];
    for(let i=0; i<100; i++) words.push("Accept");
    // Insert typo
    const typoIndex = Math.floor(Math.random() * words.length);
    words[typoIndex] = "Acept";

    typoText.innerHTML = words.map((w, i) => 
        `<span class="typo-word" data-index="${i}">${w}</span>`
    ).join(' ');

    typoText.addEventListener('click', (e) => {
        if(e.target.classList.contains('typo-word')) {
            if (e.target.textContent === "Acept") {
                e.target.style.background = "#4ade80";
                setTimeout(closeGame, 500);
            } else {
                e.target.style.background = "#f44336";
                setTimeout(() => e.target.style.background = "", 300);
            }
        }
    });

    // --- Game: Captcha ---
    const captchaGrid = document.getElementById('captcha-grid');
    let captchaSelected = 0;
    for(let i=0; i<9; i++) {
        const img = document.createElement('div');
        img.className = 'captcha-img';
        // Random placeholder images
        img.style.backgroundImage = `url('https://picsum.photos/seed/${Math.random()}/100/100')`;
        img.addEventListener('click', () => {
            img.classList.toggle('selected');
        });
        captchaGrid.appendChild(img);
    }
    
    document.getElementById('captcha-verify').addEventListener('click', () => {
        const selected = document.querySelectorAll('.captcha-img.selected').length;
        if (selected >= 3) {
            closeGame();
        } else {
            alert("Are you sure you identified ALL the dread? Select at least 3.");
        }
    });


    // --- Game: Quiz ---
    const quizBtns = document.querySelectorAll('.quiz-btn');
    quizBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.getAttribute('data-correct') === "true") {
                btn.style.background = "#4ade80";
                setTimeout(closeGame, 500);
            } else {
                btn.style.background = "#f44336";
                setTimeout(() => { btn.style.background = ""; }, 500);
            }
        });
    });

    // --- Game: Keypad ---
    const keypadGrid = document.getElementById('keypad-grid');
    const keypadDisplay = document.getElementById('keypad-display');
    const keypadClear = document.getElementById('keypad-clear');
    const targetWord = "AGREE";
    let currentInput = "";
    const letters = ['A','B','C','D','E','F','G','H','R'];

    function renderKeypad() {
        keypadGrid.innerHTML = '';
        // Shuffle letters
        let shuffled = [...letters].sort(() => Math.random() - 0.5);
        
        shuffled.forEach(l => {
            const btn = document.createElement('button');
            btn.className = 'keypad-key goofy-btn';
            btn.textContent = l;
            btn.addEventListener('mouseenter', () => {
                // 30% chance to shuffle when you just hover over it
                if (Math.random() < 0.3) renderKeypad();
            });
            btn.addEventListener('click', () => {
                if (currentInput.length < 5) {
                    currentInput += l;
                    updateKeypadDisplay();
                }
                renderKeypad(); // Shuffle on every click
            });
            keypadGrid.appendChild(btn);
        });
    }

    function updateKeypadDisplay() {
        let displayStr = currentInput.padEnd(5, '_').split('').join(' ');
        keypadDisplay.textContent = displayStr;
        if (currentInput.length === 5) {
            if (currentInput === targetWord) {
                keypadDisplay.style.color = "#4ade80";
                setTimeout(() => {
                    closeGame();
                    keypadDisplay.style.color = "";
                    currentInput = "";
                }, 500);
            } else {
                keypadDisplay.style.color = "#f44336";
                setTimeout(() => {
                    currentInput = "";
                    updateKeypadDisplay();
                    keypadDisplay.style.color = "";
                }, 500);
            }
        }
    }
    
    keypadClear.addEventListener('click', () => {
        currentInput = "";
        updateKeypadDisplay();
    });
    
    renderKeypad();
    updateKeypadDisplay();

    // --- Game: Popup Swarm ---
    const swarmContainer = document.getElementById('popup-swarm-container');
    let popupsRemaining = 0;

    function launchSwarm() {
        swarmContainer.classList.remove('hidden');
        document.body.style.overflow = 'hidden';
        popupsRemaining = 5;
        
        for (let i = 0; i < 5; i++) {
            createMiniPopup(i);
        }
    }

    function createMiniPopup(index) {
        const popup = document.createElement('div');
        popup.className = 'mini-popup';
        
        // Calculate safe boundaries so the popup never clips off-screen
        const popupWidth = 320; // approx width with padding
        const popupHeight = 180; // approx height
        
        const padding = 20;
        const maxX = Math.max(padding, window.innerWidth - popupWidth - padding);
        const maxY = Math.max(padding, window.innerHeight - popupHeight - padding);
        
        const x = padding + Math.random() * (maxX - padding);
        const y = padding + Math.random() * (maxY - padding);
        
        popup.style.left = `${x}px`;
        popup.style.top = `${y}px`;
        
        const titles = ["Alert!", "Wait!", "Special Offer!", "Warning!", "Subscribe?"];
        
        popup.innerHTML = `
            <div class="mini-popup-close">x</div>
            <h3>${titles[index]}</h3>
            <p>Please read section ${Math.floor(Math.random()*100)} carefully.</p>
        `;
        
        const closeBtn = popup.querySelector('.mini-popup-close');
        
        // Sometimes the close button runs away too
        closeBtn.addEventListener('mouseenter', (e) => {
            if (Math.random() < 0.4) {
                // Move button to other side
                if (closeBtn.style.left) {
                    closeBtn.style.left = '';
                    closeBtn.style.right = '-5px';
                } else {
                    closeBtn.style.right = '';
                    closeBtn.style.left = '-5px';
                }
            }
        });
        
        closeBtn.addEventListener('click', () => {
            popup.remove();
            popupsRemaining--;
            if (popupsRemaining <= 0) {
                swarmContainer.classList.add('hidden');
                isGameActive = false;
                document.body.style.overflow = '';
                document.documentElement.style.overflow = '';
            }
        });
        
        swarmContainer.appendChild(popup);
    }

    // --- Game: Endless Sub-Agreement ---
    const endlessBox = document.getElementById('endless-scroll-box');
    const endlessContent = document.getElementById('endless-content');
    const endlessBtn = document.getElementById('endless-btn');
    
    // Generate lots of text
    let endlessText = "";
    for (let i = 0; i < 50; i++) {
        endlessText += "WHEREAS, the user must read this entire block of text to proceed. ";
        endlessText += "Failure to do so will result in immediate termination of the agreement. ";
        endlessText += "Please continue scrolling to demonstrate your commitment to these terms.<br><br>";
    }
    endlessContent.innerHTML = endlessText;
    
    endlessBox.addEventListener('scroll', () => {
        if (endlessBox.scrollTop + endlessBox.clientHeight >= endlessBox.scrollHeight - 10) {
            endlessBtn.classList.remove('disabled');
        }
    });
    
    endlessBtn.addEventListener('click', () => {
        if (!endlessBtn.classList.contains('disabled')) {
            closeGame();
        }
    });

    // --- Game: Lying Timer ---
    const timerDisplay = document.getElementById('timer-display');
    const timerBtn = document.getElementById('timer-btn');
    let timeLeft = 10;
    let timerInterval = null;
    let isStuck = false;
    let clickCountToUnstick = 0;

    // We only start the timer when this modal is opened
    // Since launchGame is a generic function, we can hook into it
    const originalLaunchGame = launchGame;
    launchGame = function(gameId) {
        originalLaunchGame(gameId);
        if (gameId === 'timer') {
            startTimerGame();
        }
    };

    function startTimerGame() {
        if (timerInterval) clearInterval(timerInterval);
        timeLeft = 10;
        isStuck = false;
        timerDisplay.textContent = timeLeft;
        timerDisplay.classList.remove('stuck');
        timerBtn.classList.add('disabled');
        
        timerInterval = setInterval(() => {
            if (!isStuck) {
                timeLeft--;
                timerDisplay.textContent = timeLeft;
                if (timeLeft === 1) {
                    isStuck = true;
                    timerDisplay.classList.add('stuck');
                    clickCountToUnstick = 5; // Needs 5 rapid clicks
                }
                if (timeLeft <= 0) {
                    clearInterval(timerInterval);
                    timerBtn.classList.remove('disabled');
                }
            }
        }, 1000);
    }

    timerDisplay.addEventListener('click', () => {
        if (isStuck) {
            clickCountToUnstick--;
            if (clickCountToUnstick <= 0) {
                isStuck = false;
                timerDisplay.classList.remove('stuck');
            }
        }
    });

    timerBtn.addEventListener('click', () => {
        if (!timerBtn.classList.contains('disabled')) closeGame();
    });

    // --- Game: Drunk Input ---
    const drunkInput = document.getElementById('drunk-input');
    const drunkBtn = document.getElementById('drunk-btn');
    const targetPhrase = "I waive my rights";

    drunkInput.addEventListener('input', (e) => {
        let val = drunkInput.value;
        
        // Drunk logic: randomly swap the last two characters
        if (val.length >= 2 && Math.random() < 0.15) {
            let lastChar = val.substring(val.length - 1);
            let secondLastChar = val.substring(val.length - 2, val.length - 1);
            let rest = val.substring(0, val.length - 2);
            val = rest + lastChar + secondLastChar;
            
            // Wait a tiny bit then apply the glitch so it happens while they type
            setTimeout(() => {
                drunkInput.value = val;
                checkDrunkInput();
            }, 50);
        }
        checkDrunkInput();
    });

    function checkDrunkInput() {
        if (drunkInput.value.toLowerCase() === targetPhrase.toLowerCase()) {
            drunkBtn.classList.remove('disabled');
        } else {
            drunkBtn.classList.add('disabled');
        }
    }

    drunkBtn.addEventListener('click', () => {
        if (!drunkBtn.classList.contains('disabled')) closeGame();
    });

    // --- Final Boss: Runaway Checkbox ---
    // Make the wrapper absolute so it can jump around inside the agreement section
    let runawayEnabled = true;
    
    checkboxWrapper.addEventListener('mouseenter', () => {
        if (!runawayEnabled) return;
        
        const sectionRect = agreementSection.getBoundingClientRect();
        const wrapperRect = checkboxWrapper.getBoundingClientRect();
        
        // Calculate safe random coordinates within the section
        const maxX = sectionRect.width - wrapperRect.width - 40;
        const maxY = sectionRect.height - wrapperRect.height - 40;
        
        const randomX = Math.max(0, Math.floor(Math.random() * maxX));
        const randomY = Math.max(0, Math.floor(Math.random() * maxY));
        
        checkboxWrapper.style.position = 'absolute';
        checkboxWrapper.style.left = `${randomX}px`;
        checkboxWrapper.style.top = `${randomY}px`;
        
        // Randomly disable runaway temporarily to allow clicking
        if (Math.random() < 0.1) {
            runawayEnabled = false;
            checkboxWrapper.style.background = "#4ade80"; // Visual cue
            setTimeout(() => {
                runawayEnabled = true;
                checkboxWrapper.style.background = "";
            }, 1000);
        }
    });

    agreeCheckbox.addEventListener('change', () => {
        if (agreeCheckbox.checked) {
            runawayEnabled = false; // Stop running once checked
            submitBtn.classList.remove('disabled');
        } else {
            runawayEnabled = true;
            submitBtn.classList.add('disabled');
        }
    });

    // --- Submission ---
    let submitClicked = false;
    submitBtn.addEventListener('click', () => {
        if (!submitClicked && agreeCheckbox.checked) {
            submitClicked = true;
            // Swap text playfully
            submitBtn.textContent = "DECLINE?";
            
            // Wait 5 seconds, giving them a chance to stare at "DECLINE?"
            setTimeout(() => {
                document.getElementById('modal-overlay').classList.remove('hidden');
                document.querySelectorAll('.modal-content').forEach(m => m.classList.add('hidden'));
                document.getElementById('game-final').classList.remove('hidden');
                document.body.style.overflow = 'hidden';
            }, 5000);
        }
    });

});
