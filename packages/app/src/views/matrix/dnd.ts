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
import {
  applyTaskPatch,
  type BackendId,
  type Quadrant,
  type Task,
  type TaskId,
  type TaskPatch,
} from '@emt/backend-core';
import type { QueryClient } from '@tanstack/react-query';

import { taskOrderKey, type TaskOrderMap } from '../../state/task-order.js';

export interface DraggableTaskData {
  readonly kind: 'task';
  readonly task: Task;
}

export interface DroppableCellData {
  readonly kind: 'cell';
  readonly quadrant: Quadrant;
}

/**
 * A task card as a drop target — Step 12.1's intra-quadrant reorder.
 * Carries the card's own task so the drag-end handler can both read the
 * destination quadrant (`task.quadrant`) and use the card as a position
 * anchor when the drop stays inside the same quadrant.
 */
export interface DroppableCardData {
  readonly kind: 'card';
  readonly task: Task;
}

/**
 * A view2 neighbor strip — Step 6.2's drop-on-edge target. Carries the
 * neighbor's quadrant so the same {@link createDragEndHandler} can route
 * the move without caring whether the user dropped on a matrix cell or
 * a quadrant edge.
 */
export interface DroppableEdgeData {
  readonly kind: 'edge';
  readonly quadrant: Quadrant;
}

export type DroppableTargetData = DroppableCellData | DroppableEdgeData | DroppableCardData;

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

export function isDroppableEdgeData(value: unknown): value is DroppableEdgeData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'edge' &&
    typeof (value as { quadrant?: unknown }).quadrant === 'string'
  );
}

export function isDroppableCardData(value: unknown): value is DroppableCardData {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { kind?: unknown }).kind === 'card' &&
    typeof (value as { task?: { id?: unknown } }).task?.id === 'string'
  );
}

export function isDroppableTargetData(value: unknown): value is DroppableTargetData {
  return isDroppableCellData(value) || isDroppableEdgeData(value) || isDroppableCardData(value);
}

/** The destination quadrant a drop target routes a dropped task to. */
function targetQuadrant(data: DroppableTargetData): Quadrant {
  return data.kind === 'card' ? data.task.quadrant : data.quadrant;
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
 * Optimistically remove a task from every cached tasks query — Step
 * 12.1's "delete is immediate" fix.
 *
 * `TaskActions` queues the real adapter delete behind a 5 s undo
 * snackbar, so without this the card lingered in the matrix until some
 * unrelated invalidation happened to refetch. We mirror
 * {@link applyOptimisticMove}'s shape: drop the task from every
 * `['tasks', 'list', ...]` array and clear its `['tasks', 'one', id]`
 * entry, returning a rollback closure the snackbar's `onUndo` invokes.
 *
 * On snackbar commit the real `useDeleteTask` runs and its `onSuccess`
 * invalidation re-fetches — the authoritative empty result then
 * replaces this optimistic state. (If the commit's adapter delete
 * fails, the optimistic removal stands but storage still has the task;
 * that window is the same pre-existing risk the delete flow always
 * carried and is out of scope for 12.1.)
 */
/**
 * Optimistically apply a {@link TaskPatch} across every cached tasks
 * query. Used by `useUpdateTask` so status / priority / quadrant /
 * title edits feel immediate (especially "Mark complete" with hide-
 * completed on — the card vanishes on the next paint).
 *
 * Quadrant changes reuse the same list-bucket shuffle as
 * {@link applyOptimisticMove}. Other fields map the patched record in
 * place. Returns a rollback closure for `onError`.
 */
export function applyOptimisticPatch(
  queryClient: QueryClient,
  task: Task,
  patch: TaskPatch,
): () => void {
  const patched: Task = applyTaskPatch(task, patch);
  const fromQuadrant = task.quadrant;
  const toQuadrant = patched.quadrant;
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: ['tasks'] });

  for (const [key] of snapshots) {
    const [, sub, filter] = key as readonly [string, string, string | undefined];
    if (sub === 'list') {
      if (fromQuadrant !== toQuadrant) {
        queryClient.setQueryData<readonly Task[] | undefined>(key, (prev) =>
          prev === undefined
            ? prev
            : transformList(prev, task.id, patched, fromQuadrant, toQuadrant, filter),
        );
      } else {
        queryClient.setQueryData<readonly Task[] | undefined>(key, (prev) =>
          prev === undefined ? prev : prev.map((t) => (t.id === task.id ? patched : t)),
        );
      }
    } else if (sub === 'one') {
      queryClient.setQueryData<Task | undefined>(key, (prev) =>
        prev !== undefined && prev.id === task.id ? patched : prev,
      );
    }
  }

  return () => {
    for (const [key, value] of snapshots) {
      queryClient.setQueryData(key, value);
    }
  };
}

/** Locate a task already held in any `['tasks', ...]` cache entry. */
export function findCachedTask(queryClient: QueryClient, id: TaskId): Task | undefined {
  const one = queryClient.getQueryData<Task | undefined>(['tasks', 'one', id]);
  if (one !== undefined && one.id === id) return one;
  const lists = queryClient.getQueriesData<readonly Task[] | undefined>({
    queryKey: ['tasks', 'list'],
  });
  for (const [, data] of lists) {
    const found = data?.find((t) => t.id === id);
    if (found !== undefined) return found;
  }
  return undefined;
}

export function applyOptimisticDelete(queryClient: QueryClient, task: Task): () => void {
  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: ['tasks'] });

  for (const [key, value] of snapshots) {
    const [, sub] = key as readonly [string, string, string | undefined];
    if (sub === 'list') {
      queryClient.setQueryData<readonly Task[] | undefined>(key, (prev) =>
        prev === undefined ? prev : prev.filter((t) => t.id !== task.id),
      );
    } else if (sub === 'one' && (value as Task | undefined)?.id === task.id) {
      // `setQueryData(key, undefined)` is a no-op in React Query (an
      // `undefined` updater result means "skip"), so drop the entry
      // outright; the rollback closure re-seeds it from the snapshot.
      queryClient.removeQueries({ queryKey: key, exact: true });
    }
  }

  return () => {
    for (const [key, value] of snapshots) {
      queryClient.setQueryData(key, value);
    }
  };
}

/**
 * Compute the manual rank that slots `dragged` directly above
 * `targetCard` within their shared quadrant — Step 12.1's
 * intra-quadrant reorder.
 *
 * The matrix only has one drop target per cell, so before 12.1 a drop
 * that didn't change quadrant was a pure no-op. Now each card is also a
 * droppable; dropping onto card B assigns the dragged card a rank that
 * places it just before B:
 *
 *  - If B already has a manual rank, take the midpoint between B and
 *    B's predecessor in the ranked section (or `B.rank - 1` when B is
 *    first). Fractional ranks are fine — the comparator subtracts.
 *  - If B has no manual rank yet, B is still in the due-date/createdAt
 *    section. A single rank write can't position the dragged card
 *    *between* two unranked tasks, so we fall back to `now()`: the
 *    dragged card lands at the bottom of the manual section, which is
 *    immediately above the unranked tasks — i.e. just above B when B is
 *    the first unranked task, the common case for a "pull this one up".
 */
function computeReorderRank(
  queryClient: QueryClient,
  dragged: Task,
  targetCard: Task,
  now: () => number,
): number {
  const orderMap = queryClient.getQueryData<TaskOrderMap>(['taskOrder']);
  const targetRank = orderMap?.get(taskOrderKey(targetCard.backendId, targetCard.id));
  if (orderMap === undefined || targetRank === undefined) {
    return now();
  }
  const list =
    queryClient.getQueryData<readonly Task[]>(['tasks', 'list', targetCard.quadrant]) ??
    queryClient.getQueryData<readonly Task[]>(['tasks', 'list', 'all']) ??
    [];
  const ranked = list
    .filter((t) => t.quadrant === targetCard.quadrant && t.id !== dragged.id)
    .map((t) => ({ id: t.id, rank: orderMap.get(taskOrderKey(t.backendId, t.id)) }))
    .filter((e): e is { id: TaskId; rank: number } => e.rank !== undefined)
    .sort((a, b) => a.rank - b.rank);
  const targetIdx = ranked.findIndex((e) => e.id === targetCard.id);
  const predRank = targetIdx > 0 ? ranked[targetIdx - 1]!.rank : undefined;
  return predRank !== undefined ? (predRank + targetRank) / 2 : targetRank - 1;
}

/**
 * Build the `onDragEnd` callback wired to `<DndContext>`. Extracted
 * from `MatrixView` so unit tests can drive it directly with
 * synthesized `DragEndEvent`s — happy-dom has no layout engine, so
 * dnd-kit's `KeyboardSensor` (which needs droppable rects to compute
 * the "next" target) can't run end-to-end in vitest.
 *
 * The callback is a no-op when:
 *  - there's no `over` (drop happened outside any drop target)
 *  - the dragged element isn't a task or the drop target isn't a
 *    recognised cell / edge / card target
 *  - a card was dropped onto itself.
 *
 * Otherwise:
 *  - A cross-quadrant drop applies the optimistic cache mutation,
 *    queues the adapter write through `mutate` (errors trigger the
 *    `applyOptimisticMove` rollback), and ranks the card to the bottom
 *    of the destination's manual section.
 *  - A same-quadrant drop onto another card reorders within the
 *    quadrant via {@link computeReorderRank} (Step 12.1) — no adapter
 *    write, since the canonical `Task` is unchanged.
 *  - A same-quadrant drop onto empty cell space does nothing.
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
    if (!isDraggableTaskData(dragData) || !isDroppableTargetData(dropData)) return;

    const dragged = dragData.task;
    const toQuadrant = targetQuadrant(dropData);
    // The anchor card for an intra-quadrant reorder (Step 12.1); a cell
    // or edge drop has no anchor.
    const anchorCard = isDroppableCardData(dropData) ? dropData.task : undefined;

    // Dropping a card onto itself is a no-op — nothing moved.
    if (anchorCard !== undefined && anchorCard.id === dragged.id) return;

    const isCrossQuadrant = dragged.quadrant !== toQuadrant;

    if (isCrossQuadrant) {
      const rollback = applyOptimisticMove(deps.queryClient, dragged, toQuadrant);
      deps.mutate(
        {
          backendId: dragged.backendId,
          id: dragged.id,
          patch: { quadrant: toQuadrant },
        },
        { onError: rollback },
      );
    }

    if (deps.setRank) {
      if (isCrossQuadrant) {
        // Cross-quadrant drop: the card lands at the bottom of the
        // destination's manual section (`now()`), as before.
        deps.setRank({ backendId: dragged.backendId, taskId: dragged.id, rank: now() });
      } else if (anchorCard !== undefined) {
        // Same-quadrant drop onto another card: reorder so the dragged
        // card sits just above the anchor card.
        deps.setRank({
          backendId: dragged.backendId,
          taskId: dragged.id,
          rank: computeReorderRank(deps.queryClient, dragged, anchorCard, now),
        });
      }
      // Same-quadrant drop onto empty cell space: no anchor, no reorder.
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
