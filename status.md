# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 6.2 — Drop-on-edge to move. View2 now accepts cross-quadrant moves by dragging a card onto a neighbor strip; the targeted strip lights up during the drag, the focused quadrant stays put after drop, and the optimistic-cache + adapter pipeline is shared with view1's cross-cell drag.

`packages/app/src/views/matrix/dnd.ts`: introduced a `DroppableEdgeData = { kind: 'edge', quadrant }` discriminant and a unifying `DroppableTargetData = DroppableCellData | DroppableEdgeData` alias plus `isDroppableEdgeData` / `isDroppableTargetData` guards. `createDragEndHandler` now narrows the drop payload via `isDroppableTargetData` so it routes both view1 cell drops and view2 edge drops through the same `applyOptimisticMove` + `useUpdateTask` + `setRank` flow. The cell-only `isDroppableCellData` remains exported (no callers outside this file today, but the matrix payload type is still `DroppableCellData` for `MatrixCell`'s `useDroppable` data prop, and a future test or refactor might want to assert the cell-vs-edge distinction directly).

`packages/app/src/views/quadrant/NeighborEdge.tsx`: each strip is now a dnd-kit `useDroppable` registered under a stable per-neighbor id `edge-${neighbor}`, with `data: { kind: 'edge', quadrant: neighbor }`. The strip element receives the dnd-kit ref and toggles `data-drop-active` from `isOver`; the rest of the markup (decorative, `aria-hidden`, edge/neighbor/color attributes) is unchanged. The `pointer-events: none` rule is preserved — dnd-kit's rect-based collision detector doesn't need pointer events on the droppable element itself, and the strip overlays only the frame's outer padding (the task list lives in the inner area), so we never need to capture clicks on the band.

`packages/app/src/views/quadrant/QuadrantView.tsx`: hoists a local `<DndContext>` with the same `PointerSensor (distance: 5)` + `KeyboardSensor` configuration as `MatrixView`, and a `createDragEndHandler` whose deps come from `useQueryClient` + `useUpdateTask` + `useSetTaskRank`. The DndContext wraps the `<main>` element so both `TaskCard`'s draggables and `NeighborEdge`'s droppables share it. Phase 7's `ZoomController` will eventually replace the two local contexts (matrix + quadrant) with a single shared context — for now the duplication is fine and matches the matrix wiring 1:1.

`packages/app/src/views/quadrant/quadrant.css`: adds `data-drop-active='true'` rules — opacity jumps to 1 and brightness lifts; per-edge-color box-shadow uses the matching `--glow-q{n}` token so the strip wears the destination quadrant's halo. Smooth `var(--motion-duration-short) var(--motion-easing-standard)` transition on opacity and filter so the lift is a quick fade rather than a hard pop.

Tests: `test/quadrant-dnd.test.tsx` (6 cases) — NeighborEdge structural contract under a DndContext (drop-active = false initial, edge/neighbor/color attributes, aria-hidden); `createDragEndHandler` accepts an edge-payload `DragEndEvent` and applies the same optimistic move + adapter write + rollback as cell drops; manual-rank persistence on edge drops; no-op when an edge somehow targets the focused quadrant; `<QuadrantView>` mounts both strips for Q1 with the right neighbors and the route doesn't change. Same harness limitations as `matrix-dnd.test.tsx` — happy-dom has no layout engine so dnd-kit's pointer/keyboard sensors can't drive a real drag end-to-end. Real cross-engine verification is reserved for Phase 11's Playwright suite.

308 vitest tests pass (was 302; +6). Typecheck clean, lint clean, format clean. Production build: 264.09 KB JS / 9.99 KB CSS (was 263.60 / 9.39) — JS gain is the QuadrantView DndContext + sensors + handler closure; CSS gain is the drop-active glow rules per neighbor color.

**Next:** Step 6.3 — touch swipe to change focus. Add a pointer/touch handler at `QuadrantView`'s root that, when the gesture didn't start on a draggable card, navigates to the geometrically adjacent quadrant: swipe left ↔ urgency-axis flip, swipe up/down ↔ importance-axis flip. Swipe must be rate-limited (one transition per gesture) and respect `prefers-reduced-motion` via the existing `useReducedMotion` hook from Step 3.9. Practical wiring: a small touchstart/move/end (or pointerdown/move/up) state machine that ignores events whose target sits inside `.emt-task-card`; on a successful gesture, call `useNavigate({ zoom: 'quadrant', focusedQuadrant: <neighbor> })`. Use the existing `NEIGHBORS` table from `NeighborEdge.tsx` to resolve direction → quadrant. Step 6.4 will mirror the handler for mouse drag at the background.

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
