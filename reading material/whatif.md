# Building What If??

What If?? integrates frontend web development with backend AI generation to produce dynamic historical timelines.

### 1. Structural Layout (HTML)
The interface is divided into two distinct views. The "Setup Panel" features a `<textarea>` for alternate history prompts and a submit button. The "Timeline Screen" serves as an initially empty container for rendering generated historical events.

### 2. Styling the Interface (CSS)
Utility classes (e.g., `.hidden`) manage the visual transition between the setup and timeline states. The timeline is styled using border properties to render a continuous vertical line, with padding applied to space out historical events resembling chronological nodes.

### 3. The Integration Engine (JavaScript)
JavaScript connects the user interface to an external AI service.
- **State Management**: Form submission extracts the input text, hides the setup screen, displays a "Simulating..." loading state, and locks the interface to prevent duplicate API requests.
- **API Communication**: An HTTP POST request is constructed. The input prompt is wrapped within a system instruction set, directing a Large Language Model (LLM) to act as a historian and return structured data (such as JSON) representing an array of sequential events.
- **Dynamic Rendering**: Upon receiving a successful response, the data payload is parsed. A rendering loop iterates through the generated events. For each item, new HTML structures (titles and descriptions) are created via DOM manipulation methods and appended into the Timeline Screen container, transforming raw API data into a formatted web page.
