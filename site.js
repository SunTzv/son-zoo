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
    window.addEventListener('keydown', (e) => {
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
        debugger;
    }, 100);

    // Site-wide Favicon
    if (!document.querySelector("link[rel='icon']")) {
        const favicon = document.createElement("link");
        favicon.rel = "icon";
        favicon.type = "image/gif";
        // Calculate relative path to root assets folder based on current depth
        const depth = window.location.pathname.split('/').length - 2;
        const prefix = depth > 0 ? '../'.repeat(depth) : './';
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

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        addMobileWarning();
        initContextMenu();
    });
} else {
    addMobileWarning();
    initContextMenu();
}
