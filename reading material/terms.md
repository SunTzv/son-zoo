# Building Unsubscribe Nazism

This project explores "dark patterns" by constructing an intentionally restrictive user interface.

### 1. Structural Layout (HTML)
The architecture features three primary zones: a fixed header, a central scrolling container dominating the viewport, and a fixed bottom panel housing the agreement text, a checkbox, and a submit button.

### 2. Styling for Frustration (CSS)
The scrolling container uses `overflow-y: scroll` with a fixed height to trap dense text. The checkbox and submit button utilize a `.disabled` class by default, rendering them grayed out and visually communicating an inactive state.

### 3. The Constraint Logic (JavaScript)
JavaScript enforces the restrictive user flow.
- **Content Generation**: Upon initialization, a loop dynamically injects hundreds of paragraphs of generated text into the scrolling container, mandating extensive physical scrolling.
- **Scroll Monitoring**: A `scroll` event listener monitors the text container. A mathematical calculation compares the `scrollTop` (current scroll position) plus `clientHeight` (visible box height) against the `scrollHeight` (total internal height).
- **State Unlocking**: Checkbox interactions are blocked by default via an event listener. Only when the scroll calculation confirms the viewport has reached the absolute bottom of the container does a state variable unlock the checkbox for interaction.
- **Final Validation**: A secondary listener monitors the checkbox state. Once the scroll condition is satisfied and the box is checked, the `disabled` property is removed from the submit button, completing the interaction loop.
