# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 5.5 — Drag-and-drop between quadrants.

`@dnd-kit/core@^6.3.1` added to `packages/app/dependencies` (no other dnd-kit packages needed yet — Step 5.7 may add `@dnd-kit/sortable` for in-cell reorder).

`packages/app/src/views/matrix/MatrixView.tsx` is now a `<DndContext>` with two sensors: `PointerSensor` with `activationConstraint: { distance: 5 }` (covers mouse on desktop and touch on Android via the same code path; the 5px gate is what keeps single taps as clicks so view3 still opens) and `KeyboardSensor` (so keyboard users can Space-grab a card and arrow-key it into another cell — the dedicated "Move to" menu in 5.6 is a richer alternative, but the dnd-kit a11y story isn't free, so we ship both). The `onDragEnd` callback is built by `createDragEndHandler` (extracted from the view), which makes it testable without rendering.

`packages/app/src/views/matrix/dnd.ts` (new) holds the dnd-kit data shapes (`DraggableTaskData` `{ kind: 'task', task }`, `DroppableCellData` `{ kind: 'cell', quadrant }`), the type guards, the optimistic cache helper `applyOptimisticMove(queryClient, task, toQuadrant)` and the handler factory. The optimistic mutation walks every `['tasks', ...]` cache entry: `'list', 'all'` swaps the moved task in place, `'list', <fromQuadrant>` drops the task, `'list', <toQuadrant>` appends it, `'one', <id>` patches in place, and unrelated buckets keep referential equality so they don't re-render. The function returns a closure that restores every snapshot — `MatrixView` registers this closure as `onError` on the `useUpdateTask` mutation. `useUpdateTask`'s existing `onSuccess` invalidation is the convergence step that replaces optimistic state with reality once the adapter write resolves.

`packages/app/src/views/matrix/MatrixCell.tsx` calls `useDroppable({ id: 'cell-<Q>', data })`. The droppable ref attaches to `<Glow>` (which now `forwardRef`s — that's a small design-system tweak in `packages/design-system/src/Glow.tsx`, no other callers were affected). `data-drop-active="true|false"` toggles from `isOver` so CSS can highlight the receiving cell.

`packages/app/src/views/matrix/TaskCard.tsx` calls `useDraggable({ id: task.id, data })` and spreads dnd-kit's `attributes` + `listeners` onto the rendered `<button>`. While `transform !== null` (dragging) the card follows the pointer via `translate3d(...)`. `data-dragging="true"` on the button drives the dragged-card style.

CSS: `.emt-matrix__cell[data-drop-active='true']` adds an inset 2px outline + `filter: brightness(1.15)` (no transform / size change so dnd-kit's rect measurements stay valid mid-drag); `.emt-task-card` becomes `cursor: grab` and gets `touch-action: none` so a vertical drag becomes a dnd-kit drag instead of a page scroll; `.emt-task-card[data-dragging='true']` flips to `cursor: grabbing` and `position: relative; z-index: 1` so the dragged card floats above siblings.

Tests: `test/dnd-cache.test.ts` (4 cases) — pure-function assertions on `applyOptimisticMove`: list/one cache transforms, untouched buckets keep referential equality, rollback restores every snapshot, same-quadrant move is idempotent. `test/matrix-dnd.test.tsx` (6 cases) — TaskCard exposes `aria-roledescription="draggable"` + tabindex; MatrixCell's drop-active flag starts false; the handler optimistically moves, calls `mutate`, and the adapter ends up patched; rollback restores the cache when `onError` fires; null-over and same-quadrant drops are no-ops; MatrixView mounts the DndContext and seeded tasks land in their cells. happy-dom has no layout engine, so the over-flag-flips and pointer-physics paths are not asserted in vitest — that's the Phase 11.4 Playwright golden path's job.

271 vitest tests pass (was 261; +10). Typecheck clean, lint clean, format clean. Production build: 251.49 KB JS / 4.29 KB CSS (was 210.97 / 4.05). +40 KB JS is the dnd-kit core runtime — sensors, collision detection, monitor — which is its full advertised footprint.

**Next:** Step 5.6 — Keyboard "Move to" menu. Each `TaskCard` gets a focusable kebab button that opens a small popover offering "Move to → Q1/Q2/Q3/Q4" excluding the current quadrant; activating an option dispatches `useUpdateTask({ patch: { quadrant } })` (no optimistic shimmer needed — same call as drop). Required by the a11y commitment. Watch for keyboard-trap and focus-restore on close. The kebab button must NOT propagate to dnd-kit (i.e., its pointer events have to be excluded from the draggable listeners — likely `data-no-drag` opt-out using `event.stopPropagation()` inside the button).

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
