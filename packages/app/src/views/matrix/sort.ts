/**
 * Per-quadrant task ordering for view1 (Step 5.7).
 *
 * Two-level order:
 *
 *   1. **Manual rank** (from the `taskOrder` IDB store, see
 *      `state/task-order.ts`). Tasks with a rank sort by rank ascending
 *      and appear at the top of the list.
 *   2. **Due-date secondary**, then `createdAt` for full determinism.
 *      Tasks without a manual rank sort by `dueDate` ascending — nulls
 *      last so a "no due date" task never crowds out one with a
 *      deadline. Equal due dates fall back to `createdAt` ascending so
 *      the order is stable across renders.
 *
 * The function is pure (no React, no IDB); the cell wires it together
 * with the two underlying queries (`useTasks` + `useTaskOrder`). Pure
 * makes it cheap to unit-test and trivially memoizable in the cell.
 */
import type { BackendId, Task, TaskId } from '@emt/backend-core';

import type { SortKey } from '../../state/defaults.js';
import { taskOrderKey, type TaskOrderMap } from '../../state/task-order.js';

/** A `Task` paired with whatever `(backendId, taskId)` ⇒ rank lookup tells us. */
function rankOf(task: Task, ranks: TaskOrderMap): number | undefined {
  return ranks.get(taskOrderKey(task.backendId, task.id));
}

/**
 * Compare due dates with nulls-last semantics. Returns 0 when both
 * tasks have the same effective due value (no date, or matching dates).
 */
function compareDue(a: Task, b: Task): number {
  const aHas = a.dueDate !== undefined;
  const bHas = b.dueDate !== undefined;
  if (aHas && !bHas) return -1;
  if (!aHas && bHas) return 1;
  if (!aHas && !bHas) return 0;
  // Both have due dates — ISO calendar dates compare lexicographically.
  // If both also carry a dueTime, factor that in so 09:00 sorts before
  // 17:00 on the same day.
  const aKey = `${a.dueDate ?? ''} ${a.dueTime ?? ''}`;
  const bKey = `${b.dueDate ?? ''} ${b.dueTime ?? ''}`;
  return aKey < bKey ? -1 : aKey > bKey ? 1 : 0;
}

function compareCreated(a: Task, b: Task): number {
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}

function compareTitle(a: Task, b: Task): number {
  // Locale-aware case-insensitive comparison so "apple" < "Banana".
  const cmp = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
  return cmp;
}

/**
 * Comparator implementing the rules above. Exported so callers (e.g.
 * tests, future intra-cell sortable helpers) can reuse it without
 * always going through {@link sortTasks}. The secondary key is
 * configurable via the Defaults panel (Step 9.5); `createdAt` is the
 * deterministic final tiebreak regardless of the secondary choice.
 */
export function compareTasks(
  a: Task,
  b: Task,
  ranks: TaskOrderMap,
  secondary: SortKey = 'dueDate',
): number {
  const aRank = rankOf(a, ranks);
  const bRank = rankOf(b, ranks);
  if (aRank !== undefined && bRank !== undefined) {
    if (aRank !== bRank) return aRank - bRank;
  } else if (aRank !== undefined) {
    return -1;
  } else if (bRank !== undefined) {
    return 1;
  }

  let secondaryCmp = 0;
  if (secondary === 'dueDate') {
    secondaryCmp = compareDue(a, b);
  } else if (secondary === 'title') {
    secondaryCmp = compareTitle(a, b);
  }
  // `createdAt` skips the explicit second compare and falls through to
  // the final tiebreak below.
  if (secondaryCmp !== 0) return secondaryCmp;

  return compareCreated(a, b);
}

/**
 * Return a new array of `tasks` sorted by {@link compareTasks}. The
 * secondary sort key defaults to `dueDate` to match the Step 5.7
 * contract; the Defaults panel feeds in `'createdAt'` or `'title'`
 * when the user chose another option.
 */
export function sortTasks(
  tasks: readonly Task[],
  ranks: TaskOrderMap,
  secondary: SortKey = 'dueDate',
): readonly Task[] {
  return [...tasks].sort((a, b) => compareTasks(a, b, ranks, secondary));
}

/**
 * Build the ref list passed to `clearTaskRanks` when the user activates
 * "Reset to secondary order" in a cell header. We only clear ranks for
 * tasks currently in the cell — tasks in other quadrants keep their
 * manual order untouched.
 */
export function refsForReset(
  tasks: readonly Task[],
): readonly { readonly backendId: BackendId; readonly taskId: TaskId }[] {
  return tasks.map((task) => ({ backendId: task.backendId, taskId: task.id }));
}

/**
 * Phase 16 — drop completed tasks from matrix / view2 lists when the
 * Defaults "Hide completed" pref is on. Pure so cells and tests share
 * one path. Search and tag inventory deliberately skip this filter.
 */
export function filterCompletedTasks<T extends { readonly status: Task['status'] }>(
  tasks: readonly T[],
  hideCompleted: boolean,
): readonly T[] {
  if (!hideCompleted) return tasks;
  return tasks.filter((task) => task.status !== 'done');
}

/**
 * Rank that moves `task` one slot up or down in an already-sorted list
 * (card menu keyboard reorder). Returns `null` when the move is impossible.
 */
export function computeKeyboardReorderRank(
  ordered: readonly Task[],
  task: Task,
  direction: 'up' | 'down',
  ranks: TaskOrderMap,
  now: () => number = Date.now,
): number | null {
  const idx = ordered.findIndex((t) => t.id === task.id);
  if (idx < 0) return null;

  if (direction === 'up') {
    if (idx === 0) return null;
    const target = ordered[idx - 1]!;
    return rankJustAbove(ordered, task, target, ranks, now);
  }

  if (idx >= ordered.length - 1) return null;
  const target = ordered[idx + 1]!;
  return rankJustBelow(ordered, task, target, ranks, now);
}

function rankJustAbove(
  ordered: readonly Task[],
  dragged: Task,
  target: Task,
  ranks: TaskOrderMap,
  now: () => number,
): number {
  const targetRank = ranks.get(taskOrderKey(target.backendId, target.id));
  if (targetRank === undefined) return now() - 1;
  const ranked = ordered
    .filter((t) => t.id !== dragged.id)
    .map((t) => ({ id: t.id, rank: ranks.get(taskOrderKey(t.backendId, t.id)) }))
    .filter((e): e is { id: TaskId; rank: number } => e.rank !== undefined)
    .sort((a, b) => a.rank - b.rank);
  const targetIdx = ranked.findIndex((e) => e.id === target.id);
  const predRank = targetIdx > 0 ? ranked[targetIdx - 1]!.rank : undefined;
  return predRank !== undefined ? (predRank + targetRank) / 2 : targetRank - 1;
}

function rankJustBelow(
  ordered: readonly Task[],
  dragged: Task,
  target: Task,
  ranks: TaskOrderMap,
  now: () => number,
): number {
  const targetRank = ranks.get(taskOrderKey(target.backendId, target.id));
  if (targetRank === undefined) return now() + 1;
  const ranked = ordered
    .filter((t) => t.id !== dragged.id)
    .map((t) => ({ id: t.id, rank: ranks.get(taskOrderKey(t.backendId, t.id)) }))
    .filter((e): e is { id: TaskId; rank: number } => e.rank !== undefined)
    .sort((a, b) => a.rank - b.rank);
  const targetIdx = ranked.findIndex((e) => e.id === target.id);
  const succRank =
    targetIdx >= 0 && targetIdx < ranked.length - 1 ? ranked[targetIdx + 1]!.rank : undefined;
  return succRank !== undefined ? (targetRank + succRank) / 2 : targetRank + 1;
}
