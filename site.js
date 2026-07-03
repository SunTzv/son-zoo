document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
});

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
    document.addEventListener("DOMContentLoaded", addMobileWarning);
} else {
    addMobileWarning();
}
