/**
 * Step 5.7 — manual + due-date sort comparator (`views/matrix/sort.ts`).
 *
 * Pure-function tests. Drives the comparator through every branch:
 *   - manual rank ascending when both tasks have ranks
 *   - manual-ranked tasks float above unranked ones
 *   - unranked: due-date asc, nulls last
 *   - dueTime is a tiebreaker on equal dueDate
 *   - createdAt is the final stable tiebreaker
 *   - empty rank map collapses to the legacy "due-date / createdAt" order
 */
import type { BackendId, Task, TaskId } from '@emt/backend-core';
import { describe, expect, it } from 'vitest';

import { taskOrderKey, type TaskOrderMap } from '../src/state/task-order.ts';
import {
  compareTasks,
  computeKeyboardReorderRank,
  filterCompletedTasks,
  refsForReset,
  sortTasks,
} from '../src/views/matrix/sort.ts';

const BACKEND_ID = 'local' as BackendId;

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id: id as TaskId,
    backendId: BACKEND_ID,
    title: id,
    notes: '',
    priority: 'normal',
    quadrant: 'Q1',
    status: 'open',
    tags: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function ranks(entries: Record<string, number>): TaskOrderMap {
  const map = new Map<string, number>();
  for (const [id, rank] of Object.entries(entries)) {
    map.set(taskOrderKey(BACKEND_ID, id as TaskId), rank);
  }
  return map;
}

function ids(tasks: readonly Task[]): string[] {
  return tasks.map((t) => t.id);
}

describe('matrix sort — Step 5.7', () => {
  it('orders manually-ranked tasks by rank ascending', () => {
    const a = task('a');
    const b = task('b');
    const c = task('c');
    const sorted = sortTasks([a, b, c], ranks({ a: 30, b: 10, c: 20 }));
    expect(ids(sorted)).toEqual(['b', 'c', 'a']);
  });

  it('floats ranked tasks above unranked ones', () => {
    const ranked = task('ranked', { dueDate: '2026-01-01' });
    const dueSoon = task('dueSoon', { dueDate: '2026-01-02' });
    const noDue = task('noDue');
    const sorted = sortTasks([noDue, dueSoon, ranked], ranks({ ranked: 5 }));
    expect(ids(sorted)).toEqual(['ranked', 'dueSoon', 'noDue']);
  });

  it('orders unranked tasks by dueDate ascending, nulls last', () => {
    const noDue = task('noDue', { createdAt: '2026-01-01T00:00:00.000Z' });
    const earlier = task('earlier', { dueDate: '2026-02-15' });
    const later = task('later', { dueDate: '2026-03-01' });
    const sorted = sortTasks([noDue, later, earlier], ranks({}));
    expect(ids(sorted)).toEqual(['earlier', 'later', 'noDue']);
  });

  it('uses dueTime as a tiebreaker on the same dueDate', () => {
    const evening = task('evening', { dueDate: '2026-02-15', dueTime: '18:00' });
    const morning = task('morning', { dueDate: '2026-02-15', dueTime: '09:00' });
    const noTime = task('noTime', { dueDate: '2026-02-15' });
    const sorted = sortTasks([evening, morning, noTime], ranks({}));
    // Tasks without a `dueTime` sort with an empty time component, which
    // is lexically less than any "HH:mm" — so they come first within
    // the same calendar date.
    expect(ids(sorted)).toEqual(['noTime', 'morning', 'evening']);
  });

  it('falls back to createdAt asc for full determinism', () => {
    const second = task('second', { createdAt: '2026-01-01T00:00:02.000Z' });
    const first = task('first', { createdAt: '2026-01-01T00:00:01.000Z' });
    const sorted = sortTasks([second, first], ranks({}));
    expect(ids(sorted)).toEqual(['first', 'second']);
  });

  it('produces a new array — does not mutate the input', () => {
    const a = task('a');
    const b = task('b');
    const input = [b, a];
    const sorted = sortTasks(input, ranks({ a: 1, b: 2 }));
    expect(input).toEqual([b, a]);
    expect(sorted).not.toBe(input);
  });

  it('compareTasks: equal-rank tasks are equal (returns 0)', () => {
    const a = task('a', { createdAt: '2026-01-01T00:00:00.000Z' });
    const b = task('b', { createdAt: '2026-01-01T00:00:00.000Z' });
    expect(compareTasks(a, b, ranks({ a: 5, b: 5 }))).toBe(0);
  });

  it('refsForReset returns one (backendId, taskId) per task', () => {
    const refs = refsForReset([task('a'), task('b')]);
    expect(refs).toEqual([
      { backendId: BACKEND_ID, taskId: 'a' as TaskId },
      { backendId: BACKEND_ID, taskId: 'b' as TaskId },
    ]);
  });

  it('filterCompletedTasks drops done tasks only when hide is on', () => {
    const open = task('open', { status: 'open' });
    const done = task('done', { status: 'done' });
    expect(filterCompletedTasks([open, done], true).map((t) => t.id)).toEqual(['open']);
    expect(filterCompletedTasks([open, done], false).map((t) => t.id)).toEqual(['open', 'done']);
  });

  it('computeKeyboardReorderRank moves between neighbors', () => {
    const a = task('a');
    const b = task('b');
    const c = task('c');
    const ordered = [a, b, c];
    const map = ranks({ a: 10, b: 20, c: 30 });
    expect(computeKeyboardReorderRank(ordered, a, 'up', map)).toBeNull();
    expect(computeKeyboardReorderRank(ordered, c, 'down', map)).toBeNull();
    // Move up = sit above `a` (rank 10) → below nothing → rank < 10.
    const up = computeKeyboardReorderRank(ordered, b, 'up', map)!;
    expect(up).toBeLessThan(10);
    // Move down = sit below `c` (rank 30) → above nothing → rank > 30? No:
    // below c means after c → rank > 30. Between b and c would be wrong.
    // Moving down one slot places just below next neighbor `c`.
    const down = computeKeyboardReorderRank(ordered, b, 'down', map)!;
    expect(down).toBeGreaterThan(30);
  });
});
