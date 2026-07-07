# Building Gas is Lighter

Gas is Lighter combines frontend state management and real-time backend API integration with an AI model.

### 1. Structural Architecture (HTML)
The application is a single-page layout consisting of layered screens: a start screen, a loading screen to mask API latency, a main split-pane interface (an MS Paint canvas view alongside a chat interface), and a game-over modal overlay.

### 2. UI and Animations (CSS)
Visibility toggles manage screen transitions. A "Confidence Meter" is styled as a progress bar mimicking a sunset. CSS transitions smoothly animate changes to the progress bar's width and background color in response to backend confidence scores, visually transitioning from morning (100%) to night (0%).

### 3. Frontend Engine (JavaScript)
Client-side JavaScript orchestrates the user experience and state.
- **State Management**: Variables tracking attempts remaining, the target object, and the current confidence score are maintained in memory.
- **Loading Mini-game**: A standalone clicker game operates independently on the loading screen to maintain engagement during network request latency.
- **Chat Interface**: The DOM is dynamically updated to display real-time chat logs. Input submission locks the text field and displays a typing indicator to prevent duplicate requests.

### 4. Backend AI Integration
The core logic loop relies on external AI processing.
- **Payload Construction**: Argument submission packages the input text, the target object data, and context regarding the drawing into a structured payload.
- **The System Prompt**: A system prompt directs the backend AI to roleplay as a skeptical professor. The instructions mandate evaluating the argument based on logic and persistence.
- **Data Parsing**: The AI returns structured JSON containing a text response and a numerical confidence score.
- **The Resolution Loop**: The frontend receives the API response, extracts the score and text, updates the CSS width of the confidence meter, deducts an attempt, and injects the dialogue into the chat log. This cycle repeats until the confidence reaches 0 (success) or attempts are exhausted (failure).
