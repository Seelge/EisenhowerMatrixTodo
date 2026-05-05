# Design input

This design document contains the design input for the application.

The design input is intended for the prompt to create the initial implementation plan.

*Naming convention: `view1`, `view2`, `view3`, `view4` refer to the four views of the app. "First release" / "later release" refers to product milestones (avoiding `v1` / `v2` to prevent confusion with view names).*

## Backend

- The backend is configurable via a generic adapter interface so we can switch between storages.
- User-facing backends: **local (IndexedDB)**, **Google Tasks API**, **Microsoft To-Do API**.
- An additional **in-memory** adapter exists as a test fixture only (contract reference for unit tests). It is not exposed in the UI.
- Adapter operations every backend must implement: `list(quadrant?)`, `get(id)`, `create(task)`, `update(id, patch)`, `delete(id)`, `changesSince(cursor)` (for sync).
- **Quadrant storage** for backends with no native concept: one list per quadrant (Google Tasks: 4 task lists; Microsoft To-Do: 4 lists). Cross-quadrant move = delete + recreate. Tradeoff accepted: clean UX in the native apps, at the cost of regenerating IDs on move.
- **Unsupported fields** (priority on Google Tasks, due time on Google Tasks, etc.): encoded into `notes` by the adapter and decoded again on read by the same adapter, so the canonical model round-trips losslessly through any backend.
- **Multi-backend behavior**: each task is associated with exactly one backend. Editing a task lets the user pick a target backend; on migration the task is created in the target and, on success, deleted from the source. (Same model as calendar apps choosing a target calendar per event.)
- **Conflict resolution** when an external client modified a task we also modified: prompt the user with a side-by-side diff and let them pick the local or remote whole record.
- **Authentication**: OAuth 2.0 PKCE in-browser. Refresh tokens stored in IndexedDB (origin-isolated). Single account per backend.
- **Offline behavior**: local-first. Writes commit to IndexedDB immediately and queue for sync; reads are served from local cache; sync replays on focus / online events.

### Canonical task model and field mapping

| Field | Canonical | Google Tasks | Microsoft To-Do |
|---|---|---|---|
| id | string | `id` | `id` |
| title | string (required) | `title` | `title` |
| notes | markdown string | `notes` (plain) | `body.content` |
| due date | ISO date | `due` (date only) | `dueDateTime` |
| due time | ISO time, optional | not supported → encoded in `notes` | `dueDateTime` |
| priority | none / low / normal / high | not supported → encoded in `notes` | `importance` |
| quadrant | Q1–Q4 | encoded via list (one list per quadrant) | encoded via list (one list per quadrant) |
| status | open / done | `status` | `status` |
| completedAt | ISO datetime | `completed` | `completedDateTime` |
| createdAt | ISO datetime | `updated` only | `createdDateTime` |
| updatedAt | ISO datetime | `updated` | `lastModifiedDateTime` |

*Recurrence is not in the first release; when introduced, follow-up tasks are materialized at completion time (Google Tasks has no native recurrence).*

## Technology

- A web app, usable in Chrome on Android and Windows. Compatibility with Linux and Apple is out of scope.
- Installable on Android as a **PWA** (manifest, service worker, offline support, icons 192 / 512 + maskable).
- Distribution is manual installation only. Site served over HTTPS from **GitHub Pages**.
  - *Action for the user: enable GitHub Pages on the target repo when we are ready to publish. The plan will specify the source branch / folder.*
- **Framework / tooling** (committed): TypeScript everywhere; **React 18 + Vite** for the app; **Zustand** for app state; **TanStack Query** for server cache and sync orchestration; **dnd-kit** for accessible drag-and-drop (touch + mouse + keyboard); **Framer Motion** for animation; **Vitest + Playwright** for testing; **pnpm workspaces** for the monorepo. The planning step may revise on documented justification (maintainability and ease of adding features later are the deciding criteria).

## UI Design

- Minimal futuristic design. Dark background, glowing borders. Dark mode only in the first release; light mode later.
- UI follows **Material 3 behaviors** (touch targets ≥ 48 dp, ripple, motion durations, type scale) but overrides the M3 color system with the palette below. No MUI / M3 component library.
- **Accessibility**: WCAG 2.2 AA contrast, full keyboard navigation, drag-and-drop has a keyboard alternative ("move to" menu), `prefers-reduced-motion: reduce` replaces zoom morph with instant cuts, ARIA labels on all icon-only controls.
- **Internationalization**: user-facing strings wrapped in an `i18n` helper from day one. English only in the first release.

### Color palette

- Background: `#0A0E14`
- Surface: `#121821`
- Text primary: `#E6EDF3`; secondary: `#8B96A5`
- Accent (focus, active): `#7DF9FF` electric cyan
- Q1 Do (urgent + important): `#FF4D6D` red glow
- Q2 Schedule (important, not urgent): `#7DF9FF` cyan glow
- Q3 Delegate (urgent, not important): `#FFD166` amber glow
- Q4 Delete (neither): `#8B96A5` muted gray glow

### view1 — Eisenhower matrix

- Shows all four quadrants.
- Quadrants are labeled with the short verbs **Do** / **Schedule** / **Delegate** / **Delete**. Faint axis labels ("Important ↑", "Urgent →") on the outer edges; hidden in view2.
- Each task card displays title, full due date, priority, and tags.
- Each quadrant cell scrolls vertically and independently.
- **Default sort within a quadrant**: manual (drag-to-reorder), with due date as the secondary order when no manual order is set. A "reset to secondary order" action is available.
- Drag-and-drop moves tasks between quadrants.
- A floating "+" button (bottom-right) opens a quick composer; the user picks the quadrant from a 2 × 2 mini-matrix.

### view2 — Quadrant

- Each quadrant uses a different colored border (see palette).
- The current quadrant's border is fully visible; ~24 px strips on each shared edge represent the neighboring quadrants and light up during a drag.
- Move tasks between quadrants by dragging onto a visible neighbor edge; the current quadrant stays focused.
- Move between quadrants (changing focus) by touch swipe or mouse drag.
- A FAB (bottom-right) adds a task into the focused quadrant.
- **Empty quadrant**: rendered as normal with an "empty" note in muted grey (no illustration).

### Transition between view1 and view2

- Switching between view1 and view2 is a zoom; the animation snaps to one of the two states with nothing in between.
- **Touch**: pinch zooms in/out. Pinch-in from view1 zooms into the quadrant under the pinch midpoint at gesture start. Pinch-out from view2 returns to view1 with the previously-focused quadrant briefly highlighted.
- **Mouse**: plain wheel scrolls within the focused quadrant; **`Ctrl + wheel`** toggles zoom.
- **Keyboard**: `Esc` zooms out from view2 (or closes view3); `Enter` on a focused quadrant zooms in; arrow keys move focus between quadrants; `+` / `-` zoom.

### view3 — Task focus

- Tapping or clicking a task opens view3.
- **Presentation**: bottom sheet on mobile, ~480 px right-side panel on desktop. Does not fully obscure the underlying matrix.
- **All fields editable**: title, notes (markdown), due date, due time (optional), priority, quadrant, status, target backend. Fields the active backend can't represent natively are kept (encoded in notes by the adapter) and flagged with an info icon in this view.
- Subtasks: skipped for now.
- Recurrence: deferred to a later release.
- **Quadrant change**: small 2 × 2 picker with the current quadrant highlighted.
- **Due-date editing**: native date picker + quick-pick row "Today" / "Tomorrow" / "This weekend" / "Next week" / "No date". Today and Tomorrow are 1-tap each.
- **Complete**: instant toggle. **Delete**: trash icon with a 5-second undo snackbar; no modal confirmation.
- Closing view3 returns to whichever view (view1 or view2) was visible when it opened.

### view4 — Options

Top-level groups:

1. **Backends** — connect / disconnect, default backend for new tasks, sync status
2. **Account** — connected identity per backend, sign out
3. **Appearance** — theme (locked to dark in the first release), per-quadrant color overrides
4. **Defaults** — default quadrant for new tasks, default sort
5. **Data** — export JSON, import JSON, clear local cache
6. **About** — version, build, source link

### First-run flow

- Start in the **local (IndexedDB) backend**, prepopulated with three sample tasks so the UI is immediately usable.
- A dismissible banner suggests connecting Google Tasks or Microsoft To-Do.

### Cross-cutting UX

- Reminders / notifications are deferred — the first release ships without them.
- **Time zones**: dates are stored with the user's local zone offset at creation and displayed in the user's current local zone. No multi-zone awareness in the first release.
- **Loading / error / empty states** are part of the design system: skeleton loaders for lists, inline error banner with retry for failed sync, standardized empty-state pattern.
- **Telemetry**: none in the first release.

## Planning instruction

- You are the expert; create the implementation plan.
- Implement only the **local (IndexedDB) backend** first. The adapter interface, the field mapping table, and the conflict-resolution UX must be designed up-front so the Google Tasks and Microsoft To-Do adapters can be added later without churn.
- Prepare the plan so different parts (UI design system, app shell, view1 / view2 + zoom, view3, view4, backend adapters, sync engine) can be implemented by separate agents.
- **Project layout**: pnpm-workspace monorepo with packages
  - `app` — UI shell, views, routing
  - `backend-core` — adapter interface, canonical model, sync engine, conflict UI hooks
  - `backend-local-indexeddb` — first-release backend
  - `backend-inmemory` — test fixture, not shipped to users
  - `backend-google` — later
  - `backend-microsoft` — later
  - `design-system` — tokens, primitives
- **Inter-slice contracts** that must be defined before parallel work starts:
  - `BackendAdapter` TypeScript interface + canonical `Task` type (owned by `backend-core`)
  - Design tokens file: colors, spacing, motion durations, type scale (owned by `design-system`)
  - Route + view-state contract: how view1 / view2 / view3 / view4 are reachable, URL params (owned by `app` shell)
- Each slice's plan must include a **"done when"** checklist: tests passing, contracts honored, accessibility checks passed, manual demo script.
- **Testing strategy**: unit tests for backend adapters using `backend-inmemory` as the contract reference; component tests via Testing Library; Playwright end-to-end covering create → drag between quadrants → focus → set due → complete; plus a PWA install + offline scenario.

## Suggested model assignments per slice 
- Planning and orchestration: **Opus**
- Design system / UI primitives: **Sonnet**
- Backend adapters and sync engine: **Sonnet**
- view1 / view2 / drag-and-drop / zoom transitions: **Sonnet**
- view3 / view4 / forms: **Sonnet**
- Tests + CI scaffolding: **Haiku**

## Session continuity

Both planning and implementation must be broken into small, resumable steps so a session can be stopped and resumed (e.g. after running out of tokens) without losing progress. Treat the conversation as ephemeral and the repo as the source of truth.

### Planning is iterative and persisted to disk

- Write the plan to `plan.md` at the repo root. Build it up incrementally rather than producing it in one pass.
- Structure: numbered phases, each with numbered steps. Every step records: **goal**, **inputs** (files / contracts to read first), **outputs** (files / changes produced), and a verifiable **done-when** checklist.
- Commit `plan.md` after each phase is drafted so a fresh session can resume by reading it.
- Sequence the inter-slice contracts (`BackendAdapter`, design tokens, route / view-state) first, before any slice that depends on them.

### Implementation steps are small and committed

- Each step in `plan.md` is sized to fit comfortably in a single session: roughly one feature, contract, or file group at a time.
- After each step:
  1. Run the step's done-when checks.
  2. Make one commit per step, with a message naming the step number (e.g. `step 2.3: define BackendAdapter interface`).
  3. Update `plan.md` to mark the step done and record any decisions or deviations.
- Long-running side effects (dependency installs, scaffolding) belong in their own dedicated step so a session that fails partway can be cleanly restarted.

### Status file for cross-session handoff

- Maintain `status.md` at the repo root with: the **last completed step**, the **next step about to begin**, and any **open questions or blockers**.
- Update `status.md` at the start and end of every session.
- A fresh session must be able to resume by reading only: `design-input.md` + `plan.md` + `status.md` + `git log` + the current file tree.

### Session start / end protocol

- **At session start**: read `design-input.md`, `plan.md`, `status.md`, and run `git log --oneline -20` and `git status`. Confirm the next step before writing any code.
- **At session end** (or when context is getting tight): commit any in-flight work (use a `wip step N: ...` prefix if the step isn't complete), update `status.md` with the partial state and what to pick up next, and stop.

### Guardrails

- Never rely on what was said earlier in the conversation. If a decision matters, it lives in `design-input.md` (input), `plan.md` (the plan), or `status.md` (the state) — or it does not exist.
- If a step grows larger than expected mid-session, keep going — do not artificially split it across sessions. The commit + `status.md` discipline is a safety net for when a session is forced to end (token exhaustion, interruption), not a reason to stop early.
- Keep diffs scoped to the active step. Do not bundle step N + step N + 1 work into one commit.
