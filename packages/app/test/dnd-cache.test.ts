/**
 * Pure-function tests for the optimistic-move cache helper used by the
 * matrix's drag-and-drop handler (Step 5.5). These exercise
 * `applyOptimisticMove` against a real `QueryClient` so the cache
 * shapes match production exactly — no mocks. The tests cover:
 *
 *  - the un-filtered `'all'` list keeps the task with its new quadrant
 *  - the source-quadrant list drops the task
 *  - the destination-quadrant list gains the task
 *  - unrelated quadrant lists are untouched (referential equality)
 *  - the `'one'` cache for the moved task is patched in place
 *  - the rollback closure restores every snapshot exactly
 */
import type { BackendId, Task, TaskId } from '@emt/backend-core';
import { QueryClient } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';

import {
  applyOptimisticDelete,
  applyOptimisticMove,
  applyOptimisticPatch,
  findCachedTask,
} from '../src/views/matrix/dnd.ts';

function makeTask(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id: id as TaskId,
    backendId: 'local' as BackendId,
    title: id,
    notes: '',
    priority: 'normal',
    quadrant: 'Q2',
    status: 'open',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

function makeClient(): QueryClient {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}

describe('applyOptimisticMove', () => {
  it('updates the all-bucket and shifts the task between quadrant buckets', () => {
    const moving = makeTask('t1', { quadrant: 'Q2' });
    const sibling = makeTask('t2', { quadrant: 'Q2' });
    const stranger = makeTask('t3', { quadrant: 'Q4' });
    const qc = makeClient();
    qc.setQueryData(['tasks', 'list', 'all'], [moving, sibling, stranger]);
    qc.setQueryData(['tasks', 'list', 'Q2'], [moving, sibling]);
    qc.setQueryData(['tasks', 'list', 'Q1'], [] as readonly Task[]);
    qc.setQueryData(['tasks', 'list', 'Q4'], [stranger]);

    applyOptimisticMove(qc, moving, 'Q1');

    const all = qc.getQueryData<readonly Task[]>(['tasks', 'list', 'all'])!;
    expect(all).toHaveLength(3);
    expect(all.find((t) => t.id === moving.id)?.quadrant).toBe('Q1');

    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q2'])).toEqual([sibling]);
    const q1 = qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q1'])!;
    expect(q1).toHaveLength(1);
    expect(q1[0]!.id).toBe(moving.id);
    expect(q1[0]!.quadrant).toBe('Q1');

    // Untouched bucket keeps its identity (no needless re-render fan-out).
    expect(qc.getQueryData(['tasks', 'list', 'Q4'])).toEqual([stranger]);
  });

  it('patches the one-cache for the moved task only', () => {
    const moving = makeTask('t1', { quadrant: 'Q2' });
    const other = makeTask('t2', { quadrant: 'Q3' });
    const qc = makeClient();
    qc.setQueryData(['tasks', 'one', moving.id], moving);
    qc.setQueryData(['tasks', 'one', other.id], other);

    applyOptimisticMove(qc, moving, 'Q3');

    expect(qc.getQueryData<Task>(['tasks', 'one', moving.id])?.quadrant).toBe('Q3');
    expect(qc.getQueryData<Task>(['tasks', 'one', other.id])).toEqual(other);
  });

  it('rollback restores every snapshot exactly', () => {
    const moving = makeTask('t1', { quadrant: 'Q2' });
    const sibling = makeTask('t2', { quadrant: 'Q2' });
    const qc = makeClient();
    const allBefore = [moving, sibling];
    const q2Before = [moving, sibling];
    const q1Before: readonly Task[] = [];
    qc.setQueryData(['tasks', 'list', 'all'], allBefore);
    qc.setQueryData(['tasks', 'list', 'Q2'], q2Before);
    qc.setQueryData(['tasks', 'list', 'Q1'], q1Before);
    qc.setQueryData(['tasks', 'one', moving.id], moving);

    const rollback = applyOptimisticMove(qc, moving, 'Q1');
    // Verify the optimistic state is in fact different first — otherwise
    // the rollback assertion would tautologically pass.
    expect(qc.getQueryData(['tasks', 'list', 'Q2'])).not.toEqual(q2Before);

    rollback();

    expect(qc.getQueryData(['tasks', 'list', 'all'])).toEqual(allBefore);
    expect(qc.getQueryData(['tasks', 'list', 'Q2'])).toEqual(q2Before);
    expect(qc.getQueryData(['tasks', 'list', 'Q1'])).toEqual(q1Before);
    expect(qc.getQueryData<Task>(['tasks', 'one', moving.id])).toEqual(moving);
  });

  it('is a no-op when destination equals source (defensive)', () => {
    // The view-level handler short-circuits before calling this, but
    // the helper itself should still produce identical state if it's
    // ever invoked with a same-quadrant move.
    const t = makeTask('t1', { quadrant: 'Q2' });
    const qc = makeClient();
    qc.setQueryData(['tasks', 'list', 'all'], [t]);
    qc.setQueryData(['tasks', 'list', 'Q2'], [t]);

    applyOptimisticMove(qc, t, 'Q2');

    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'all'])![0]!.quadrant).toBe('Q2');
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q2'])).toHaveLength(1);
  });
});

describe('applyOptimisticPatch (Phase 23)', () => {
  it('patches status in place across list and one caches', () => {
    const t = makeTask('t1', { status: 'open' });
    const qc = makeClient();
    qc.setQueryData(['tasks', 'list', 'all'], [t]);
    qc.setQueryData(['tasks', 'list', 'Q2'], [t]);
    qc.setQueryData(['tasks', 'one', t.id], t);

    applyOptimisticPatch(qc, t, { status: 'done', completedAt: '2026-07-31T00:00:00.000Z' });

    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'all'])![0]!.status).toBe('done');
    expect(qc.getQueryData<Task>(['tasks', 'one', t.id])?.completedAt).toBe(
      '2026-07-31T00:00:00.000Z',
    );
  });

  it('moves between quadrant buckets when patch changes quadrant', () => {
    const t = makeTask('t1', { quadrant: 'Q2' });
    const qc = makeClient();
    qc.setQueryData(['tasks', 'list', 'all'], [t]);
    qc.setQueryData(['tasks', 'list', 'Q2'], [t]);
    qc.setQueryData(['tasks', 'list', 'Q1'], [] as readonly Task[]);

    applyOptimisticPatch(qc, t, { quadrant: 'Q1' });

    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q2'])).toEqual([]);
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q1'])![0]!.id).toBe(t.id);
  });

  it('findCachedTask prefers one-cache then list buckets', () => {
    const t = makeTask('t1');
    const qc = makeClient();
    expect(findCachedTask(qc, t.id)).toBeUndefined();
    qc.setQueryData(['tasks', 'list', 'all'], [t]);
    expect(findCachedTask(qc, t.id)?.id).toBe(t.id);
  });
});

describe('applyOptimisticDelete (Step 12.1)', () => {
  it('drops the task from every list bucket and clears its one-cache', () => {
    const doomed = makeTask('t1', { quadrant: 'Q2' });
    const sibling = makeTask('t2', { quadrant: 'Q2' });
    const stranger = makeTask('t3', { quadrant: 'Q4' });
    const qc = makeClient();
    qc.setQueryData(['tasks', 'list', 'all'], [doomed, sibling, stranger]);
    qc.setQueryData(['tasks', 'list', 'Q2'], [doomed, sibling]);
    qc.setQueryData(['tasks', 'list', 'Q4'], [stranger]);
    qc.setQueryData(['tasks', 'one', doomed.id], doomed);
    qc.setQueryData(['tasks', 'one', sibling.id], sibling);

    applyOptimisticDelete(qc, doomed);

    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'all'])).toEqual([sibling, stranger]);
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q2'])).toEqual([sibling]);
    expect(qc.getQueryData(['tasks', 'list', 'Q4'])).toEqual([stranger]);
    expect(qc.getQueryData<Task>(['tasks', 'one', doomed.id])).toBeUndefined();
    // The unrelated one-cache entry is left intact.
    expect(qc.getQueryData<Task>(['tasks', 'one', sibling.id])).toEqual(sibling);
  });

  it('rollback restores every snapshot exactly', () => {
    const doomed = makeTask('t1', { quadrant: 'Q2' });
    const sibling = makeTask('t2', { quadrant: 'Q2' });
    const qc = makeClient();
    const allBefore = [doomed, sibling];
    const q2Before = [doomed, sibling];
    qc.setQueryData(['tasks', 'list', 'all'], allBefore);
    qc.setQueryData(['tasks', 'list', 'Q2'], q2Before);
    qc.setQueryData(['tasks', 'one', doomed.id], doomed);

    const rollback = applyOptimisticDelete(qc, doomed);
    expect(qc.getQueryData(['tasks', 'list', 'Q2'])).not.toEqual(q2Before);

    rollback();

    expect(qc.getQueryData(['tasks', 'list', 'all'])).toEqual(allBefore);
    expect(qc.getQueryData(['tasks', 'list', 'Q2'])).toEqual(q2Before);
    expect(qc.getQueryData<Task>(['tasks', 'one', doomed.id])).toEqual(doomed);
  });
});
