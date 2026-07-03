const simulateBtn = document.getElementById('simulate-btn');
const restartBtn = document.getElementById('restart-btn');
const promptInput = document.getElementById('prompt-input');
const setupScreen = document.getElementById('setup-screen');
const timelineScreen = document.getElementById('timeline-screen');
const timelineContainer = document.getElementById('timeline-container');
const timelineTitle = document.getElementById('timeline-title');

// IMPORTANT: Replace this with your actual Vercel URL once you deploy the backend!
const VERCEL_API_URL = "https://suntzv-github-6d17bpmeg-imrishabh-ofcs-projects.vercel.app/api/whatif";

// If running locally, hit the local dev server. If on GitHub Pages, hit Vercel!
const API_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') 
    ? '/api/whatif' 
    : VERCEL_API_URL;

async function simulateTimeline(promptText) {
    // Hide setup, show timeline
    setupScreen.classList.add('hidden');
    timelineScreen.classList.remove('hidden');
    timelineContainer.innerHTML = '';
    restartBtn.classList.add('hidden');
    
    // Animate title
    timelineTitle.textContent = "CONSULTING THE MULTIVERSE...";

    let events = [];
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ prompt: promptText })
        });
        
        if (!response.ok) {
            throw new Error('API failed');
        }

        events = await response.json();
        
        if (!Array.isArray(events)) {
            throw new Error("API did not return an array");
        }

        // Preload images instantly to eliminate loading lag
        events.forEach((ev, index) => {
            // Alternate between fast stock providers to avoid rate limits
            if (index % 2 === 0) {
                ev.preloadedImage = `https://picsum.photos/seed/${encodeURIComponent(ev.keyword) + Math.floor(Math.random() * 10000)}/600/400`;
            } else {
                ev.preloadedImage = `https://loremflickr.com/600/400/${encodeURIComponent(ev.keyword)}?lock=${Math.floor(Math.random() * 10000)}`;
            }
            const img = new Image();
            img.src = ev.preloadedImage; // Browser starts downloading it immediately in the background
        });

    } catch (err) {
        console.error(err);
        timelineTitle.textContent = "MULTIVERSE COLLAPSED (ERROR)";
        restartBtn.classList.remove('hidden');
        return;
    }

    timelineTitle.textContent = "SIMULATING ALTERNATE TIMELINE...";
    let eventIndex = 0;

    function revealNext() {
        if (eventIndex >= events.length) {
            timelineTitle.textContent = "TIMELINE SECURE.";
            restartBtn.classList.remove('hidden');
            return;
        }

        const ev = events[eventIndex];
        
        const card = document.createElement('div');
        card.className = 'timeline-event';
        
        card.innerHTML = `
            <div class="event-year">YEAR ${ev.year}</div>
            <h3 class="event-title">${ev.title}</h3>
            <img class="event-image" src="${ev.preloadedImage}" alt="${ev.title}" onerror="this.onerror=null; this.src='https://picsum.photos/seed/${Math.random()}/600/400';">
            <p class="event-desc">${ev.desc}</p>
        `;

        timelineContainer.appendChild(card);
        
        // Auto-scroll to the newly added event
        setTimeout(() => {
            card.scrollIntoView({ behavior: "smooth", block: "end" });
        }, 100);

        eventIndex++;
        // Random delay between 1.5s and 2.5s for each jump
        const delay = 1500 + Math.random() * 1000;
        setTimeout(revealNext, delay);
    }

    // Start revealing after a short delay
    setTimeout(revealNext, 800);
}

simulateBtn.addEventListener('click', () => {
    const text = promptInput.value.trim();
    if (text) {
        simulateTimeline(text);
    } else {
        // give a visual shake if empty
        promptInput.style.transform = "translateX(5px)";
        setTimeout(() => promptInput.style.transform = "translateX(-5px)", 100);
        setTimeout(() => promptInput.style.transform = "translateX(5px)", 200);
        setTimeout(() => promptInput.style.transform = "translateX(0)", 300);
    }
});

restartBtn.addEventListener('click', () => {
    timelineScreen.classList.add('hidden');
    setupScreen.classList.remove('hidden');
    promptInput.value = '';
    promptInput.focus();
});
