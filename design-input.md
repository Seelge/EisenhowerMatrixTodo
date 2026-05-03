# Design input
This design document contains the design input for the application.

The design input is intended for the prompt to create the initial implementation plan.

## Backend
- The backend should be configurable with a generic interface such that we can switch between backend storages
- Intended backend storages: in-memory for testing, Goolge Tasks API, Microsoft To-Do API
- For each backend storage we need to know how to store the required information, e.g. due date, priority, etc. and how to map these between the backends

## Technology
- A web app which is usable in Chrome on both Android and Windows
- The web app should be installable on Android

## UI Design
- Minimal futuristic design. Dark background, glowing borders.
- UI design should follow the Google recommendations for Android apps

### View 1 Eisenhower matrix
- There should be a view with all four quadrants of the Eisenhower matrix
- When zoomed out, moving to-dos between the Eisenhower matrix quadrants should be a simple drag and drop action

### View 2 Quadrant
- Each quadrant should use a different colored border
- When zoomed in, moving between quadrants should be a touch swipe or mouse drag and move
- When zoomed in, the border of the current quadrant should be visible. Also the edges of the neighboring quadrants should be visible.
- When zoomed in, moving to-dos between the quadrants should be a drag and drop on the visible edge of the neighboring quadrant. The current quadrant should stay focussed.

### Transition between View 1 Eisenhower matrix and View 2 Quadrant
- It should be possible to switch between looking at the full Eisenhower matrix or a single quadrant
- Switching between the Eisenhower matrix and focussing on a single quadrant should be like zooming in to a quadrant or out to the matrix. The animation snaps to either zoomed in or zoomed out, nothing in between
- To zoom in/out, the user should use the touch pinch gesture or mouse wheel

### View 3 Task focus
- Tapping or clicking on a task should focus the task.
- Moving a due date of a task to today or tomorrow should be a 1-tap/click action each

### View 4 Options
- There should be an options screen with potential sub-screens, e.g. to configure the backend

## Planning instruction
- You are the expert, create the plan on how to implement
- Implementation should consider that we want to switch and sync between different backend storages, and we need to know how to map to each interface, but we initially start to implement just one: the in memory backend for testing
- Prepare such that different parts (e.g. UI design, frontend, backend) can be implemented using different agents with potentially different models. Propose a model suitable to the task
