# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 6.3 — Touch swipe to change focus. View2 now navigates between quadrants on a directional swipe; gestures starting on a draggable card or inside the scroll list are excluded so dnd and scroll keep working.

`packages/app/src/views/quadrant/swipe.ts` (new): exports `SWIPE_NEIGHBORS` (per-quadrant cardinal-direction → neighbor table — Q1 → `{ left: Q2, down: Q3 }`, etc., matching the same axis-flip semantics as the strips in `NeighborEdge.tsx`), the `resolveSwipeDirection(dx, dy, duration, options?)` classifier, and `resolveSwipeTarget(from, direction)`. Defaults: 50 px distance, 1.5× dominance ratio, 400 ms max gesture duration, 300 ms cooldown. The duration cap is the discriminator that keeps slow scrolls / accidental drags from being misread as flicks; the dominance ratio prevents diagonal gestures from resolving to a clean horizontal or vertical direction (off-axis denominator clamped to 1 to avoid divide-by-zero on perfectly axis-aligned swipes).

`packages/app/src/views/quadrant/QuadrantView.tsx`: adds `useRef`-backed pending-gesture + last-swipe-time state and `onPointerDown` / `onPointerUp` / `onPointerCancel` handlers spread onto the `<main>` element. Pointerdown captures (`pointerId`, `clientX`, `clientY`, `performance.now()`); pointerup computes deltas, runs them through `resolveSwipeDirection` + `resolveSwipeTarget`, and on success calls `useViewStateStore.getState().navigate({ ...state, zoom: 'quadrant', focusedQuadrant: target })` — preserves any open `focusedTaskId` / `openedFromZoom`. Targets matched by `SWIPE_EXCLUDE_SELECTOR = '.emt-task-card, .emt-quadrant__list'` skip the gesture so dnd-kit owns card drags and the list keeps its scroll behavior. The strips' `pointer-events: none` rule means swipes across them bubble to the underlying frame and resolve as expected.

There's no animation in this step — the route flip is the entire visual transition. The "instant snap" reduced-motion requirement is met by construction; Phase 7 will gate its zoom morph on `useReducedMotion` separately.

Tests: `test/quadrant-swipe.test.tsx` (8 pure + 6 integration = 14 cases). Pure: distance/dominance/duration thresholds, geometric neighbor table, off-edge no-op, table arity. Integration: dispatches synthesized `pointerdown` / `pointerup` `Event`s with assigned `pointerId` / `isPrimary` / `clientX` / `clientY` (happy-dom doesn't ship a real `PointerEvent` constructor we can trust, so we go through `new Event(type, …)` + `Object.assign` and let React's synthetic-event system pick them up). Coverage: left swipe Q1 → Q2, down swipe Q1 → Q3, off-edge directions are no-ops, gestures starting on a `.emt-task-card` are skipped, gestures starting in `.emt-quadrant__list` are skipped, and the cooldown suppresses an immediately-repeated swipe. URL via `window.location.pathname` is asserted alongside `useViewStateStore` to confirm the navigate path went through history as well as the store.

322 vitest tests pass (was 308; +14). Typecheck clean, lint clean, format clean. Production build: 265.31 KB JS / 9.99 KB CSS (was 264.09 / 9.99) — JS gain is `swipe.ts` + the gesture handlers; CSS unchanged.

**Next:** Step 6.4 — mouse drag-at-edge to change focus. Same code path as 6.3: `pointerdown` → `pointerup` is already pointer-type-agnostic (React's `onPointer*` handlers fire for mouse, touch, and pen alike), so the integration test for mouse coverage is largely a duplicate run of the existing handlers with `pointerType: 'mouse'`. The only behavioral nuance to verify: a click-and-drag on the background (not on a card or the list) translates focus the same way as a touch swipe. Phase 7 then layers the actual zoom morph + Ctrl+wheel binding on top. Practical wiring: probably no code change, just an additional regression test asserting the handler triggers under `pointerType: 'mouse'`. If that's all, mark 6.4 ✅ with a "Note: covered by 6.3's pointer-type-agnostic handlers — adds a mouse-pointerType regression test" memo.

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
