/**
 * Drag-and-drop helpers for view1 (Step 5.5).
 *
 * Two concerns live here so neither bleeds into the React components:
 *
 *   - **Data shapes for `useDraggable` / `useDroppable`.** dnd-kit types
 *     the `data` prop as `unknown`; the discriminants below let the
 *     `onDragEnd` handler narrow safely without ad-hoc string parsing
 *     of the dragged id.
 *   - **Optimistic cache mutation.** Moving a task between quadrants
 *     is a UI-driven operation and the user expects the card to land
 *     in the destination cell immediately, before the adapter write
 *     resolves. `applyOptimisticMove` writes through every `['tasks',
 *     ...]` query in the React Query cache and returns a rollback
 *     closure the caller invokes on adapter failure. After the
 *     mutation settles, `useUpdateTask`'s existing invalidation
 *     re-fetches and replaces the optimistic state with reality.
 */
import type { DragEndEvent } from '@dnd-kit/core';
import type { BackendId, Quadrant, Task, TaskId, TaskPatch } from '@emt/backend-core';
import type { QueryClient } from '@tanstack/react-query';

export interface DraggableTaskData {
  readonly kind: 'task';
  readonly task: Task;
}

export interface DroppableCellData {
  readonly kind: 'cell';
  readonly quadrant: Quadrant;
}

export function isDraggableTaskData(value: unknown): value is DraggableTaskData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'task' &&
    typeof (value as { task?: { id?: unknown } }).task?.id === 'string'
  );
}

export function isDroppableCellData(value: unknown): value is DroppableCellData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'cell' &&
    typeof (value as { quadrant?: unknown }).quadrant === 'string'
  );
}

/**
 * Apply an optimistic quadrant change across every cached tasks query.
 *
 * Returns a rollback function that restores each affected cache entry
 * to its pre-mutation snapshot. The rollback is intentionally a closure
 * over the snapshots so the caller's `onError` hook only has to invoke
 * it — no need to remember which keys were touched.
 *
 * Cache layout assumptions:
 *  - `['tasks', 'list', 'all']` → `readonly Task[]` containing every
 *    task across backends. The task stays here with its new quadrant.
 *  - `['tasks', 'list', <Quadrant>]` → `readonly Task[]` filtered to
 *    that quadrant. The task is removed from the source bucket and
 *    appended to the destination bucket.
 *  - `['tasks', 'one', <TaskId>]` → `Task | undefined`. Patched in
 *    place when its id matches.
 *
 * Other `['tasks', ...]` entries (none today) are left alone. Once the
 * adapter write resolves, `useUpdateTask`'s `onSuccess` invalidates the
 * subtree and the optimistic state is replaced by the authoritative
 * one — even if our transform missed a corner case.
 */
export function applyOptimisticMove(
  queryClient: QueryClient,
  task: Task,
  toQuadrant: Quadrant,
): () => void {
  const fromQuadrant = task.quadrant;
  const moved: Task = { ...task, quadrant: toQuadrant };
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: ['tasks'] });

  for (const [key] of snapshots) {
    const [, sub, filter] = key as readonly [string, string, string | undefined];
    if (sub === 'list') {
      queryClient.setQueryData<readonly Task[] | undefined>(key, (prev) =>
        prev === undefined
          ? prev
          : transformList(prev, task.id, moved, fromQuadrant, toQuadrant, filter),
      );
    } else if (sub === 'one') {
      queryClient.setQueryData<Task | undefined>(key, (prev) =>
        prev !== undefined && prev.id === task.id ? moved : prev,
      );
    }
  }

  return () => {
    for (const [key, value] of snapshots) {
      queryClient.setQueryData(key, value);
    }
  };
}

/**
 * Build the `onDragEnd` callback wired to `<DndContext>`. Extracted
 * from `MatrixView` so unit tests can drive it directly with
 * synthesized `DragEndEvent`s — happy-dom has no layout engine, so
 * dnd-kit's `KeyboardSensor` (which needs droppable rects to compute
 * the "next" target) can't run end-to-end in vitest.
 *
 * The callback is a no-op when:
 *  - there's no `over` (drop happened outside any cell)
 *  - the dragged element isn't a task or the drop target isn't a cell
 *  - the task's quadrant equals the destination quadrant (no move).
 *
 * On a real move it applies the optimistic cache mutation and queues
 * the adapter write through the supplied `mutate` function. Errors
 * trigger the rollback closure returned by `applyOptimisticMove`.
 */
export interface DragEndHandlerDeps {
  readonly queryClient: QueryClient;
  readonly mutate: (
    input: { backendId: BackendId; id: TaskId; patch: TaskPatch },
    options: { onError: () => void },
  ) => void;
  /**
   * Persist a manual rank for a moved task (Step 5.7). The cross-cell
   * drop assigns `Date.now()` as the rank — newer drops sort below
   * older drops within the manual section of the destination cell, so
   * the just-dropped card lands at the bottom of the manual list.
   *
   * Errors are swallowed: a rank is a UI nicety, and the rest of the
   * move (which the user can see) has already happened. Logging the
   * failure to console keeps the diagnostic trail without surfacing a
   * cryptic toast for a non-functional concern.
   */
  readonly setRank?: (input: { backendId: BackendId; taskId: TaskId; rank: number }) => void;
  /**
   * Time source for the rank value, defaulting to `Date.now`. Tests
   * inject a deterministic clock so the assertion can match an exact
   * rank.
   */
  readonly now?: () => number;
}

export function createDragEndHandler(deps: DragEndHandlerDeps): (event: DragEndEvent) => void {
  const now = deps.now ?? Date.now;
  return (event) => {
    const { active, over } = event;
    if (over === null) return;
    const dragData = active.data.current;
    const dropData = over.data.current;
    if (!isDraggableTaskData(dragData) || !isDroppableCellData(dropData)) return;
    if (dragData.task.quadrant === dropData.quadrant) return;

    const rollback = applyOptimisticMove(deps.queryClient, dragData.task, dropData.quadrant);
    deps.mutate(
      {
        backendId: dragData.task.backendId,
        id: dragData.task.id,
        patch: { quadrant: dropData.quadrant },
      },
      { onError: rollback },
    );

    if (deps.setRank) {
      deps.setRank({
        backendId: dragData.task.backendId,
        taskId: dragData.task.id,
        rank: now(),
      });
    }
  };
}

function transformList(
  prev: readonly Task[],
  id: TaskId,
  moved: Task,
  fromQuadrant: Quadrant,
  toQuadrant: Quadrant,
  filter: string | undefined,
): readonly Task[] {
  // The 'all' bucket — and any future un-filtered list — always keeps
  // the task; we just have to swap the old record for the moved one.
  if (filter === 'all' || filter === undefined) {
    return prev.map((t) => (t.id === id ? moved : t));
  }
  // Single-quadrant buckets: drop the task from the source, append it
  // to the destination, and leave unrelated buckets untouched. We don't
  // dedupe-on-append because if `moved` is already in `prev` the task
  // must have already been here (filter === toQuadrant), in which case
  // we re-use the map branch logic by checking id.
  if (filter === fromQuadrant && filter !== toQuadrant) {
    return prev.filter((t) => t.id !== id);
  }
  if (filter === toQuadrant && filter !== fromQuadrant) {
    return prev.some((t) => t.id === id) ? prev : [...prev, moved];
  }
  return prev;
}
