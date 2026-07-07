# Building Keyboard

The Keyboard project connects a visual interface to audio playback without external libraries.

### 1. Structural Layout (HTML)
A main container element houses exactly 12 `div` elements, representing a single piano octave containing white and black keys. Each HTML element maps to a specific musical note via data attributes.

### 2. Styling the Instrument (CSS)
Absolute positioning and `z-index` properties overlay the black keys on top of the gaps between the white keys. An `.active` class applies a slight scale reduction and a drop shadow, visually simulating a physical key depression during interaction.

### 3. Core Audio Engine (JavaScript)
JavaScript serves as the bridge between visual input and audio output.
- **Audio Loading**: Twelve distinct `.mp3` or `.wav` files are loaded into HTML Audio objects.
- **Input Mapping**: A dictionary object maps physical keyboard strokes to specific musical notes for ergonomic playability.
- **Event Listeners**: Interactions are captured via `mousedown` and `mouseup` events for pointer devices, alongside `keydown` and `keyup` events for physical keyboards.
- **Playback Logic**: Rapid, repeated playback requires specific handling. Upon key activation, the corresponding audio object's `currentTime` is instantly reset to `0`. This interrupts any ongoing playback of that specific note and restarts it immediately, achieving responsive polyphony. Simultaneously, the `.active` CSS class is toggled to trigger visual feedback.
