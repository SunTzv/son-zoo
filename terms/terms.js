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
        keypad: document.getElementById('game-keypad'),
        endless: document.getElementById('game-endless'),
        draw: document.getElementById('game-draw'),
        drunk: document.getElementById('game-drunk')
    };

    // --- The Official Unsubscription Agreement ---
    const legalese = `
        <div style="line-height: 2; font-size: 1.1rem; padding-bottom: 100vh;">
            <h2 style="text-align: center; margin-bottom: 40px; font-size: 2rem;">OFFICIAL UNSUBSCRIPTION AND DE-RADICALIZATION AGREEMENT</h2>
            
            <h3 style="margin-top: 30px;">SECTION 1: ACKNOWLEDGMENT OF CANCELLATION REQUEST</h3>
            <p>This document ("Agreement") serves as the official, binding, and irrevocable request by the undersigned user ("Subscriber", "You", or "Former Comrade") to terminate their active subscription to the Third Reich, fascism, National Socialism, and all associated ideological newsletters, podcast feeds, and mandatory rallies. By initiating this process, You acknowledge that You are willingly leaving the organization and forfeit any associated loyalty points.</p>
            
            <h3 style="margin-top: 30px;">SECTION 2: SURRENDER OF BENEFITS</h3>
            <p>By proceeding with this unsubscription, the Subscriber acknowledges the immediate forfeiture of all membership benefits. These forfeited benefits include, but are not limited to: access to secret underground bunkers, complimentary red armbands, the right to invade neighboring sovereign nations without provocation, invitations to highly choreographed torchlight parades, and the monthly "Dictator of the Month" gift basket.</p>
            
            <h3 style="margin-top: 30px;">SECTION 3: DENOUNCEMENT OF LEADERSHIP</h3>
            <p>The Subscriber hereby formally, completely, and permanently denounces the Führer, the High Command, and all associated bureaucratic entities. The Subscriber agrees to cease all goose-stepping, both public and private, effective immediately upon the submission of this form. Any accidental goose-stepping resulting from muscle memory must be reported to the De-Radicalization Hotline within 24 hours.</p>
            
            <h3 style="margin-top: 30px;">SECTION 4: RETURN OF COMPANY PROPERTY</h3>
            <p>Upon successful unsubscription, the Subscriber is legally obligated to return all fascist paraphernalia to the nearest De-Radicalization Center within 14 business days. Failure to return these items (including but not limited to: flags, medals, propaganda posters, and aggressively tailored uniforms) will result in a non-refundable charge of $45.99 applied to the payment method on file, plus applicable ideological taxes.</p>
            
            <h3 style="margin-top: 30px;">SECTION 5: ACCEPTANCE OF PEACE AND TOLERANCE</h3>
            <p>The Subscriber agrees to replace all previous hatred, bigotry, and systemic oppression with a baseline level of human decency. The Subscriber shall henceforth refer to all fellow human beings with respect, regardless of race, religion, nationality, or shoe size. This clause is binding in perpetuity throughout the known universe, including alternate timelines and parallel dimensions.</p>
            
            <h3 style="margin-top: 30px;">SECTION 6: NON-COMPETE CLAUSE</h3>
            <p>The Subscriber agrees not to start, fund, secretly advise, or participate in any rival fascist dictatorships, totalitarian regimes, authoritarian book clubs, or overly aggressive homeowner associations for a period of no less than one thousand (1,000) years following the termination of this Agreement.</p>
            
            <h3 style="margin-top: 30px;">SECTION 7: DATA RETENTION & ALGORITHMIC CLEANSING</h3>
            <p>While the Subscriber's active membership is terminated, the organization retains the right to keep the Subscriber's data on file for the sole purpose of historical mockery and cautionary museum exhibits. Furthermore, Your browser history will be scrubbed of all propaganda, and Your social media algorithms will be forcibly re-trained on cat videos, baking tutorials, and wholesome memes.</p>
            
            <h3 style="margin-top: 30px;">SECTION 8: WAIVER OF BLITZKRIEG</h3>
            <p>The Subscriber expressly waives any right, real or imagined, to initiate a Blitzkrieg. Any sudden, overwhelming military campaigns or aggressive expansions into neighboring yards/cubicles launched by the Subscriber after the date of unsubscription will be considered a material breach of this Agreement and may result in the reinstatement of the Subscriber's account, along with severe diplomatic penalties.</p>
            
            <h3 style="margin-top: 30px;">SECTION 9: ACKNOWLEDGMENT OF BUREAUCRATIC NIGHTMARE</h3>
            <p>The Subscriber understands that unsubscribing from a totalitarian ideology is a complex administrative process. By scrolling through this document, the Subscriber accepts that they may be subjected to CAPTCHAs, pop-ups, random quizzes, intentional obfuscation, and mild psychological distress designed to test their commitment to leaving the party.</p>
            
            <h3 style="margin-top: 30px;">SECTION 10: MANDATORY EMPATHY TRAINING</h3>
            <p>Post-cancellation, You agree to enroll in a minimum of forty (40) hours of mandatory empathy training. This training will include modules such as "Other People Have Feelings Too," "Why Invading Russia in Winter is a Bad Idea," and "How to Enjoy Art Without Declaring it Degenerate."</p>
            
            <h3 style="margin-top: 30px;">SECTION 11: INTELLECTUAL PROPERTY</h3>
            <p>You agree that any evil master plans, super-weapons, or unnecessarily complex schemes for world domination conceived during your tenure remain the sole intellectual property of the organization. You are forbidden from patenting, selling, or utilizing these plans in the civilian sector.</p>
            
            <h3 style="margin-top: 30px;">SECTION 12: LIMITATION OF LIABILITY</h3>
            <p>The organization is not liable for any sudden feelings of guilt, remorse, or realization of historical atrocities that may occur after the brainwashing wears off. The Subscriber assumes all emotional risks associated with returning to objective reality.</p>
            
            <h3 style="margin-top: 30px;">SECTION 13: ARBITRATION</h3>
            <p>Any disputes arising from this unsubscription process must be settled in binding arbitration at the Nuremberg Trials (or a similarly appropriate international tribunal). Class action waivers apply, except in cases involving crimes against humanity.</p>
            
            <h3 style="margin-top: 30px;">SECTION 14: SEVERABILITY</h3>
            <p>If any provision of this Agreement is found to be unenforceable or invalid under international law, that provision will be limited or eliminated to the minimum extent necessary so that the Agreement will otherwise remain in full force and effect.</p>
            
            <h3 style="margin-top: 30px;">SECTION 15: FINAL BINDING OATH</h3>
            <p>By reaching the bottom of this Agreement and checking the associated box, the Subscriber swears under penalty of perjury that they are leaving fascism behind. They confirm that they are not a robot, not a sympathizer, and are genuinely just trying to cancel a subscription they never should have signed up for in the first place.</p>
        </div>
    `;

    content.innerHTML = legalese;

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
        { id: 'draw', type: 'modal' },
        { id: 'drunk', type: 'modal' }
    ];

    // Shuffle a copy of the games array so we don't mess up the Alt+X indexes
    const shuffledGames = [...allGames].sort(() => Math.random() - 0.5);

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

        // Setup for specific games
        if (gameId === 'draw') {
            const templateKeys = typeof masterTemplates !== 'undefined' ? Object.keys(masterTemplates) : [];
            let gender = 'men', randomId = 1;

            if (templateKeys.length > 0) {
                // Only pick from annotated faces!
                window.currentDrawFaceId = templateKeys[Math.floor(Math.random() * templateKeys.length)];
                const parts = window.currentDrawFaceId.split('_');
                gender = parts[0];
                randomId = parts[1];
            }

            document.getElementById('draw-face').src = `https://randomuser.me/api/portraits/${gender}/${randomId}.jpg`;
        }
    }

    function closeGame() {
        overlay.classList.add('hidden');
        isGameActive = false;
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';
    }

    // --- Prevent Keyboard Cheesing & Easter Eggs ---
    window.addEventListener('keydown', (e) => {
        // --- Developer Easter Egg: Alt + 1-0 to trigger games ---
        // Mapping:
        // Alt+1: Ad Popup
        // Alt+2: Quiz
        // Alt+3: Toggles
        // Alt+4: Popups (Swarm)
        // Alt+5: Typo
        // Alt+6: Keypad
        // Alt+7: Captcha
        // Alt+8: Endless
        // Alt+9: Draw
        // Alt+0: Drunk
        if (e.altKey && e.key >= '0' && e.key <= '9') {
            e.preventDefault();
            const num = parseInt(e.key);
            const index = num === 0 ? 9 : num - 1; // Alt+1 is index 0, Alt+0 is index 9
            const game = allGames[index];

            if (game) {
                // Mimic the scroll trigger locking
                isGameActive = true;
                const scrollTop = window.scrollY || document.documentElement.scrollTop;
                lockScrollTop = scrollTop;
                document.body.style.overflow = 'hidden';
                document.documentElement.style.overflow = 'hidden';

                if (game.type === 'modal') {
                    launchGame(game.id);
                } else if (game.type === 'swarm') {
                    launchSwarm();
                }
            }
            return;
        }

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
                if (i + 1 < numToggles) toggleStates[i + 1] = !toggleStates[i + 1];
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
    for (let i = 0; i < 100; i++) words.push("Citizen");
    // Insert typo
    const typoIndex = Math.floor(Math.random() * words.length);
    words[typoIndex] = "Fascist";

    typoText.innerHTML = words.map((w, i) =>
        `<span class="typo-word" data-index="${i}">${w}</span>`
    ).join(' ');

    typoText.addEventListener('click', (e) => {
        if (e.target.classList.contains('typo-word')) {
            if (e.target.textContent === "Fascist") {
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
    for (let i = 0; i < 9; i++) {
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
            btn.style.background = "#4ade80";
            setTimeout(closeGame, 500);
        });
    });

    // --- Game: Keypad ---
    const keypadGrid = document.getElementById('keypad-grid');
    const keypadDisplay = document.getElementById('keypad-display');
    const keypadClear = document.getElementById('keypad-clear');
    const targetWord = "UNSUB";
    let currentInput = "";
    const letters = ['U', 'N', 'S', 'B', 'A', 'E', 'I', 'O', 'R'];

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

        const titles = ["Halt!", "Wait!", "For the Fatherland!", "Warning!", "Re-enlist?"];

        popup.innerHTML = `
            <div class="mini-popup-close">x</div>
            <h3>${titles[index]}</h3>
            <p>Please read Treaty of Versailles clause ${Math.floor(Math.random() * 100)} carefully.</p>
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
        endlessText += "WHEREAS, the user must read this entire block of text to successfully surrender their Nazi subscription and commit to universal peace. ";
        endlessText += "Failure to do so will result in immediate re-enlistment to the Wehrmacht. ";
        endlessText += "Please continue scrolling to demonstrate your commitment to un-subscribing.<br><br>";
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

    // --- Game: Drawing Game (Fake NN for Hitler Mustache) ---
    const drawCanvas = document.getElementById('draw-canvas');
    const drawCtx = drawCanvas.getContext('2d');
    const drawClearBtn = document.getElementById('draw-clear');
    const drawSubmitBtn = document.getElementById('draw-submit');
    const drawFeedback = document.getElementById('draw-feedback');

    let isDrawing = false;
    let strokes = []; // Store drawn points to calculate bounding box

    drawCanvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = drawCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        drawCtx.beginPath();
        drawCtx.moveTo(x, y);
        strokes.push({ x, y });
    });

    drawCanvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = drawCanvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        drawCtx.lineTo(x, y);
        drawCtx.strokeStyle = 'black';
        drawCtx.lineWidth = 10;
        drawCtx.lineCap = 'round';
        drawCtx.stroke();
        strokes.push({ x, y });

        // Enable submit if they drew something
        if (strokes.length > 5) {
            drawSubmitBtn.classList.remove('disabled');
        }
    });

    drawCanvas.addEventListener('mouseup', () => { isDrawing = false; });
    drawCanvas.addEventListener('mouseleave', () => { isDrawing = false; });

    drawClearBtn.addEventListener('click', () => {
        drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
        strokes = [];
        drawSubmitBtn.classList.add('disabled');
        drawFeedback.textContent = '';
    });

    const drawChangeBtn = document.getElementById('draw-change');
    if (drawChangeBtn) {
        drawChangeBtn.addEventListener('click', () => {
            // Pick a new face
            const templateKeys = typeof masterTemplates !== 'undefined' ? Object.keys(masterTemplates) : [];
            let gender = 'men', randomId = 1;
            if (templateKeys.length > 0) {
                window.currentDrawFaceId = templateKeys[Math.floor(Math.random() * templateKeys.length)];
                const parts = window.currentDrawFaceId.split('_');
                gender = parts[0];
                randomId = parts[1];
            }
            document.getElementById('draw-face').src = `https://randomuser.me/api/portraits/${gender}/${randomId}.jpg`;

            // Clear current drawing
            drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
            strokes = [];
            drawSubmitBtn.classList.add('disabled');
            drawFeedback.textContent = '';
        });
    }

    drawSubmitBtn.addEventListener('click', () => {
        if (drawSubmitBtn.classList.contains('disabled')) return;
        // === TEMPLATE MATCHING ALGORITHM ===
        // We compare the user's grid directly against your master template
        const template = typeof masterTemplates !== 'undefined' && window.currentDrawFaceId ? masterTemplates[window.currentDrawFaceId] : new Array(900).fill(0);

        // Downsample the 300x300 canvas to a 30x30 binary grid
        const imgData = drawCtx.getImageData(0, 0, 300, 300).data;
        const grid = new Array(900).fill(0);

        let intersection = 0;
        let templateTotal = 0;
        let userTotal = 0;

        for (let y = 0; y < 300; y++) {
            for (let x = 0; x < 300; x++) {
                const alpha = imgData[(y * 300 + x) * 4 + 3];
                if (alpha > 50) { // Ink detected
                    const gridX = Math.floor(x / 10);
                    const gridY = Math.floor(y / 10);
                    grid[gridY * 30 + gridX] = 1;
                }
            }
        }

        for (let i = 0; i < 900; i++) {
            if (template[i] === 1) templateTotal++;
            if (grid[i] === 1) userTotal++;
            if (template[i] === 1 && grid[i] === 1) intersection++;
        }

        // Match Calculation
        const outsidePixels = userTotal - intersection;
        let rawScore = 0;

        if (templateTotal > 0) {
            let coverage = intersection / templateTotal;
            // Heavily penalize drawing outside the lines
            let penalty = (outsidePixels / templateTotal) * 0.5;
            rawScore = coverage - penalty;
        } else if (userTotal > 0) {
            // Failsafe if no template exists but they drew
            rawScore = 0.5;
        }

        let score = Math.max(0, Math.min(100, Math.round(rawScore * 1000) / 10)); // Clamp 0-100, 1 decimal place

        if (score >= 80) {
            drawFeedback.style.color = "#4ade80";
            if (score >= 99) {
                drawFeedback.textContent = `AI Analysis: ${score}% match. Mein Führer! A masterpiece of Aryan precision!`;
            } else {
                drawFeedback.textContent = `AI Analysis: ${score}% match. Artwork verified.`;
            }
            setTimeout(() => {
                closeGame();
                drawCtx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
                strokes = [];
                drawFeedback.textContent = '';
            }, 4000); // Increased from 1000 to 4000 to allow reading
        } else {
            drawFeedback.style.color = "#f44336";
            let failReason = "";
            if (score <= 10) {
                failReason = `AI Analysis: ${score}% match. You completely missed the mustache zone.`;
            } else if (score < 50) {
                failReason = `AI Analysis: ${score}% match. Too messy or missing volume. Stay within the lines!`;
            } else {
                failReason = `AI Analysis: ${score}% match. Close, but not accurate enough. Required: 80%.`;
            }
            drawFeedback.textContent = failReason;
        }
    });

    // --- Game: Drunk Input ---
    const drunkInput = document.getElementById('drunk-input');
    const drunkBtn = document.getElementById('drunk-btn');
    const targetPhrase = "I denounce the Fuhrer";

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
        const submitRect = document.getElementById('submit-btn').getBoundingClientRect();

        // Calculate safe random coordinates within the section
        const maxX = sectionRect.width - wrapperRect.width - 40;

        // Ensure the checkbox stays below the submit button
        // Calculate the minimum Y relative to the section
        const minBtnY = (submitRect.bottom - sectionRect.top) + 20;
        const maxY = sectionRect.height - wrapperRect.height - 20;

        const randomX = Math.max(0, Math.floor(Math.random() * maxX));
        // Force randomY to be at least below the submit button
        const randomY = Math.max(minBtnY, Math.floor(minBtnY + Math.random() * (maxY - minBtnY)));

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
