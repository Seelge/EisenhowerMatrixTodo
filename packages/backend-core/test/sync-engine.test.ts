import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import type {
  BackendAdapter,
  BackendDescriptor,
  BackendId,
  ChangeSet,
  Quadrant,
  Task,
  TaskDraft,
  TaskId,
  TaskPatch,
} from '../src/index.ts';
import {
  createIdbOutboxStore,
  DefaultSyncEngine,
  openSyncDb,
  type OutboxStore,
} from '../src/sync-engine.ts';

const REMOTE: BackendId = 'remote' as BackendId;

interface StubAdapterOptions {
  /** Pre-loaded task ids. Used to make `update` succeed for those ids. */
  readonly preloaded?: ReadonlyArray<TaskId>;
}

class StubAdapter implements BackendAdapter {
  /** Operations the adapter has accepted (i.e. not thrown on). */
  readonly applied: { readonly op: 'create' | 'update' | 'delete'; readonly id: TaskId }[] = [];
  /** Total accept-or-reject decisions made. */
  attempts = 0;
  /** Caller-controlled hook: return true to fail the next call. */
  shouldFail: () => boolean = () => false;

  private readonly known = new Set<TaskId>();

  constructor(opts: StubAdapterOptions = {}) {
    for (const id of opts.preloaded ?? []) this.known.add(id);
  }

  describe(): BackendDescriptor {
    return {
      id: REMOTE,
      displayName: 'Stub',
      capabilities: { dueTime: true, priority: true, recurrence: true },
    };
  }

  list(_quadrant?: Quadrant): Promise<readonly Task[]> {
    return Promise.resolve([]);
  }

  get(_id: TaskId): Promise<Task | undefined> {
    return Promise.resolve(undefined);
  }

  async create(draft: TaskDraft): Promise<Task> {
    this.attempts++;
    if (this.shouldFail()) throw new Error('stub: create rejected');
    const id = crypto.randomUUID() as TaskId;
    this.known.add(id);
    this.applied.push({ op: 'create', id });
    const now = new Date().toISOString();
    return {
      ...draft,
      tags: [...draft.tags],
      id,
      backendId: REMOTE,
      createdAt: now,
      updatedAt: now,
    };
  }

  async update(id: TaskId, _patch: TaskPatch): Promise<Task> {
    this.attempts++;
    if (this.shouldFail()) throw new Error('stub: update rejected');
    if (!this.known.has(id)) throw new Error(`stub: unknown id ${String(id)}`);
    this.applied.push({ op: 'update', id });
    const now = new Date().toISOString();
    return {
      id,
      backendId: REMOTE,
      title: '',
      notes: '',
      priority: 'normal',
      quadrant: 'Q1',
      status: 'open',
      tags: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  async delete(id: TaskId): Promise<void> {
    this.attempts++;
    if (this.shouldFail()) throw new Error('stub: delete rejected');
    this.known.delete(id);
    this.applied.push({ op: 'delete', id });
  }

  changesSince(): Promise<ChangeSet> {
    return Promise.resolve({ upserts: [], deletes: [], cursor: '0' });
  }
}

function makeTask(overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID() as TaskId,
    backendId: REMOTE,
    title: 'Sample',
    notes: '',
    priority: 'normal',
    quadrant: 'Q1',
    status: 'open',
    tags: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

let dbCounter = 0;

async function freshOutbox(): Promise<OutboxStore> {
  const db = await openSyncDb(`sync-test-${Date.now()}-${++dbCounter}`);
  return createIdbOutboxStore(db);
}

const noSleep = (_ms: number): Promise<void> => Promise.resolve();

describe('DefaultSyncEngine', () => {
  let outbox: OutboxStore;
  let adapter: StubAdapter;
  let engine: DefaultSyncEngine;

  beforeEach(async () => {
    outbox = await freshOutbox();
    adapter = new StubAdapter();
    engine = new DefaultSyncEngine({
      outbox,
      getAdapter: (id) => (id === REMOTE ? adapter : undefined),
      sleep: noSleep,
      // Deterministic backoff (no jitter) — test runs faster and we don't
      // care about timing here; the cap math is exercised via maxBackoffMs.
      random: () => 0,
    });
  });

  describe('enqueueWrite', () => {
    it('persists each write to the outbox in insertion order', async () => {
      const t1 = makeTask({ title: 'one' });
      const t2 = makeTask({ title: 'two' });
      await engine.enqueueWrite('create', t1);
      await engine.enqueueWrite('update', t2);
      await engine.enqueueWrite('delete', { id: t1.id, backendId: t1.backendId });

      const queued = await outbox.list();
      expect(queued).toHaveLength(3);
      expect(queued.map((e) => e.op)).toEqual(['create', 'update', 'delete']);
      expect(queued.map((e) => e.taskId)).toEqual([t1.id, t2.id, t1.id]);
    });
  });

  describe('flush — happy path', () => {
    it('drains the outbox when every op succeeds', async () => {
      for (let i = 0; i < 5; i++) {
        await engine.enqueueWrite('create', makeTask({ title: `t${i}` }));
      }
      const result = await engine.flush();
      expect(result).toEqual({ flushed: 5, failed: 0 });
      expect(adapter.applied).toHaveLength(5);
      expect(await outbox.list()).toHaveLength(0);
    });

    it('is idempotent: a second flush after success is a no-op', async () => {
      await engine.enqueueWrite('create', makeTask());
      const first = await engine.flush();
      const second = await engine.flush();
      expect(first).toEqual({ flushed: 1, failed: 0 });
      expect(second).toEqual({ flushed: 0, failed: 0 });
      expect(adapter.applied).toHaveLength(1);
    });
  });

  describe('flush — flaky adapter', () => {
    it('retries with backoff and eventually drains 5 ops against a 50% flake', async () => {
      // Deterministic flake: alternate fail/success across all attempts.
      let n = 0;
      adapter.shouldFail = () => n++ % 2 === 0;

      for (let i = 0; i < 5; i++) {
        await engine.enqueueWrite('create', makeTask({ title: `t${i}` }));
      }
      const result = await engine.flush();
      expect(result).toEqual({ flushed: 5, failed: 0 });
      expect(adapter.applied).toHaveLength(5);
      expect(await outbox.list()).toHaveLength(0);
    });

    it('marks an entry failed after exceeding maxAttempts and leaves it queued', async () => {
      adapter.shouldFail = () => true;
      await engine.enqueueWrite('create', makeTask());
      const result = await engine.flush();
      expect(result).toEqual({ flushed: 0, failed: 1 });
      const remaining = await outbox.list();
      expect(remaining).toHaveLength(1);
      expect(remaining[0]?.attempts).toBe(5);
      expect(remaining[0]?.lastError).toMatch(/rejected/);
    });
  });

  describe('flush — offline / no adapter', () => {
    it('leaves entries queued without consuming retries when no adapter is registered', async () => {
      // Engine with no adapter for this backend.
      const offlineEngine = new DefaultSyncEngine({
        outbox,
        getAdapter: () => undefined,
        sleep: noSleep,
        random: () => 0,
      });
      await offlineEngine.enqueueWrite('create', makeTask());
      await offlineEngine.enqueueWrite('create', makeTask());

      const result = await offlineEngine.flush();
      expect(result).toEqual({ flushed: 0, failed: 0 });
      const queued = await outbox.list();
      expect(queued).toHaveLength(2);
      expect(queued.every((e) => e.attempts === 0)).toBe(true);
    });

    it('flushes successfully once the backend comes online', async () => {
      let online = false;
      const onlineLater = new DefaultSyncEngine({
        outbox,
        getAdapter: () => (online ? adapter : undefined),
        sleep: noSleep,
        random: () => 0,
      });

      // Enqueue while offline.
      await onlineLater.enqueueWrite('create', makeTask({ title: 'offline-1' }));
      await onlineLater.enqueueWrite('create', makeTask({ title: 'offline-2' }));
      const offlineFlush = await onlineLater.flush();
      expect(offlineFlush).toEqual({ flushed: 0, failed: 0 });
      expect(adapter.applied).toHaveLength(0);
      expect(await outbox.list()).toHaveLength(2);

      // Come back online.
      online = true;
      const onlineFlush = await onlineLater.flush();
      expect(onlineFlush).toEqual({ flushed: 2, failed: 0 });
      expect(adapter.applied).toHaveLength(2);
      expect(await outbox.list()).toHaveLength(0);
    });
  });

  describe('flush — backendId filter', () => {
    it('only drains entries for the requested backend', async () => {
      const otherId = 'other' as BackendId;
      const otherAdapter = new StubAdapter();
      const multiEngine = new DefaultSyncEngine({
        outbox,
        getAdapter: (id) => (id === REMOTE ? adapter : id === otherId ? otherAdapter : undefined),
        sleep: noSleep,
        random: () => 0,
      });
      await multiEngine.enqueueWrite('create', makeTask({ backendId: REMOTE, title: 'a' }));
      await multiEngine.enqueueWrite('create', makeTask({ backendId: otherId, title: 'b' }));

      const result = await multiEngine.flush(REMOTE);
      expect(result).toEqual({ flushed: 1, failed: 0 });
      expect(adapter.applied).toHaveLength(1);
      expect(otherAdapter.applied).toHaveLength(0);
      expect(await outbox.list()).toHaveLength(1);
      expect((await outbox.list())[0]?.backendId).toBe(otherId);
    });
  });

  describe('pull placeholder', () => {
    it('throws until Step 2.5 lands', async () => {
      await expect(engine.pull(REMOTE)).rejects.toThrow(/not implemented yet/);
    });
  });
});
