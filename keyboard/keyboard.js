// --- AUDIO ENGINE --- //
let audioContext;
let masterGain;
let volume = 67;
const waves = ["sine", "square", "sawtooth", "triangle", "distortion"];
let currentWaveIndex = 0;
const activeNotes = new Map();
let isDistortion = false;
let visibleKeyCount = 12;

function getAudioContext() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        masterGain = audioContext.createGain();
        masterGain.gain.value = volumeToGain(volume);
        masterGain.connect(audioContext.destination);
    }
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
}

function volumeToGain(vol) { return (vol / 100) ** 1.7; }
function frequencyForStep(step) { return 261.63 * (2 ** (step / 12)); }
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

function playKeyAudio(noteKey, frequency, sourceId) {
    if (activeNotes.has(noteKey)) {
        activeNotes.get(noteKey).sources.add(sourceId);
        return;
    }
    const context = getAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const lfo = context.createOscillator();
    const lfoGain = context.createGain();

    isDistortion = waves[currentWaveIndex] === "distortion";
    oscillator.type = isDistortion ? "sawtooth" : waves[currentWaveIndex];
    oscillator.frequency.value = frequency;
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

    activeNotes.set(noteKey, { oscillator, gain, lfo, lfoGain, sources: new Set([sourceId]) });
}

function stopKeyAudio(noteKey, sourceId) {
    const activeNote = activeNotes.get(noteKey);
    if (!activeNote || !audioContext) return;
    activeNote.sources.delete(sourceId);
    if (activeNote.sources.size > 0) return;

    activeNote.gain.gain.cancelScheduledValues(audioContext.currentTime);
    activeNote.gain.gain.setValueAtTime(activeNote.gain.gain.value, audioContext.currentTime);
    activeNote.gain.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + 0.08);
    activeNote.oscillator.stop(audioContext.currentTime + 0.09);
    activeNote.lfo.stop(audioContext.currentTime + 0.09);

    activeNotes.delete(noteKey);
}

function stopAllKeys() {
    if (keyMeshes) {
        keyMeshes.forEach(m => {
            releaseKeyVisual(m);
            stopKeyAudio(m.userData.noteKey, 'pointer');
            stopKeyAudio(m.userData.noteKey, 'pc:' + m.userData.keyboardKey);
        });
    }
}

// --- THREE.JS ENGINE --- //
const canvas = document.querySelector('#three-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.LinearToneMapping;
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020205);
scene.fog = new THREE.FogExp2(0x020205, 0.015);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 200);

// OrbitControls
const controls = new THREE.OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.05; // Don't go below floor
controls.minDistance = 5;
controls.maxDistance = 60;
controls.enablePan = false; // Disable panning (moving)
controls.mouseButtons = {
    LEFT: 99, // Disable orbit controls on left click
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.ROTATE // Map rotate to right click
};

// Lighting
const ambientLight = new THREE.AmbientLight(0x404055, 0.2);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffeedd, 0.5);
dirLight.position.set(5, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 2048;
dirLight.shadow.mapSize.height = 2048;
dirLight.shadow.bias = -0.0005;
scene.add(dirLight);

const fillLight = new THREE.DirectionalLight(0x6688aa, 0.4);
fillLight.position.set(-15, 10, -15);
scene.add(fillLight);

// Stage Floor (Reflective grid)
const gridHelper = new THREE.GridHelper(200, 100, 0x00ffcc, 0x111122);
gridHelper.position.y = -2;
scene.add(gridHelper);

const floorGeo = new THREE.PlaneGeometry(200, 200);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0x050510,
    roughness: 0.1,
    metalness: 0.8
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.1;
floor.receiveShadow = true;
scene.add(floor);

// --- NOTE STREAM VISUALIZER --- //
const noteStreams = [];
const streamSpeed = 25.0; // units per second

function createNoteStream(keyMesh) {
    if (keyMesh.userData.activeStream) {
        keyMesh.userData.activeStream.active = false;
    }
    
    const isBlack = keyMesh.userData.isBlack;
    const width = isBlack ? 0.4 : 0.7;
    const depth = 0.2;
    
    const geom = new THREE.BoxGeometry(width, 1, depth);
    const c = new THREE.Color().setHSL(keyMesh.userData.hue, 0.8, 0.65);
    
    const mat = new THREE.MeshBasicMaterial({
        color: c,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const streamMesh = new THREE.Mesh(geom, mat);
    const worldPos = new THREE.Vector3();
    keyMesh.getWorldPosition(worldPos);
    
    const startY = 0.2; // Start inside the chassis
    const startZ = -3.5; // Gap behind keys
    
    streamMesh.position.set(worldPos.x, startY, startZ);
    streamMesh.scale.y = 0.01;
    scene.add(streamMesh);
    
    const streamData = {
        mesh: streamMesh,
        active: true,
        startY: startY,
        startTime: performance.now()
    };
    
    keyMesh.userData.activeStream = streamData;
    noteStreams.push(streamData);
}

function releaseNoteStream(keyMesh) {
    if (keyMesh.userData.activeStream) {
        keyMesh.userData.activeStream.active = false;
        keyMesh.userData.activeStream = null;
    }
}

// Dynamic Key Lights
const keyLights = [];
for (let i = 0; i < 10; i++) {
    const light = new THREE.PointLight(0x00ffcc, 0, 30);
    scene.add(light);
    keyLights.push({ light, activeTime: 0 });
}

function flashKeyLight(x, z, isBlack, hue) {
    const availableLight = keyLights.find(kl => kl.light.intensity <= 0.1) || keyLights[0];
    availableLight.light.color.setHSL(hue, 0.8, 0.65);
    availableLight.light.position.set(x, isBlack ? 2 : 1, z);
    availableLight.light.intensity = 15;
    availableLight.activeTime = performance.now();
}

// Materials
const chassisMat = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.5, metalness: 0.7 });
const panelMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.2, metalness: 0.9 });
const whiteKeyMat = new THREE.MeshStandardMaterial({ color: 0xcccccc, emissive: 0x222222, roughness: 0.1, metalness: 0.1 });
const blackKeyMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.3 });
const uiBtnMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.6, metalness: 0.4 });
const uiBtnActiveMat = new THREE.MeshStandardMaterial({ color: 0x00ffcc, emissive: 0x00ffcc, emissiveIntensity: 2 });
const knobMat = new THREE.MeshStandardMaterial({ color: 0x000000, roughness: 0.4, metalness: 0.8 });

// Groups
const keyboardGroup = new THREE.Group();
scene.add(keyboardGroup);

// Keyboard Geometry
const keyMeshes = [];
const chassisParts = [];
let uiGroup;
let volumeKnob, waveBtn, octBtn;

const keyboardKeys = [
    "a", "w", "s", "e", "d", "f", "t", "g", "y", "h", "u", "j",
    "k", "o", "l", "p", ";", "'", "]", "\\", "z", "x", "c", "v",
    "b", "n", "m", ",", ".", "/", "1", "2", "3", "4", "5", "6"
];
const IS_BLACK = [false, true, false, true, false, false, true, false, true, false, true, false];

function buildKeyboard(numKeys) {
    chassisParts.forEach(mesh => keyboardGroup.remove(mesh));
    chassisParts.length = 0;
    keyMeshes.forEach(mesh => keyboardGroup.remove(mesh));
    keyMeshes.length = 0;
    if (uiGroup) keyboardGroup.remove(uiGroup);

    const keyWidth = 1.0;
    const keySpacing = 0.08;
    const wKeyLength = 6.0;
    const bKeyLength = 3.2;
    const wKeyHeight = 1.0;
    const bKeyHeight = 1.4;

    let numWhiteKeys = 0;
    for (let i = 0; i < numKeys; i++) {
        if (!IS_BLACK[i % 12]) numWhiteKeys++;
    }

    const keysTotalWidth = numWhiteKeys * (keyWidth + keySpacing) - keySpacing;
    const totalWidth = keysTotalWidth + 2; // padding on each side
    const chassisDepth = wKeyLength + 5;

    // Camera
    const targetZ = numKeys === 36 ? 30 : 20;
    const targetY = numKeys === 36 ? 25 : 15;
    camera.position.set(0, targetY, targetZ);
    controls.target.set(0, 0, 0);
    controls.update();

    // Chassis Base
    const baseGeom = new THREE.BoxGeometry(totalWidth, 3, chassisDepth);
    const baseMesh = new THREE.Mesh(baseGeom, chassisMat);
    baseMesh.position.set(0, -1.5, 0.5);
    baseMesh.castShadow = true;
    baseMesh.receiveShadow = true;
    keyboardGroup.add(baseMesh);
    chassisParts.push(baseMesh);

    // Chassis Control Panel (slanted at the back)
    const panelGeom = new THREE.BoxGeometry(totalWidth, 3, 4);
    const panelMesh = new THREE.Mesh(panelGeom, panelMat);
    panelMesh.position.set(0, 0.5, -wKeyLength / 2 - 1.5);
    panelMesh.rotation.x = Math.PI / 8; // Slanted towards user
    panelMesh.castShadow = true;
    panelMesh.receiveShadow = true;
    keyboardGroup.add(panelMesh);
    chassisParts.push(panelMesh);

    // Keys
    const startX = -(keysTotalWidth / 2) + (keyWidth / 2);
    let whiteIndex = 0;

    for (let i = 0; i < numKeys; i++) {
        const isBlack = IS_BLACK[i % 12];
        const geom = new THREE.BoxGeometry(
            isBlack ? keyWidth * 0.6 : keyWidth,
            isBlack ? bKeyHeight : wKeyHeight,
            isBlack ? bKeyLength : wKeyLength
        );

        // Pivot at the bottom-back
        geom.translate(0, (isBlack ? bKeyHeight : wKeyHeight) / 2, (isBlack ? bKeyLength : wKeyLength) / 2);

        const mesh = new THREE.Mesh(geom, isBlack ? blackKeyMat.clone() : whiteKeyMat.clone());
        mesh.castShadow = true;
        mesh.receiveShadow = true;

        let xPos;
        if (!isBlack) {
            xPos = startX + whiteIndex * (keyWidth + keySpacing);
            whiteIndex++;
        } else {
            xPos = startX + (whiteIndex - 1) * (keyWidth + keySpacing) + (keyWidth + keySpacing) / 2;
        }

        const yPos = isBlack ? 0.1 : 0;
        // Shift black keys slightly forward (0.85 units) so their back edges align visually 
        // with the white keys despite the 3D perspective and height difference.
        const zPos = isBlack ? -wKeyLength / 2 + 1.2 : -wKeyLength / 2;

        mesh.position.set(xPos, yPos, zPos);

        const hue = (i % 12) / 12;
        mesh.userData = {
            noteKey: String(i),
            frequency: frequencyForStep(i),
            isBlack,
            originalY: yPos,
            keyboardKey: i < keyboardKeys.length ? keyboardKeys[i] : null,
            hue: hue
        };

        keyboardGroup.add(mesh);
        keyMeshes.push(mesh);
    }

    // UI Group as child of slanted panel
    uiGroup = new THREE.Group();
    uiGroup.position.set(0, 1.5, 0); // sit on top of the panel surface
    panelMesh.add(uiGroup);

    // Volume Knob
    const knobGeom = new THREE.CylinderGeometry(0.8, 0.8, 0.5, 32);
    volumeKnob = new THREE.Mesh(knobGeom, knobMat);
    volumeKnob.position.set(-totalWidth / 2 + 2, 0.25, 0);
    volumeKnob.castShadow = true;

    const indGeom = new THREE.BoxGeometry(0.1, 0.6, 0.8);
    const indMesh = new THREE.Mesh(indGeom, uiBtnActiveMat);
    indMesh.position.set(0, 0.1, 0.3);
    volumeKnob.add(indMesh);
    volumeKnob.userData = { type: 'volume' };
    uiGroup.add(volumeKnob);

    // Wave Button
    const btnGeom = new THREE.BoxGeometry(2, 0.2, 1.2);
    waveBtn = new THREE.Mesh(btnGeom, uiBtnMat);
    waveBtn.position.set(-totalWidth / 2 + 5, 0.1, 0);
    waveBtn.castShadow = true;
    waveBtn.userData = { type: 'wave' };
    uiGroup.add(waveBtn);

    // Octave Button
    const octBtnGeo = new THREE.BoxGeometry(4, 0.5, 2);
    octBtn = new THREE.Mesh(octBtnGeo, uiBtnMat);
    octBtn.position.set(totalWidth / 2 - 4.5, 0.25, 0);
    octBtn.castShadow = true;
    octBtn.userData = { type: 'octave' };
    uiGroup.add(octBtn);
    
    // USB Drive / MIDI Loader
    const usbGroup = new THREE.Group();
    usbGroup.position.set(totalWidth / 2 - 1, 0.15, 0); // Right side of the panel
    
    // USB plastic body
    const usbBodyGeo = new THREE.BoxGeometry(1.0, 0.4, 1.8);
    const usbBody = new THREE.Mesh(usbBodyGeo, uiBtnMat);
    usbGroup.add(usbBody);
    
    // USB metal connector (sticking into the synth)
    const usbMetalGeo = new THREE.BoxGeometry(0.7, 0.15, 0.6);
    const usbMetalMat = new THREE.MeshStandardMaterial({ color: 0x999999, metalness: 1.0, roughness: 0.2 });
    const usbMetal = new THREE.Mesh(usbMetalGeo, usbMetalMat);
    usbMetal.position.set(0, -0.05, -1.2);
    usbGroup.add(usbMetal);

    // USB glow strip (indicator)
    const usbGlowGeo = new THREE.BoxGeometry(0.8, 0.45, 0.3);
    const usbGlowMat = new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0x000000, emissiveIntensity: 2 });
    usbGlowMesh = new THREE.Mesh(usbGlowGeo, usbGlowMat);
    usbGlowMesh.position.z = 0.6;
    usbGroup.add(usbGlowMesh);
    
    // Add invisible hit box for easier clicking
    const hitBoxGeo = new THREE.BoxGeometry(2.5, 2, 3);
    const hitBoxMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const usbHitBox = new THREE.Mesh(hitBoxGeo, hitBoxMat);
    usbHitBox.userData = { type: 'usb' };
    usbGroup.add(usbHitBox);
    
    uiGroup.add(usbGroup);

    updateKnobRotation();
}

let usbGlowMesh = null;

function updateKnobRotation() {
    if (!volumeKnob) return;
    const angle = ((volume / 100) * 270) - 135;
    volumeKnob.rotation.y = -angle * (Math.PI / 180);
}

buildKeyboard(visibleKeyCount);

// --- INTERACTION --- //
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointerIdHeld = null;
let currentKeyMeshHeld = null;
let isTurningVolume = false;
let lastPointerY = 0;

function getIntersect(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([...keyMeshes, ...uiGroup.children], true);
    return intersects.length > 0 ? intersects[0].object : null;
}

function pressKeyVisual(mesh) {
    mesh.rotation.x = 0.08;
    
    // Store original properties if not stored
    if (mesh.userData.originalColor === undefined) {
        mesh.userData.originalColor = mesh.material.color.getHex();
        mesh.userData.originalRoughness = mesh.material.roughness;
        mesh.userData.originalEmissive = mesh.material.emissive.getHex();
    }
    
    // Soft color based on note hue
    mesh.material.color.setHSL(mesh.userData.hue, 0.8, 0.65);
    mesh.material.emissive.setHSL(mesh.userData.hue, 0.8, 0.65);
    mesh.material.emissiveIntensity = 1.5;
    
    // Drop roughness to make it super glossy like wet plastic or glass
    mesh.material.roughness = 0.05;

    const worldPos = new THREE.Vector3();
    mesh.getWorldPosition(worldPos);
    flashKeyLight(worldPos.x, worldPos.z + 2, mesh.userData.isBlack, mesh.userData.hue);
    
    createNoteStream(mesh);
}

function releaseKeyVisual(mesh) {
    mesh.rotation.x = 0;
    if (mesh.userData.originalColor !== undefined) {
        mesh.material.color.setHex(mesh.userData.originalColor);
        mesh.material.roughness = mesh.userData.originalRoughness;
        mesh.material.emissive.setHex(mesh.userData.originalEmissive);
        mesh.material.emissiveIntensity = 1.0;
    }
    releaseNoteStream(mesh);
}

function handlePointerDown(event) {
    // Only allow left click (button 0) for mouse interactions to play the piano
    if (event.pointerType === 'mouse' && event.button !== 0) return;

    getAudioContext();
    const hit = getIntersect(event);
    if (!hit) return;

    if (hit.userData.noteKey !== undefined) {
        pointerIdHeld = event.pointerId;
        currentKeyMeshHeld = hit;
        pressKeyVisual(hit);
        playKeyAudio(hit.userData.noteKey, hit.userData.frequency, 'pointer');
    } else if (hit.userData.type === 'volume') {
        controls.enabled = false;
        isTurningVolume = true;
        lastPointerY = event.clientY;
    } else if (hit.userData.type === 'wave') {
        hit.position.y = -0.1;
        hit.material = uiBtnActiveMat;
        setTimeout(() => {
            hit.position.y = 0;
            hit.material = uiBtnMat;
        }, 150);
        currentWaveIndex = (currentWaveIndex + 1) % waves.length;
    } else if (hit.userData.type === 'octave') {
        hit.position.y = -0.1;
        hit.material = uiBtnActiveMat;
        setTimeout(() => {
            hit.position.y = 0;
            hit.material = uiBtnMat;
            stopAllKeys();
            visibleKeyCount = visibleKeyCount === 12 ? 36 : 12;
            buildKeyboard(visibleKeyCount);
        }, 150);
    } else if (hit.userData.type === 'usb') {
        const midiInput = document.getElementById('midi-upload');
        if (midiInput) midiInput.click();
        
        if (usbGlowMesh) {
            usbGlowMesh.material.emissive.setHex(0x00ffcc);
            setTimeout(() => {
                if (!isPlayingMidi) usbGlowMesh.material.emissive.setHex(0x000000);
            }, 200);
        }
    }
}

function handlePointerMove(event) {
    if (isTurningVolume) {
        const deltaY = lastPointerY - event.clientY;
        lastPointerY = event.clientY;
        volume = Math.max(0, Math.min(100, volume + deltaY * 0.5));
        setVolume(volume);
        updateKnobRotation();
        return;
    }

    if (pointerIdHeld === event.pointerId) {
        const hit = getIntersect(event);
        if (hit && hit.userData.noteKey !== undefined && hit !== currentKeyMeshHeld) {
            if (currentKeyMeshHeld) {
                releaseKeyVisual(currentKeyMeshHeld);
                stopKeyAudio(currentKeyMeshHeld.userData.noteKey, 'pointer');
            }
            currentKeyMeshHeld = hit;
            pressKeyVisual(currentKeyMeshHeld);
            playKeyAudio(currentKeyMeshHeld.userData.noteKey, currentKeyMeshHeld.userData.frequency, 'pointer');
        } else if (!hit || hit.userData.noteKey === undefined) {
            if (currentKeyMeshHeld) {
                releaseKeyVisual(currentKeyMeshHeld);
                stopKeyAudio(currentKeyMeshHeld.userData.noteKey, 'pointer');
                currentKeyMeshHeld = null;
            }
        }
    }
}

function handlePointerUp(event) {
    if (isTurningVolume) {
        isTurningVolume = false;
        controls.enabled = true;
    }
    if (pointerIdHeld === event.pointerId) {
        if (currentKeyMeshHeld) {
            releaseKeyVisual(currentKeyMeshHeld);
            stopKeyAudio(currentKeyMeshHeld.userData.noteKey, 'pointer');
        }
        pointerIdHeld = null;
        currentKeyMeshHeld = null;
    }
}

window.addEventListener('pointerdown', handlePointerDown, { capture: true });
window.addEventListener('pointermove', handlePointerMove, { capture: true });
window.addEventListener('pointerup', handlePointerUp, { capture: true });
window.addEventListener('pointercancel', handlePointerUp, { capture: true });
window.addEventListener('contextmenu', event => {
    event.preventDefault();
    event.stopPropagation();
}, { capture: true }); // Prevent right-click menu and block site.js custom menu

function setVolume(nextVolume) {
    volume = nextVolume;
    if (audioContext && masterGain) {
        masterGain.gain.setTargetAtTime(volumeToGain(volume), audioContext.currentTime, 0.015);
    }
}

window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const keyStr = event.key.toLowerCase();
    const mesh = keyMeshes.find(m => m.userData.keyboardKey === keyStr);
    if (mesh) {
        pressKeyVisual(mesh);
        playKeyAudio(mesh.userData.noteKey, mesh.userData.frequency, 'pc:' + keyStr);
    }
});

window.addEventListener('keyup', (event) => {
    const keyStr = event.key.toLowerCase();
    const mesh = keyMeshes.find(m => m.userData.keyboardKey === keyStr);
    if (mesh) {
        releaseKeyVisual(mesh);
        stopKeyAudio(mesh.userData.noteKey, 'pc:' + keyStr);
    }
});

window.addEventListener('blur', stopAllKeys);

const loadingEl = document.getElementById('loading-overlay');
if (loadingEl) loadingEl.style.display = 'none';

// Render loop
let lastTime = performance.now();

function animate() {
    requestAnimationFrame(animate);
    controls.update();

    const now = performance.now();
    const delta = (now - lastTime) / 1000;
    lastTime = now;

    // Dim dynamic lights smoothly
    keyLights.forEach(kl => {
        if (kl.light.intensity > 0) {
            const elapsed = now - kl.activeTime;
            kl.light.intensity = Math.max(0, 15 - (elapsed / 25)); // fades out in ~375ms
        }
    });

    // --- MIDI SEQUENCER --- //
    if (isPlayingMidi && parsedMidiNotes) {
        const currentMidiTime = (now - midiStartTime) / 1000;
        
        // Trigger notes that should start
        while (currentMidiNoteIndex < parsedMidiNotes.length && parsedMidiNotes[currentMidiNoteIndex].time <= currentMidiTime) {
            const note = parsedMidiNotes[currentMidiNoteIndex];
            currentMidiNoteIndex++;
            
            // Map MIDI note (60 = C4) to our keyboard array index (starts at C4)
            const keyIndex = note.midi - 60;
            if (keyIndex >= 0 && keyIndex < visibleKeyCount) {
                const mesh = keyMeshes[keyIndex];
                if (mesh) {
                    pressKeyVisual(mesh);
                    playKeyAudio(mesh.userData.noteKey, mesh.userData.frequency, 'midi_' + note.midi + '_' + currentMidiNoteIndex);
                    
                    activeMidiNotes.push({
                        mesh: mesh,
                        noteKey: mesh.userData.noteKey,
                        sourceId: 'midi_' + note.midi + '_' + currentMidiNoteIndex,
                        releaseTime: note.time + note.duration
                    });
                }
            }
        }
        
        // Release notes that should end
        for (let i = activeMidiNotes.length - 1; i >= 0; i--) {
            const activeNote = activeMidiNotes[i];
            if (currentMidiTime >= activeNote.releaseTime) {
                releaseKeyVisual(activeNote.mesh);
                stopKeyAudio(activeNote.noteKey, activeNote.sourceId);
                activeMidiNotes.splice(i, 1);
            }
        }
        
        // Check if finished
        if (currentMidiNoteIndex >= parsedMidiNotes.length && activeMidiNotes.length === 0) {
            isPlayingMidi = false;
            console.log("MIDI Playback finished.");
            if (usbGlowMesh) {
                usbGlowMesh.material.emissive.setHex(0x000000); // Turn off light
            }
        }
    }

    // Update Note Streams
    for (let i = noteStreams.length - 1; i >= 0; i--) {
        const stream = noteStreams[i];
        if (stream.active) {
            const height = ((now - stream.startTime) / 1000) * streamSpeed;
            const h = Math.max(0.1, height);
            stream.mesh.scale.y = h;
            stream.mesh.position.y = stream.startY + h / 2;
        } else {
            // Move up
            stream.mesh.position.y += streamSpeed * delta;
        }
        
        // Remove if off screen
        if (stream.mesh.position.y > 100) {
            scene.remove(stream.mesh);
            stream.mesh.geometry.dispose();
            stream.mesh.material.dispose();
            noteStreams.splice(i, 1);
        }
    }

    renderer.render(scene, camera);
}

// --- MIDI PARSING SETUP --- //
let parsedMidiNotes = null;
let currentMidiNoteIndex = 0;
let midiStartTime = 0;
let isPlayingMidi = false;
const activeMidiNotes = [];

const midiUploadInput = document.getElementById('midi-upload');
if (midiUploadInput) {
    midiUploadInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        getAudioContext();
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            let midi;
            if (typeof Midi === "function") {
                midi = new Midi(arrayBuffer);
            } else if (typeof window !== 'undefined' && window.Midi && typeof window.Midi.Midi === "function") {
                midi = new window.Midi.Midi(arrayBuffer);
            } else {
                throw new Error("Midi parser not found");
            }
            
            // Flatten all tracks into a single note array
            parsedMidiNotes = [];
            midi.tracks.forEach(track => {
                track.notes.forEach(note => {
                    parsedMidiNotes.push(note);
                });
            });
            
            // Sort chronologically
            parsedMidiNotes.sort((a, b) => a.time - b.time);
            
            // Stop any currently playing MIDI
            activeMidiNotes.forEach(activeNote => {
                releaseKeyVisual(activeNote.mesh);
                stopKeyAudio(activeNote.noteKey, activeNote.sourceId);
            });
            activeMidiNotes.length = 0;
            stopAllKeys();
            
            // Start playback
            currentMidiNoteIndex = 0;
            midiStartTime = performance.now();
            isPlayingMidi = true;
            
            if (usbGlowMesh) {
                usbGlowMesh.material.emissive.setHex(0xff00ff); // Glow magenta while playing!
            }
            
            console.log(`Loaded MIDI file: ${file.name} with ${parsedMidiNotes.length} notes.`);
        } catch (error) {
            console.error("Error parsing MIDI file:", error);
            alert("Could not read MIDI file. Is it a valid .mid or .midi file?");
        }
        
        // Reset input so they can upload the same file again if they want
        event.target.value = '';
    });
}

animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
