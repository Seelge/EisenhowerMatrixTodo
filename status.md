# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 7.3 — Mouse wheel.

`Ctrl + wheel` now toggles zoom from the same shell that owns the morph it triggers. Plain wheel is left alone so per-cell / per-quadrant scroll still works. `Ctrl + wheel-up` on view1 zooms into the cell under the cursor (resolved geometrically against the scene rect via `quadrantAtPoint` from `pinch.ts`); `Ctrl + wheel-down` on view2 returns to view1. macOS trackpad pinch already synthesizes `ctrlKey: true` on wheel, so the same handler covers desktop trackpad pinch without extra plumbing.

Pure helper `packages/app/src/views/zoom/wheel.ts` exposes `resolveWheelDirection(deltaY)` with a 5 px deadzone and `WHEEL_COOLDOWN_MS = 300`. Browser convention is honored: `deltaY > 0` is wheel-down (zoom out), `deltaY < 0` is wheel-up (zoom in).

`ZoomController.tsx` adds an `onWheel` on the scene `motion.div`. Behavior:
- `!e.ctrlKey` → return immediately (preserve native scroll).
- `e.ctrlKey` → `preventDefault()` *always* (suppress browser page-zoom even when the action is a no-op like cooldown / deadzone / already-min-or-max-zoom).
- Throttle via `useRef` against `WHEEL_COOLDOWN_MS`.
- `state.zoom === 'matrix' && direction === 'up'` → `quadrantAtPoint({clientX,clientY}, currentTarget.getBoundingClientRect())` → `navigate({ ...state, zoom: 'quadrant', focusedQuadrant: target })`.
- `state.zoom === 'quadrant' && direction === 'down'` → build a fresh `{ zoom: 'matrix' }` carrying any `focusedTaskId` / `openedFromZoom` (the same `exactOptionalPropertyTypes`-safe construction QuadrantView's pinch-out uses).

Tests:
- `packages/app/test/zoom-wheel.test.tsx` covers (a) the pure direction classifier — up/down thresholds + deadzone; (b) integration over a real `<Routes>` shell: `Ctrl + wheel-up` at each of the four cell midpoints navigates to the right `/q/<Qn>`, with `event.defaultPrevented === true`; (c) `Ctrl + wheel-down` from `/q/Q3` returns to `/`; (d) plain wheel (no ctrlKey) does *not* `preventDefault` and does *not* navigate; (e) `Ctrl + wheel-down` on view1 and `Ctrl + wheel-up` on view2 are no-ops (still preventDefault to swallow browser zoom); (f) cooldown swallows a rapid second wheel-up. Scene `getBoundingClientRect` is stubbed to a 400×400 box for the cursor→quadrant resolution.

Verification completed:
- `pnpm --filter @emt/app exec tsc` passes.
- `pnpm lint` passes.
- `pnpm format:check` passes.
- `pnpm test` passes: 52 files / 357 tests.
- `pnpm --filter @emt/app build` passes. Production build: 396.07 KB JS / 11.13 KB CSS.
- `pnpm e2e` passes: 4 tests.

**Next:** Step 7.4 — Keyboard. Global keyboard handler at the app shell, dispatching to view-state: `Esc` zooms out from view2 (or closes view3 if open); `Enter` on a focused matrix cell zooms in; arrow keys move focus between cells; `+` / `-` zoom. Done when a keyboard-only e2e navigates to Q2 → Enter → land in view2/Q2; Esc returns to view1.

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
