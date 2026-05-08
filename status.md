# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 6.1 — Quadrant layout. view2's structural shell is in place: focused-quadrant frame with its glow border, two neighbor strips on the shared edges, task list reusing view1's pipeline.

`packages/app/src/views/quadrant/NeighborEdge.tsx` (new): exports the `NEIGHBORS` table — each focused quadrant maps to exactly two orthogonal neighbors, keyed by the side of the focused quadrant they share an edge with. The 2 × 2 matrix has no four-neighbor case: Q1 → `{ left: Q2, bottom: Q3 }`; Q2 → `{ right: Q1, bottom: Q4 }`; Q3 → `{ top: Q1, left: Q4 }`; Q4 → `{ top: Q2, right: Q3 }`. The two remaining sides face the matrix outside and intentionally render no strip — matches `design-input.md`'s "shared edge" wording and the Step-6.3 swipe contract which only handles axis flips. The `<NeighborEdge>` itself is a decorative `<div>` with `data-edge` / `data-neighbor` / `data-emt-edge-color` attributes; `aria-hidden="true"` and `pointer-events: none` so it doesn't intercept clicks. Step 6.2 will turn each strip into a `useDroppable`.

`packages/app/src/views/quadrant/QuadrantView.tsx` (new): wraps a design-system `<Glow>` frame in the focused quadrant's color, hosts a heading (reusing the verb labels from `app.matrix.cell.{q1..q4}.label` so view1 ↔ view2 zoom doesn't change what the quadrant is called), and a vertically-scrolling task list. Task rendering is the same `useTasks(quadrant)` + `useTaskOrder` + `sortTasks` pipeline as `MatrixCell`, so a card has the same identity, rank, and meta in both views — sets up Phase 7's shared-`layoutId` morph cleanly. No `DndContext` here yet; `TaskCard`'s `useDraggable` degrades to a no-op when no context is mounted (same fallback already exercised by `matrix-cell.test.tsx`). Phase 7's `ZoomController` will hoist a single shared context over both views.

`packages/app/src/views/quadrant/quadrant.css` (new): outer `.emt-quadrant` fills the viewport; inner `.emt-quadrant__frame` is `position: relative` with 24 px padding to keep the task list from sliding under the strips. `.emt-quadrant__edge` rules absolutely position each strip flush to its side (24 px wide on left/right, 24 px tall on top/bottom). Strips are layered at `--layer-quadrant-edge` (z-index 10) and tinted by `data-emt-edge-color` → the `--color-q{n}` token at 0.4 opacity. Step 6.2 lifts that opacity (and adds a glow) on drag-over.

`packages/app/src/routes/Routes.tsx`: drops the `<QuadrantPlaceholder>` and renders `<QuadrantView quadrant={state.focusedQuadrant} />` when `zoom === 'quadrant'`. The `data-view="quadrant"` / `data-quadrant` attributes the router tests assert on are preserved on the new `<main>`.

`packages/app/src/i18n/strings.en.ts`: `app.quadrant.heading` and `app.quadrant.placeholder` removed (placeholder is gone, no other consumers).

Tests: `test/quadrant-view.test.tsx` (4 cases — one per focused quadrant) asserts the route data attributes, the Glow frame's `data-emt-glow`, the heading reuses the matrix verb label, and exactly the expected neighbor strips render on the expected edges in the expected colors. The two outside-facing edges per quadrant are explicitly checked to render no strip.

302 vitest tests pass (was 298; +4). Typecheck clean, lint clean, format clean. Production build: 263.60 KB JS / 9.39 KB CSS (was 262.33 / 7.55) — JS gain is QuadrantView + NeighborEdge + Routes wiring; CSS gain is `quadrant.css`.

**Next:** Step 6.2 — drop-on-edge to move. Each `NeighborEdge` becomes a `useDroppable` in the same dnd-kit context as Step 5.5; on drop, the dragged task moves to the strip's quadrant via `applyOptimisticMove` + `useUpdateTask`, the targeted edge brightens during the drag (extend the existing `data-drop-active` pattern from `MatrixCell`), and the focused quadrant stays put afterwards. The current quadrant's view stays focused so the user can keep dropping into the same edge — no zoom transition. Practical wiring: hoist a `DndContext` to `QuadrantView` with the same `PointerSensor` (distance 5) + `KeyboardSensor` config as `MatrixView`; the drag-end handler can largely reuse `createDragEndHandler` from `dnd.ts` if we widen its `DroppableCellData` discriminator to also accept `{ kind: 'edge', quadrant }`.

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
