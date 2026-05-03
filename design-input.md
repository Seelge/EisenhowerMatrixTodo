# Design input
This design document contains the design input for the application.

The design input is intended for the prompt to create the initial implementation plan.

## Backend
- The backend should be configurable with a generic interface such that we can switch between backend storages
- Intended backend storages: in-memory for testing, Goolge Tasks API, Microsoft To-Do API
- For each backend storage we need to know how to store the required information, e.g. due date, priority, etc. and how to map these between the backends

## Technology
- A web app which is usable in Chrome on both Android and Windows. Ignore compatibility with Linux and Apple for now.
- The web app should be installable on Android
- Distribution is manual installation only

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
- All fields should be editable
- Skip sub-tasks for now

### View 4 Options
- There should be an options screen with potential sub-screens, e.g. to configure the backend

## Planning instruction
- You are the expert, create the plan on how to implement
- Implementation should consider that we want to switch and sync between different backend storages, and we need to know how to map to each interface, but we initially start to implement just one: the in memory backend for testing
- Prepare such that different parts (e.g. UI design, frontend, backend) can be implemented using different agents with potentially different models. Propose a model suitable to the task

## Open questions & proposed decisions
*Editing guide: `[x]` marks the proposed default. To accept it, do nothing. To pick a different answer, move `[x]` to that bullet. Delete bullets you don't want. Replace any line with your own answer. Keep one option per question.*

### Backend interface
**Q1. Which operations must every backend adapter implement?**
- [x] `list(quadrant?)`, `get(id)`, `create(task)`, `update(id, patch)`, `delete(id)`, plus `changesSince(cursor)` for sync
- [ ] Minimal: just CRUD + `list` — sync diffing done at app layer
- [ ] Add `subscribe(callback)` for push-capable backends (Google/MS don't support; would no-op)

**Q2. How is the Eisenhower quadrant stored on backends with no native concept?**
- [x] One list per quadrant (Google Tasks: 4 task lists; MS To-Do: 4 lists). Cross-quadrant move = delete+recreate; clean UX in native apps.
- [ ] Single list, quadrant as tag/category (MS To-Do has categories; Google Tasks doesn't — needs a fallback)
- [ ] Single list, quadrant encoded in `notes` via marker like `[Q1]`
- [ ] Local mapping table keyed by remote ID (lost if browser storage cleared)

**Q3. Canonical task model + field mapping** (delete rows you don't want; edit mappings):

| Field | Canonical | Google Tasks | MS To-Do |
|---|---|---|---|
| id | string | `id` | `id` |
| title | string (required) | `title` | `title` |
| notes | markdown string | `notes` (plain) | `body.content` |
| due date | ISO date | `due` (date only) | `dueDateTime` |
| due time | ISO time, optional | not supported → store in notes | `dueDateTime` |
| priority | none/low/normal/high | not supported → store in notes | `importance` |
| quadrant | Q1–Q4 | encoded via list (Q2) | encoded via list (Q2) |
| status | open/done | `status` | `status` |
| completedAt | ISO datetime | `completed` | `completedDateTime` |
| recurrence | RRULE string | not supported (drop, warn) | `recurrence` |
| createdAt | ISO datetime | `updated` only | `createdDateTime` |
| updatedAt | ISO datetime | `updated` | `lastModifiedDateTime` |

**Q3a. Behavior for fields the active backend can't represent:**
- [x] Silently store; show a small info hint in View 3 ("Won't sync to Google Tasks")
- [ ] Block the user from setting unsupported fields
- [ ] Warn on every save

**Q4. Multi-backend behavior:**
- [x] One *active* backend at a time. Switching copies data into the new backend on first connect; new backend then becomes the source of truth.
- [ ] Live mirroring across two backends (much more complex)
- [ ] Switch without migration — old data stays put, new backend starts empty

**Q5. Conflict resolution when an external client edited the same task:**
- [x] Last-write-wins by `updatedAt`, per field where possible, whole-record otherwise
- [ ] Always prefer remote
- [ ] Always prefer local
- [ ] Prompt user

**Q6. Authentication & token storage:**
- [x] OAuth 2.0 PKCE in-browser; refresh tokens in IndexedDB (origin-isolated). Single account per backend.
- [ ] Server-side token broker (more secure refresh, but adds infra)
- [ ] Multi-account per backend (defer to v2)

**Q7. Offline behavior:**
- [x] Local-first: writes go to IndexedDB immediately, sync queue replays on reconnect; reads served from local cache; background sync on focus/online events.
- [ ] Online-only — disable UI when offline
- [ ] Read-only offline — queue writes but no optimistic UI

### Technology
**Q8. Distribution mechanics** (you've stated manual install only):
- [x] PWA installable from Chrome's "Install app" prompt; site served over HTTPS from a static host (Cloudflare Pages / GitHub Pages / Netlify).
- [ ] Self-host on your own server
- [ ] No install — bookmark only, full-screen via display-mode

**Q9. Framework / tooling:**
- [x] React 18 + TypeScript + Vite. Routing: React Router. State: Zustand + TanStack Query (server cache). Drag/drop: dnd-kit. Animation: Framer Motion. Testing: Vitest + Playwright.
- [ ] Svelte/SvelteKit + TypeScript
- [ ] SolidJS + TypeScript
- [ ] Vanilla TS + Lit

### UI design
**Q10. Theme:**
- [x] Dark mode only in v1 (matches "futuristic" brief). Light mode later.
- [ ] Both modes from start
- [ ] Follow system theme

**Q11. Color palette** (edit hex values freely):
- Background: `#0A0E14` (near-black, slight blue cast)
- Surface: `#121821`
- Text primary: `#E6EDF3`; secondary: `#8B96A5`
- Accent (focus, active): `#7DF9FF` electric cyan
- Q1 Do (urgent + important): `#FF4D6D` red glow
- Q2 Schedule (important, not urgent): `#7DF9FF` cyan glow
- Q3 Delegate (urgent, not important): `#FFD166` amber glow
- Q4 Delete (neither): `#8B96A5` muted gray glow

**Q12. Material 3 interpretation:** [x] Use M3 *behaviors* (touch targets ≥48dp, ripple, motion durations, type scale) but override colors with the palette above. No MUI/M3 component library — too heavy to "futurize".

**Q13. Quadrant labels in UI:**
- [x] Short verbs: "Do" / "Schedule" / "Delegate" / "Delete" with axis labels ("Important ↑", "Urgent →") on V1
- [ ] Verbose: "Important & Urgent", etc.
- [ ] Numeric Q1–Q4 only

**Q14. Accessibility commitments:** [x] WCAG 2.2 AA contrast, full keyboard navigation, drag-drop has keyboard alternative (move-to menu), `prefers-reduced-motion` disables zoom morph, ARIA labels for all icons.

### View 1 — Eisenhower matrix
**Q15. Per-task render in zoomed-out cards:**
- [x] Title (1 line, ellipsis) + due-date chip if within 7 days + priority dot
- [ ] Title only
- [ ] Title + full due date + priority + tags

**Q16. Overflow within a quadrant when zoomed out:**
- [x] Vertical scroll inside each quadrant cell (independent per quadrant)
- [ ] First N tasks then "+M more" — no scroll until zoomed in
- [ ] Auto-shrink card density

**Q17. Default sort within a quadrant:** [x] Manual (drag to reorder), with due-date as secondary when no manual order is set.

**Q18. Adding a task from V1:** [x] Floating "+" button (bottom-right) opens a quick composer; user picks quadrant from a 2×2 mini-matrix.

**Q19. Quadrant axis labels visibility:** [x] Faint labels on outer edges of the matrix in V1; hidden in V2.

### View 2 — Quadrant
**Q20. Visible neighbor edge for cross-quadrant drag:**
- [x] ~24px strip on each shared edge that lights up during a drag; drop on strip moves task to that neighbor
- [ ] Wider strip (~48px) always visible (more obvious, eats screen space)
- [ ] Edges only visible during drag

**Q21. Pinch-out from V2 returns to:** [x] V1 with the previously-focused quadrant briefly highlighted.

**Q22. Add-task affordance in V2:** [x] FAB bottom-right; new task lands in the focused quadrant.

**Q23. Empty-quadrant state:** [x] Minimal centered illustration + 1-line description of the quadrant's purpose ("Important and urgent — do these first").

### Transition (zoom)
**Q24. Mouse-wheel behavior:**
- [x] Plain wheel scrolls within the focused quadrant; **Ctrl+wheel** zooms between V1 ↔ V2
- [ ] Plain wheel zooms (no in-quadrant scroll — risky for long lists)
- [ ] No wheel zoom — only buttons/keyboard

**Q25. Pinch-in from V1 — which quadrant gets focus:** [x] The one under the pinch midpoint at gesture start.

**Q26. Keyboard shortcuts:** [x] `Esc` zooms out to V1 from V2, or closes V3. `Enter` on a focused quadrant zooms in. Arrow keys navigate quadrants. `+`/`-` zoom.

**Q27. Reduced motion:** [x] `prefers-reduced-motion: reduce` replaces animations with instant cuts (no morph).

### View 3 — Task focus
**Q28. Presentation:**
- [x] Bottom sheet on mobile, side panel (~480px right) on desktop. Doesn't fully obscure the matrix.
- [ ] Full-screen modal everywhere
- [ ] Inline expand within the quadrant

**Q29. Editable field set** (all editable per your note — confirm which fields exist): [x] title, notes (markdown), due date, due time (optional), priority, quadrant, status, recurrence. Backend-unsupported fields show an info icon.

**Q30. Arbitrary-date entry beyond Today/Tomorrow:** [x] Native date picker + quick-pick row: "Today", "Tomorrow", "This weekend", "Next week", "No date".

**Q31. Quadrant change from V3:** [x] Yes — small 2×2 picker with current quadrant highlighted.

**Q32. Delete & complete actions:**
- [x] Complete: instant toggle. Delete: trash icon with 5s undo snackbar — no modal confirm.
- [ ] Both require confirm
- [ ] No undo, hard delete

**Q33. Recurring tasks in v1:**
- [x] Yes, basic: daily / weekly / monthly / custom RRULE. Drops on push to Google Tasks (user warned).
- [ ] Defer to v2 (simpler backend mapping)

**Q34. Closing V3 returns to:** [x] The view visible when V3 was opened (V1 or V2).

### View 4 — Options
**Q35. Top-level option groups:** [x]
1. Backends — connect/disconnect, switch active, sync status
2. Account — connected identity, sign out
3. Appearance — theme (locked to dark in v1), per-quadrant color overrides
4. Defaults — default quadrant for new tasks, default sort
5. Data — export JSON, import JSON, clear local cache
6. About — version, build, source link

**Q36. First-run flow:**
- [x] Start in in-memory backend with 3 sample tasks; banner suggests "Connect Google or Microsoft to keep your tasks".
- [ ] Force backend selection before any UI is shown
- [ ] Empty state + onboarding modal

### Cross-cutting
**Q37. Reminders / notifications:**
- [x] Defer to v2. v1 ships without notifications.
- [ ] v1 includes Web Notifications for due-today tasks (requires permission UX + service-worker scheduling)

**Q38. Time zones:** [x] Store dates with user's local zone offset on creation; display in the user's current local zone. No multi-zone awareness in v1.

**Q39. Loading / error / empty states:** [x] Standardized: skeleton loaders for lists, inline error banner with retry for failed sync, illustrated empty states. Defined as design-system primitives.

**Q40. Telemetry:**
- [x] None in v1
- [ ] Anonymous error reporting only (Sentry)
- [ ] Anonymous usage analytics + errors

**Q41. Internationalization:**
- [x] English only at v1, but wrap user-facing strings in an `i18n` helper from day one
- [ ] Multi-locale at v1 (specify which)

**Q42. Testing strategy:** [x] Unit tests for backend adapters (in-memory backend doubles as the contract reference); component tests via Testing Library; Playwright e2e covering: create → drag between quadrants → focus → set due → complete; plus a PWA install + offline scenario.

**Q43. Project layout:**
- [x] Single Vite app. Folders: `src/app/` (UI), `src/backends/{inmemory,google,microsoft}/`, `src/core/` (canonical model + adapter interface), `src/design/` (tokens, primitives).
- [ ] pnpm-workspace monorepo: `app`, `backend-core`, `backend-inmemory`, `backend-google`, `backend-microsoft`, `design-system` (better isolation, more overhead)

### Planning instructions
**Q44. Inter-slice contracts to define before parallel work starts:**
- [x] `BackendAdapter` TS interface + canonical `Task` type — owned by core slice
- [x] Design-tokens file (colors, spacing, motion durations, type scale) — owned by design slice
- [x] Route + view-state contract (V1/V2/V3/V4 reachability, URL params) — owned by app-shell slice

**Q45. Acceptance criteria per slice:** [x] Each slice's plan includes a "done when" checklist: tests passing, contracts honored, a11y checks passed, manual demo script.

**Q46. Suggested model assignments per slice** (edit freely):
- Design system / UI primitives: **Sonnet** (visual + structural, lots of iteration)
- Backend adapters & sync engine: **Opus** (correctness, mapping edge cases, conflicts)
- V1 / V2 / drag-and-drop / zoom transitions: **Opus** (gesture math, animation correctness)
- V3 / V4 / forms: **Sonnet** (more mechanical)
- Tests + CI scaffolding: **Haiku** (template-heavy, fast)
