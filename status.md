# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 8.1 — view3 surface container. Opens Phase 8.

`packages/app/src/views/task/TaskView.tsx` mounts the task-focus view inside `ResponsiveSurface` (Step 3.4):

- Narrow viewports → bottom sheet (`emt-sheet`) with a 40 %-opacity scrim, so the matrix or focused quadrant below shows through but is clearly demoted.
- Wide viewports (≥ 768 px) → `min(480px, 100vw)` right-side panel (`emt-side-panel`) with no scrim, so the underlying view stays fully visible alongside.

The component reads `focusedTaskId` from `useViewState()` and self-gates the surface via `ResponsiveSurface.open`, so the surface and its `useDialogBehavior` effect (focus trap + Escape + focus restore) tear down cleanly on close. Closing currently drops `focusedTaskId` and keeps `zoom` / `focusedQuadrant` intact — Step 8.9 will route close through `openedFromZoom` once the underlying view can change while view3 is open.

To avoid two history entries on a single Esc, the `focusedTaskId` branch was removed from `ZoomController`'s Escape handler (the dialog inside the surface owns it). The `TaskFocusPlaceholder` stub in `Routes.tsx` was replaced by `<TaskView />`.

Tests:
- `packages/app/test/task-view.test.tsx`: stubs `matchMedia` per test to drive both surface branches, then asserts (a) Sheet + scrim over `[data-view="matrix"]` for `/?task=abc&from=matrix` on narrow, (b) SidePanel (no scrim) over `[data-view="quadrant"][data-quadrant="Q3"]` for `/q/Q3?task=xyz&from=quadrant` on wide, (c) absence of any task surface when `?task=` is missing, and (d) Esc on `/q/Q2?task=abc&from=quadrant` clears `focusedTaskId` in view-state and URL (`/q/Q2`, empty search) while keeping the quadrant.

Verification:
- `pnpm --filter @emt/app exec tsc` passes.
- `pnpm lint` + `pnpm format:check` pass.
- `pnpm test` passes: 55 files / 379 tests.
- `pnpm --filter @emt/app build` passes. Production build: 398.67 KB JS / 11.26 KB CSS.
- `pnpm e2e` passes: 6 tests.

**Previously completed:** Step 7.5 — Reduced-motion path. Closed Phase 7 (view1 ↔ view2 navigation feels seamless across input types: touch pinch, mouse wheel + Ctrl, keyboard, reduced-motion respected).

**Next:** Step 8.2 — Field editors: title, notes, status. Editable single-line title, notes (textarea-with-preview-toggle is acceptable for v1), and a status checkbox; all wired to `useUpdateTask` with 300 ms debounce. Outputs `TitleField.tsx`, `NotesField.tsx`, `StatusToggle.tsx`. Done when edits persist and fast typing produces a single debounced write rather than N writes.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

None.

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. Find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
