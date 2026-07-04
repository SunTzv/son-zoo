// Create Context Menu Element
let contextMenu = null;

function initContextMenu() {
    contextMenu = document.createElement('div');
    contextMenu.id = 'goofy-context-menu';
    contextMenu.innerHTML = `
        <div class="goofy-context-item" onclick="alert('You really thought that would work?')">Inspect Element</div>
        <div class="goofy-context-item" onclick="alert('Saved as an NFT for $40,000')">Save Page As...</div>
        <div class="goofy-context-item" onclick="alert('Text successfully copied to someone else\\'s clipboard.')">Copy</div>
        <div class="goofy-context-item" onclick="location.reload()">Reload (With Bugs)</div>
        <div class="goofy-context-item" onclick="alert('Nice try.')">View Page Source</div>
    `;
    document.body.appendChild(contextMenu);

    document.addEventListener("contextmenu", (event) => {
        event.preventDefault();
        
        // Position menu
        const x = event.clientX;
        const y = event.clientY;
        
        contextMenu.style.display = 'flex';
        
        // Prevent going off-screen
        const rect = contextMenu.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            contextMenu.style.left = (x - rect.width) + 'px';
        } else {
            contextMenu.style.left = x + 'px';
        }
        
        if (y + rect.height > window.innerHeight) {
            contextMenu.style.top = (y - rect.height) + 'px';
        } else {
            contextMenu.style.top = y + 'px';
        }
    });

    // Hide menu on click outside
    document.addEventListener("click", () => {
        if (contextMenu.style.display === 'flex') {
            contextMenu.style.display = 'none';
        }
    });

    // Aggressive Anti-DevTools Key Blocker
    window.devModeAllowed = false;
    window.addEventListener('keydown', (e) => {
        // Backdoor for developer
        if (e.altKey && e.key.toLowerCase() === 'c') {
            window.devModeAllowed = !window.devModeAllowed;
            console.log(window.devModeAllowed ? "Dev mode unlocked. Protections disabled." : "Dev mode locked. Protections enabled.");
            return;
        }

        if (window.devModeAllowed) return;

        // Block F12
        if (e.key === 'F12') {
            e.preventDefault();
            alert("F12 is for cowards.");
        }
        
        // Block Ctrl+U, Ctrl+Shift+I/J/C
        if (e.ctrlKey || e.metaKey) {
            if (e.shiftKey && ['I', 'J', 'C'].includes(e.key.toUpperCase())) {
                e.preventDefault();
                alert("No DevTools for you.");
            }
            if (e.key.toLowerCase() === 'u') {
                e.preventDefault();
                alert("View Source? Try 'View Outside'.");
            }
        }
    });

    // Debugger Trap: Freezes the browser if they force open DevTools via browser menu
    setInterval(() => {
        if (!window.devModeAllowed) {
            debugger;
        }
    }, 100);

    // Site-wide Favicon
    if (!document.querySelector("link[rel='icon']")) {
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.type = "image/gif";
        const scriptTag = document.querySelector('script[src$="site.js"]');
        const prefix = scriptTag ? scriptTag.getAttribute('src').replace('site.js', '') : './';
        favicon.href = `${prefix}assets/cat.gif`;
        document.head.appendChild(favicon);
    }
}
function addMobileWarning() {
    if (!document.querySelector(".mobile-warning-overlay")) {
        const overlay = document.createElement("div");
        overlay.className = "mobile-warning-overlay";
        overlay.innerHTML = `
            <div class="mobile-warning-box">
                <h2>🚨 WHOA THERE 🚨</h2>
                <p>This site is built for big screens and clunky keyboards. Your tiny phone screen simply cannot handle this level of goofiness.</p>
                <p>Please open it on a laptop or desktop!</p>
                <button class="mobile-warning-btn">I'M STUBBORN, LET ME SUFFER</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const btn = overlay.querySelector(".mobile-warning-btn");
        btn.addEventListener("click", () => {
            overlay.style.display = "none";
        });
    }
}

// --- Global Cat Cursor Injection ---
function initGlobalCatCursor() {
    const scriptTag = document.querySelector('script[src$="site.js"]');
    const prefix = scriptTag ? scriptTag.getAttribute('src').replace('site.js', '') : './';

    if (!document.getElementById("chasing-cat")) {
        const catContainer = document.createElement('div');
        catContainer.innerHTML = `
            <img src="${prefix}assets/cat.gif" id="chasing-cat" alt="Chasing Cat"
                style="position:absolute; top:-100px; left:-100px; width:64px; pointer-events:none; z-index:9999; transition: transform 0.1s; display:none;">
            
            <div id="cat-thought"
                style="position:absolute; display:none; background:white; border:2px solid black; border-radius:15px; padding:8px 12px; font-size:12px; z-index:10000; pointer-events:none; font-family: 'Comic Sans MS', cursive, sans-serif; box-shadow: 2px 2px 0 #000;">
                you cant get rid of me unless you tie me to a fence
            </div>
        
            <div id="fence"
                style="position:absolute; top:30px; left:0px; width:20%; height:20%; display:none; cursor:pointer; z-index:9000; text-align:center; transition: transform 0.2s;"
                onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <img src="${prefix}assets/fence.png" alt="Fence"
                    style="width:100%; height:100%; object-fit:contain; pointer-events:none;">
            </div>
        
            <div id="leash-item"
                style="position:absolute; top:30px; right:30px; width:60px; height:60px; display:none; cursor:pointer; z-index:9000; text-align:center; transition: transform 0.2s;"
                onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">
                <img src="${prefix}assets/leash.png" alt="Leash"
                    style="width:100%; height:100%; object-fit:contain; pointer-events:none;">
            </div>
        
            <svg id="leash-svg"
                style="position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:8000; display:none;">
                <line id="leash-line" x1="0" y1="0" x2="0" y2="0" stroke="red" stroke-width="3" stroke-dasharray="1,1" />
            </svg>
        `;
        document.body.appendChild(catContainer);
    }

    const cat = document.getElementById("chasing-cat");
    const spawnBtn = document.getElementById("spawn-cat-btn"); 
    const hint = document.getElementById("click-me-hint"); 

    const catThought = document.getElementById("cat-thought");
    const fenceUI = document.getElementById("fence");
    const leashUI = document.getElementById("leash-item");
    const leashSvg = document.getElementById("leash-svg");
    const leashLine = document.getElementById("leash-line");

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let catX = mouseX;
    let catY = mouseY;
    let currentDir = 1;
    let isSpinning = false;
    
    const isMainSite = prefix === '' || prefix === './';
    const navEntries = performance.getEntriesByType('navigation');
    const isReload = navEntries.length > 0 && navEntries[0].type === 'reload';
    
    // Helper to fix file:// origin isolation in local testing
    function setCatState(val) {
        window.name = val === 'true' ? 'cat_active' : 'cat_inactive';
        try { localStorage.setItem('cat_cursor_active', val); } catch(e){}
    }
    
    function getCatState() {
        if (window.name === 'cat_active') return 'true';
        if (window.name === 'cat_inactive') return 'false';
        return localStorage.getItem('cat_cursor_active');
    }
    
    // If loading the main site via a hard REFRESH, clear the cat state
    if (isMainSite && isReload) {
        setCatState('false');
    }
    
    // Check state for site-wide persistence
    const savedState = getCatState();
    let catState = (savedState === 'true') ? 'CURSOR' : 'HIDDEN';
    
    let holdingLeash = false;
    const MAX_LEASH_LENGTH = 150;
    let wobbleTime = 4;
    
    const oiiaSound = new Audio(`${prefix}assets/oiia.mp3`);

    window.addEventListener("mousemove", (e) => {
        mouseX = e.pageX;
        mouseY = e.pageY;
    });

    function spawnCat() {
        if (catState === 'HIDDEN') {
            catState = 'CURSOR';
            setCatState('true');
            
            document.body.classList.add("hide-cursor");
            if (hint) hint.style.display = "none";
            cat.style.display = "block";
            
            // Show thought bubble immediately
            catThought.style.display = "block";
            // Disappear after 6 seconds
            setTimeout(() => {
                if (catState === 'CURSOR') {
                    catThought.style.display = "none";
                }
            }, 6000);

            catX = window.scrollX + window.innerWidth / 2;
            catY = window.scrollY + window.innerHeight / 2;

            const isMainSite = prefix === '' || prefix === './';
            if (isMainSite) {
                oiiaSound.play().then(() => {
                    oiiaSound.pause();
                    oiiaSound.currentTime = 0;
                }).catch(() => { });
            }

            animateCat();
        } else if (catState === 'CURSOR') {
            catState = 'WAITING_FOR_LEASH';
            catThought.style.display = 'none';
            fenceUI.style.display = 'block';
            leashUI.style.display = 'block';
        }
    }

    if (catState === 'CURSOR') {
        document.body.classList.add("hide-cursor");
        if (hint) hint.style.display = "none";
        cat.style.display = "block";
        catX = window.scrollX + window.innerWidth / 2;
        catY = window.scrollY + window.innerHeight / 2;
        animateCat();
    }

    if (spawnBtn) {
        spawnBtn.addEventListener("click", spawnCat);
    }

    leashUI.addEventListener("click", () => {
        if (catState === 'WAITING_FOR_LEASH') {
            holdingLeash = true;
            leashUI.style.display = 'none';
        }
    });

    fenceUI.addEventListener("click", () => {
        if (catState === 'WAITING_FOR_LEASH' && holdingLeash) {
            catState = 'LEASHED';
            setCatState('false');
            
            document.body.classList.remove("hide-cursor");
            leashSvg.style.display = 'block';
        }
    });

    function animateCat() {
        const dx = mouseX - catX;
        const dy = mouseY - catY;
        let nextX = catX;
        let nextY = catY;

        if (catState === 'CURSOR' || catState === 'WAITING_FOR_LEASH') {
            nextX = mouseX;
            nextY = mouseY;
            if (catState === 'CURSOR' && catThought.style.display === "block") {
                catThought.style.left = (catX + 30) + "px";
                catThought.style.top = (catY - 40) + "px";
            }
        } else if (catState === 'LEASHED') {
            nextX = catX + dx * 0.05;
            nextY = catY + dy * 0.05;
            wobbleTime += 0.1;
            nextX += Math.sin(wobbleTime) * 20;
            nextY += Math.cos(wobbleTime * 1.3) * 20;

            const fenceRect = fenceUI.getBoundingClientRect();
            const fX = fenceRect.left + window.scrollX + fenceRect.width / 2;
            const fY = fenceRect.top + window.scrollY + fenceRect.height / 2;

            const fdx = nextX - fX;
            const fdy = nextY - fY;
            const distFromFence = Math.sqrt(fdx * fdx + fdy * fdy);

            if (distFromFence > MAX_LEASH_LENGTH) {
                const angle = Math.atan2(fdy, fdx);
                nextX = fX + Math.cos(angle) * MAX_LEASH_LENGTH;
                nextY = fY + Math.sin(angle) * MAX_LEASH_LENGTH;
            }

            leashLine.setAttribute("x1", fX);
            leashLine.setAttribute("y1", fY);
            leashLine.setAttribute("x2", nextX);
            leashLine.setAttribute("y2", nextY);
        }

        const moveDx = nextX - catX;
        const newDir = moveDx > 0 ? 1 : (moveDx < 0 ? -1 : currentDir);
        catX = nextX;
        catY = nextY;

        if (catState !== 'LEASHED' && newDir !== currentDir && !isSpinning && Math.abs(dx) > 10) {
            isSpinning = true;
            currentDir = newDir;
            cat.src = `${prefix}assets/oia-uia.gif`;
            cat.style.transform = `scaleX(1)`;

            const isMainSite = prefix === '' || prefix === './';
            if (isMainSite && (oiiaSound.paused || oiiaSound.ended)) {
                oiiaSound.currentTime = 0.03;
                oiiaSound.play().catch(() => { });
            }

            setTimeout(() => {
                isSpinning = false;
                cat.src = `${prefix}assets/cat.gif`;
            }, 400);
        }

        cat.style.left = (catX - 32) + "px";
        cat.style.top = (catY - 32) + "px";

        if (!isSpinning) {
            cat.style.transform = `scaleX(${currentDir})`;
        }

        requestAnimationFrame(animateCat);
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        initContextMenu();
        addMobileWarning();
        initGlobalCatCursor();
    });
} else {
    addMobileWarning();
    initContextMenu();
    initGlobalCatCursor();
}
