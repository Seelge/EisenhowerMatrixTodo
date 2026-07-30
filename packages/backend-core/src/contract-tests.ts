/**
 * Parameterized contract test suite for `BackendAdapter`.
 *
 * Every adapter package imports `runAdapterContract` and invokes it
 * with a factory that creates fresh adapter instances. The suite asserts
 * the behavioral contract documented on `BackendAdapter` so all
 * implementations stay interchangeable.
 *
 * Usage:
 *   import { runAdapterContract } from '@emt/backend-core';
 *   runAdapterContract('in-memory', () => Promise.resolve(new InMemoryAdapter()));
 */

import { beforeEach, describe, expect, it } from 'vitest';

import type { BackendAdapter, TaskDraft } from './adapter.ts';
import type { Quadrant, Task } from './task.ts';

/**
 * Factory contract: each call returns a fresh `BackendAdapter`. The
 * suite resets state between tests by re-invoking the factory in
 * `beforeEach`. The factory itself is responsible for any backing
 * store cleanup it needs (drop the IndexedDB, clear the Map, etc.).
 */
export type AdapterFactory = () => Promise<BackendAdapter>;

/**
 * Names of optional contract sections an adapter may skip while a feature
 * is still in progress. Used by partial implementations during a
 * multi-step rollout (e.g. the local-IndexedDB adapter skips
 * `changesSince` until step 2.3 lands change tracking).
 */
export type ContractSection = 'changesSince';

export interface AdapterContractOptions {
  /** Sections to mark as skipped instead of run. */
  readonly skip?: ReadonlyArray<ContractSection>;
}

const baseDraft: TaskDraft = {
  title: 'Sample',
  notes: '',
  priority: 'normal',
  quadrant: 'Q1',
  status: 'open',
  tags: [],
};

function draft(overrides: Partial<TaskDraft> = {}): TaskDraft {
  return { ...baseDraft, ...overrides };
}

/**
 * Run the full `BackendAdapter` contract suite against `factory`.
 *
 * @param name      Human-readable adapter name; appears in test output.
 * @param factory   Returns a fresh `BackendAdapter` each call. The
 *                  caller is responsible for ensuring the returned
 *                  instance starts with empty state — the suite invokes
 *                  the factory once per test in `beforeEach`.
 * @throws if `factory` is not a function.
 */
export function runAdapterContract(
  name: string,
  factory: AdapterFactory,
  options: AdapterContractOptions = {},
): void {
  if (typeof factory !== 'function') {
    throw new Error(`runAdapterContract(${JSON.stringify(name)}): no adapter factory provided`);
  }

  const skip = new Set<ContractSection>(options.skip ?? []);
  const describeChangesSince = skip.has('changesSince') ? describe.skip : describe;

  describe(`BackendAdapter contract — ${name}`, () => {
    let adapter: BackendAdapter;

    beforeEach(async () => {
      adapter = await factory();
    });

    describe('describe()', () => {
      it('returns a stable, complete descriptor', () => {
        const d1 = adapter.describe();
        const d2 = adapter.describe();
        expect(d1).toEqual(d2);
        expect(typeof d1.id).toBe('string');
        expect(d1.id.length).toBeGreaterThan(0);
        expect(typeof d1.displayName).toBe('string');
        expect(typeof d1.capabilities.dueTime).toBe('boolean');
        expect(typeof d1.capabilities.priority).toBe('boolean');
        expect(typeof d1.capabilities.recurrence).toBe('boolean');
      });
    });

    describe('create + get', () => {
      it('returns the persisted task with an id and timestamps', async () => {
        const created = await adapter.create(draft({ title: 'Hello' }));
        expect(created.id).toBeTruthy();
        expect(created.backendId).toBe(adapter.describe().id);
        expect(created.title).toBe('Hello');
        expect(created.createdAt).toBeTruthy();
        expect(created.updatedAt).toBeTruthy();

        const fetched = await adapter.get(created.id);
        expect(fetched).toEqual(created);
      });

      it('returns undefined for an unknown id', async () => {
        const fetched = await adapter.get('does-not-exist' as Task['id']);
        expect(fetched).toBeUndefined();
      });

      it('assigns distinct ids on each create', async () => {
        const a = await adapter.create(draft());
        const b = await adapter.create(draft());
        expect(a.id).not.toBe(b.id);
      });
    });

    describe('update', () => {
      it('applies a partial patch and preserves unspecified fields', async () => {
        const created = await adapter.create(
          draft({ title: 'Original', notes: 'Keep me', priority: 'low' }),
        );
        const updated = await adapter.update(created.id, { title: 'Patched' });
        expect(updated.title).toBe('Patched');
        expect(updated.notes).toBe('Keep me');
        expect(updated.priority).toBe('low');
      });

      it('advances updatedAt', async () => {
        const created = await adapter.create(draft());
        await new Promise((resolve) => setTimeout(resolve, 1));
        const updated = await adapter.update(created.id, { title: 'tick' });
        expect(new Date(updated.updatedAt).getTime()).toBeGreaterThanOrEqual(
          new Date(created.updatedAt).getTime(),
        );
        expect(updated.updatedAt).not.toBe(created.updatedAt);
      });

      it('throws when updating an unknown id', async () => {
        await expect(
          adapter.update('does-not-exist' as Task['id'], { title: 'x' }),
        ).rejects.toThrow();
      });

      it('clears optional fields when patch values are null', async () => {
        const created = await adapter.create(
          draft({ title: 'dated', dueDate: '2026-07-01', dueTime: '10:00' }),
        );
        const updated = await adapter.update(created.id, {
          dueDate: null,
          dueTime: null,
        });
        expect(updated.dueDate).toBeUndefined();
        expect(updated.dueTime).toBeUndefined();
        const fetched = await adapter.get(created.id);
        expect(fetched?.dueDate).toBeUndefined();
        expect(fetched?.dueTime).toBeUndefined();
      });
    });

    describe('delete', () => {
      it('removes the task; subsequent get returns undefined', async () => {
        const created = await adapter.create(draft());
        await adapter.delete(created.id);
        expect(await adapter.get(created.id)).toBeUndefined();
      });

      it('is idempotent — deleting an unknown id resolves successfully', async () => {
        await expect(adapter.delete('does-not-exist' as Task['id'])).resolves.toBeUndefined();
      });
    });

    describe('list', () => {
      it('returns all tasks (open + done) when called with no quadrant', async () => {
        await adapter.create(draft({ quadrant: 'Q1', status: 'open' }));
        await adapter.create(draft({ quadrant: 'Q2', status: 'open' }));
        await adapter.create(draft({ quadrant: 'Q3', status: 'done' }));
        const tasks = await adapter.list();
        expect(tasks).toHaveLength(3);
      });

      it('filters by quadrant when provided', async () => {
        await adapter.create(draft({ quadrant: 'Q1' }));
        await adapter.create(draft({ quadrant: 'Q1' }));
        await adapter.create(draft({ quadrant: 'Q2' }));
        const q1 = await adapter.list('Q1');
        const q2 = await adapter.list('Q2');
        const q3 = await adapter.list('Q3');
        expect(q1).toHaveLength(2);
        expect(q2).toHaveLength(1);
        expect(q3).toHaveLength(0);
      });

      it.each<Quadrant>(['Q1', 'Q2', 'Q3', 'Q4'])(
        'list(%s) returns only tasks in that quadrant',
        async (quadrant) => {
          await adapter.create(draft({ quadrant }));
          await adapter.create(draft({ quadrant: quadrant === 'Q1' ? 'Q2' : 'Q1' }));
          const result = await adapter.list(quadrant);
          expect(result.every((t) => t.quadrant === quadrant)).toBe(true);
        },
      );
    });

    describeChangesSince('changesSince', () => {
      it('returns the full state plus a cursor when called with no cursor', async () => {
        const a = await adapter.create(draft({ title: 'A' }));
        const b = await adapter.create(draft({ title: 'B' }));
        const result = await adapter.changesSince();
        const ids = new Set(result.upserts.map((t) => t.id));
        expect(ids.has(a.id)).toBe(true);
        expect(ids.has(b.id)).toBe(true);
        expect(result.deletes).toHaveLength(0);
        expect(typeof result.cursor).toBe('string');
        expect(result.cursor.length).toBeGreaterThan(0);
      });

      it('returns only writes that occurred after the cursor', async () => {
        await adapter.create(draft({ title: 'before' }));
        const { cursor } = await adapter.changesSince();
        const after = await adapter.create(draft({ title: 'after' }));
        const delta = await adapter.changesSince(cursor);
        const ids = delta.upserts.map((t) => t.id);
        expect(ids).toContain(after.id);
        expect(ids).not.toContain((await adapter.list()).find((t) => t.title === 'before')?.id);
      });

      it('reports deletions in the deletes list', async () => {
        const target = await adapter.create(draft());
        const { cursor } = await adapter.changesSince();
        await adapter.delete(target.id);
        const delta = await adapter.changesSince(cursor);
        expect(delta.deletes).toContain(target.id);
      });

      it('returns an advancing cursor', async () => {
        const c1 = (await adapter.changesSince()).cursor;
        await adapter.create(draft());
        const c2 = (await adapter.changesSince(c1)).cursor;
        expect(c2).not.toBe(c1);
      });
    });

    describe('concurrency', () => {
      it('serializes parallel updates: disjoint patches both apply', async () => {
        const created = await adapter.create(draft({ title: 'orig', notes: 'orig' }));
        await Promise.all([
          adapter.update(created.id, { title: 'A' }),
          adapter.update(created.id, { notes: 'B' }),
        ]);
        const final = await adapter.get(created.id);
        expect(final?.title).toBe('A');
        expect(final?.notes).toBe('B');
        expect(new Date(final?.updatedAt ?? 0).getTime()).toBeGreaterThanOrEqual(
          new Date(created.updatedAt).getTime(),
        );
      });

      it('serializes parallel updates: overlapping patches yield one of the values', async () => {
        const created = await adapter.create(draft({ title: 'orig' }));
        await Promise.all([
          adapter.update(created.id, { title: 'A' }),
          adapter.update(created.id, { title: 'B' }),
        ]);
        const final = await adapter.get(created.id);
        expect(['A', 'B']).toContain(final?.title);
      });
    });
  });
}
