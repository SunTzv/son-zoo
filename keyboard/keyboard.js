const keyboard = document.querySelector(".keyboard");
const octaveToggle = document.querySelector(".octave-toggle");
const octaveCount = document.querySelector("#octave-count");
const waveSelector = document.querySelector("#wave-selector");
const waves = ["sine", "square", "sawtooth", "triangle", "distortion"];
let currentWaveIndex = 0;
const volumeKnob = document.querySelector(".volume-knob");
const volumeDisplay = document.querySelector(".volume-display");

const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const keyboardKeys = ["a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j"];
const activeNotes = new Map();
const pointerHolds = new Map();
const pointerState = { x: 0, y: 0, time: 0 };

let audioContext;
let visibleKeyCount = 12;
let keys = [];
let keyMap = new Map();
let vibratoFadeTimer;
let masterGain;
let volume = 67;
let lastVolumeStep = volume;
let isTurningVolume = false;
let lastKnobAngle = -135 + (volume * 2.7);

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = volumeToGain(volume);
        masterGain.connect(audioContext.destination);
    }

    if (audioContext.state === "suspended") {
        audioContext.resume();
    }

    return audioContext;
}

function volumeToGain(volume) {
    return (volume / 100) ** 1.7;
}

function frequencyForStep(step) {
    return 261.63 * (2 ** (step / 12));
}

function makeDistortionCurve(amount) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
        const x = i * 2 / n_samples - 1;
        curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
    }
    return curve;
}

function updateKnobFace() {
    const rotation = -135 + (volume * 2.7);

    volumeKnob.style.setProperty("--knob-rotation", `${rotation}deg`);
    volumeKnob.setAttribute("aria-valuenow", String(volume));
    volumeKnob.setAttribute("aria-valuetext", `${volume} percent`);
    volumeDisplay.textContent = String(volume).padStart(2, "0");
}

function playVolumeClick(volume) {
    const context = getAudioContext();
    const click = context.createBufferSource();
    const snapGain = context.createGain();
    const snapFilter = context.createBiquadFilter();
    const body = context.createOscillator();
    const bodyGain = context.createGain();
    const bodyFilter = context.createBiquadFilter();
    const buffer = context.createBuffer(1, Math.floor(context.sampleRate * 0.024), context.sampleRate);
    const data = buffer.getChannelData(0);

    for (let index = 0; index < data.length; index += 1) {
        const decay = 1 - (index / data.length);
        data[index] = (Math.random() * 2 - 1) * decay * decay * decay;
    }

    click.buffer = buffer;
    snapFilter.type = "bandpass";
    snapFilter.frequency.value = 650 + (volume * 2.8);
    snapFilter.Q.value = 7;

    snapGain.gain.setValueAtTime(0.0001, context.currentTime);
    snapGain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.002);
    snapGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.035);

    body.type = "triangle";
    body.frequency.setValueAtTime(210 + (volume * 0.6), context.currentTime);
    body.frequency.exponentialRampToValueAtTime(95 + (volume * 0.3), context.currentTime + 0.045);
    bodyFilter.type = "lowpass";
    bodyFilter.frequency.value = 520;
    bodyFilter.Q.value = 1.2;
    bodyGain.gain.setValueAtTime(0.0001, context.currentTime);
    bodyGain.gain.exponentialRampToValueAtTime(0.1, context.currentTime + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.055);

    click.connect(snapFilter);
    snapFilter.connect(snapGain);
    snapGain.connect(context.destination);
    body.connect(bodyFilter);
    bodyFilter.connect(bodyGain);
    bodyGain.connect(context.destination);

    click.start();
    body.start();
    click.stop(context.currentTime + 0.04);
    body.stop(context.currentTime + 0.06);
}

function setVolume(nextVolume, { click = false } = {}) {
    const snappedVolume = Math.max(0, Math.min(100, Math.round(nextVolume / 5) * 5));
    volume = snappedVolume;
    updateKnobFace();

    if (audioContext && masterGain) {
        masterGain.gain.setTargetAtTime(volumeToGain(volume), audioContext.currentTime, 0.015);
    }

    if (click && volume !== lastVolumeStep) {
        playVolumeClick(volume);
        lastVolumeStep = volume;
    }
}

function setVolumeFromPointer(event) {
    const bounds = volumeKnob.getBoundingClientRect();
    const centerX = bounds.left + (bounds.width / 2);
    const centerY = bounds.top + (bounds.height / 2);
    const angle = (Math.atan2(event.clientY - centerY, event.clientX - centerX) * (180 / Math.PI)) + 90;
    const normalizedAngle = ((angle + 180) % 360) - 180;
    const isInDeadZone = normalizedAngle < -135 || normalizedAngle > 135;

    if (isInDeadZone && Math.abs(normalizedAngle - lastKnobAngle) > 80) {
        return;
    }

    const clampedAngle = Math.max(-135, Math.min(135, normalizedAngle));
    const nextVolume = ((clampedAngle + 135) / 270) * 100;

    lastKnobAngle = clampedAngle;
    setVolume(nextVolume, { click: true });
}

function renderKeyboard() {
    keyboard.innerHTML = "";
    keyboard.style.setProperty("--key-count", visibleKeyCount);
    keyboard.classList.toggle("expanded", visibleKeyCount === 36);
    octaveCount.textContent = visibleKeyCount;

    keys = Array.from({ length: visibleKeyCount }, (_, step) => {
        const note = noteNames[step % 12];
        const computerKey = step < keyboardKeys.length ? keyboardKeys[step] : "";
        const key = document.createElement("button");

        key.className = `key ${note.includes("#") ? "black-key" : "white-key"}`;
        key.type = "button";
        key.dataset.noteKey = String(step);
        key.dataset.frequency = frequencyForStep(step).toFixed(2);
        key.setAttribute("aria-label", note);
        key.innerHTML = `<span>${note}</span><kbd>${computerKey.toUpperCase()}</kbd>`;

        keyboard.append(key);
        return key;
    });

    keyMap = new Map(keys.slice(0, keyboardKeys.length).map((key, index) => [keyboardKeys[index], key]));
}

function updateVibratoFromPointer(event) {
    if (!audioContext || activeNotes.size === 0) {
        pointerState.x = event.clientX;
        pointerState.y = event.clientY;
        pointerState.time = performance.now();
        return;
    }

    const bounds = keyboard.getBoundingClientRect();
    const x = Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width));
    const now = performance.now();
    const distance = Math.hypot(event.clientX - pointerState.x, event.clientY - pointerState.y);
    const elapsed = Math.max(16, now - pointerState.time);
    const movement = Math.min(1, distance / elapsed / 1.2);
    const rate = 2 + (x * 10);
    const depth = movement * 70;

    pointerState.x = event.clientX;
    pointerState.y = event.clientY;
    pointerState.time = now;

    activeNotes.forEach(({ lfo, lfoGain }) => {
        lfo.frequency.setTargetAtTime(rate, audioContext.currentTime, 0.015);
        lfoGain.gain.setTargetAtTime(depth, audioContext.currentTime, 0.015);
    });

    clearTimeout(vibratoFadeTimer);
    vibratoFadeTimer = setTimeout(() => {
        if (!audioContext) {
            return;
        }

        activeNotes.forEach(({ lfoGain }) => {
            lfoGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.04);
        });
    }, 90);
}

function playKey(key, sourceId) {
    const noteKey = key.dataset.noteKey;

    if (activeNotes.has(noteKey)) {
        activeNotes.get(noteKey).sources.add(sourceId);
        return;
    }

    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();

    const isDistortion = waveSelector && waves[currentWaveIndex] === "distortion";
    oscillator.type = isDistortion ? "sawtooth" : (waveSelector ? waves[currentWaveIndex] : "sine");
    oscillator.frequency.value = Number(key.dataset.frequency);
    lfo.frequency.value = 5;
    lfoGain.gain.value = 0;

    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.28, context.currentTime + 0.015);

    lfo.connect(lfoGain);
    lfoGain.connect(oscillator.detune);
    oscillator.connect(gain);
    
    if (isDistortion) {
        const waveShaper = context.createWaveShaper();
        waveShaper.curve = makeDistortionCurve(400);
        waveShaper.oversample = '4x';
        gain.connect(waveShaper);
        waveShaper.connect(masterGain);
    } else {
        gain.connect(masterGain);
    }
    lfo.start();
    oscillator.start();

    activeNotes.set(noteKey, {
        oscillator,
        gain,
        lfo,
        lfoGain,
        sources: new Set([sourceId])
    });
    key.classList.add("is-playing");
}

function stopKey(key, sourceId) {
    const noteKey = key.dataset.noteKey;
    const activeNote = activeNotes.get(noteKey);

    if (!activeNote || !audioContext) {
        return;
    }

    activeNote.sources.delete(sourceId);

    if (activeNote.sources.size > 0) {
        return;
    }

    activeNote.gain.gain.cancelScheduledValues(audioContext.currentTime);
    activeNote.gain.gain.setValueAtTime(activeNote.gain.gain.value, audioContext.currentTime);
    activeNote.gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.08);
    activeNote.oscillator.stop(audioContext.currentTime + 0.09);
    activeNote.lfo.stop(audioContext.currentTime + 0.09);

    activeNotes.delete(noteKey);
    key.classList.remove("is-playing");
}

function stopAllKeys() {
    Array.from(activeNotes.keys()).forEach((noteKey) => {
        const key = keys.find((currentKey) => currentKey.dataset.noteKey === noteKey);
        const activeNote = activeNotes.get(noteKey);

        if (!key || !activeNote) {
            return;
        }

        activeNote.sources.forEach((sourceId) => stopKey(key, sourceId));
    });
    pointerHolds.clear();
}

function keyFromPointer(event) {
    return document.elementFromPoint(event.clientX, event.clientY)?.closest(".key");
}

function switchPointerKey(event) {
    const sourceId = `pointer:${event.pointerId}`;
    const nextKey = keyFromPointer(event);
    const previousKey = pointerHolds.get(event.pointerId);

    if (!previousKey || !nextKey || nextKey === previousKey) {
        return;
    }

    if (previousKey) {
        stopKey(previousKey, sourceId);
    }

    pointerHolds.set(event.pointerId, nextKey);
    playKey(nextKey, sourceId);
}

keyboard.addEventListener("pointerdown", (event) => {
    const key = event.target.closest(".key");

    if (key) {
        key.setPointerCapture(event.pointerId);
        pointerHolds.set(event.pointerId, key);
        updateVibratoFromPointer(event);
        playKey(key, `pointer:${event.pointerId}`);
    }
});

keyboard.addEventListener("pointermove", (event) => {
    updateVibratoFromPointer(event);
    switchPointerKey(event);
});
keyboard.addEventListener("pointerup", (event) => {
    const key = pointerHolds.get(event.pointerId);

    if (key) {
        stopKey(key, `pointer:${event.pointerId}`);
        pointerHolds.delete(event.pointerId);
    }
});
keyboard.addEventListener("pointercancel", (event) => {
    const key = pointerHolds.get(event.pointerId);

    if (key) {
        stopKey(key, `pointer:${event.pointerId}`);
        pointerHolds.delete(event.pointerId);
    }
});

octaveToggle.addEventListener("click", () => {
    stopAllKeys();
    visibleKeyCount = visibleKeyCount === 12 ? 36 : 12;
    octaveToggle.textContent = visibleKeyCount === 12 ? "+2 OCTAVES" : "12 KEYS";
    octaveToggle.setAttribute("aria-pressed", String(visibleKeyCount === 36));
    renderKeyboard();
});

volumeKnob.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    getAudioContext();
    isTurningVolume = true;
    volumeKnob.setPointerCapture(event.pointerId);
    lastKnobAngle = -135 + (volume * 2.7);
    setVolumeFromPointer(event);
    playVolumeClick(volume);
});

volumeKnob.addEventListener("pointermove", (event) => {
    if (isTurningVolume) {
        setVolumeFromPointer(event);
    }
});

volumeKnob.addEventListener("pointerup", (event) => {
    isTurningVolume = false;
    volumeKnob.releasePointerCapture(event.pointerId);
});

volumeKnob.addEventListener("pointercancel", () => {
    isTurningVolume = false;
});

volumeKnob.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp" || event.key === "ArrowRight") {
        event.preventDefault();
        setVolume(volume + 5, { click: true });
    }

    if (event.key === "ArrowDown" || event.key === "ArrowLeft") {
        event.preventDefault();
        setVolume(volume - 5, { click: true });
    }
});

window.addEventListener("keydown", (event) => {
    const key = keyMap.get(event.key.toLowerCase());

    if (!key || event.repeat) {
        return;
    }

    playKey(key, `keyboard:${event.key.toLowerCase()}`);
});

window.addEventListener("keyup", (event) => {
    const key = keyMap.get(event.key.toLowerCase());

    if (key) {
        stopKey(key, `keyboard:${event.key.toLowerCase()}`);
    }
});

window.addEventListener("blur", stopAllKeys);

waveSelector?.addEventListener("click", () => {
    currentWaveIndex = (currentWaveIndex + 1) % waves.length;
    const waveName = waves[currentWaveIndex].toUpperCase();
    waveSelector.innerHTML = `${waveName} WAVE<br><small>(CLICK ME)</small>`;
    waveSelector.blur();
});

updateKnobFace();
renderKeyboard();
