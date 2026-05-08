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

/**
 * Comparator implementing the rules above. Exported so callers (e.g.
 * tests, future intra-cell sortable helpers) can reuse it without
 * always going through {@link sortTasks}.
 */
export function compareTasks(a: Task, b: Task, ranks: TaskOrderMap): number {
  const aRank = rankOf(a, ranks);
  const bRank = rankOf(b, ranks);
  if (aRank !== undefined && bRank !== undefined) {
    if (aRank !== bRank) return aRank - bRank;
  } else if (aRank !== undefined) {
    return -1;
  } else if (bRank !== undefined) {
    return 1;
  }

  const dueCmp = compareDue(a, b);
  if (dueCmp !== 0) return dueCmp;

  // Final tiebreak: createdAt ascending. Both fields are ISO strings
  // assigned by the local backend, so lexical comparison is correct.
  if (a.createdAt < b.createdAt) return -1;
  if (a.createdAt > b.createdAt) return 1;
  return 0;
}

/** Return a new array of `tasks` sorted by {@link compareTasks}. */
export function sortTasks(tasks: readonly Task[], ranks: TaskOrderMap): readonly Task[] {
  return [...tasks].sort((a, b) => compareTasks(a, b, ranks));
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
