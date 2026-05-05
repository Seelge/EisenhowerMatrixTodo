import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  BackendAdapter,
  BackendDescriptor,
  BackendId,
  ChangeSet,
  ConflictRecord,
  ConflictResolver,
  Cursor,
  CursorStore,
  LocalTaskCache,
  Quadrant,
  Task,
  TaskDraft,
  TaskId,
  TaskPatch,
} from '../src/index.ts';
import { taskKey } from '../src/index.ts';
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
  /** Caller-controlled hook for `changesSince`. Defaults to empty + cursor '0'. */
  nextChanges: (cursor: Cursor | undefined) => ChangeSet = () => ({
    upserts: [],
    deletes: [],
    cursor: '0',
  });
  /** Cursors observed in `changesSince` calls. */
  readonly seenCursors: (Cursor | undefined)[] = [];

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

  changesSince(cursor?: Cursor): Promise<ChangeSet> {
    this.seenCursors.push(cursor);
    return Promise.resolve(this.nextChanges(cursor));
  }
}

class InMemoryCache implements LocalTaskCache {
  readonly tasks = new Map<string, Task>();

  get(backendId: BackendId, taskId: TaskId): Promise<Task | undefined> {
    return Promise.resolve(this.tasks.get(taskKey(backendId, taskId)));
  }
  put(task: Task): Promise<void> {
    this.tasks.set(taskKey(task.backendId, task.id), task);
    return Promise.resolve();
  }
  delete(backendId: BackendId, taskId: TaskId): Promise<void> {
    this.tasks.delete(taskKey(backendId, taskId));
    return Promise.resolve();
  }
}

class InMemoryCursorStore implements CursorStore {
  readonly cursors = new Map<BackendId, Cursor>();

  get(backendId: BackendId): Promise<Cursor | undefined> {
    return Promise.resolve(this.cursors.get(backendId));
  }
  set(backendId: BackendId, cursor: Cursor): Promise<void> {
    this.cursors.set(backendId, cursor);
    return Promise.resolve();
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

  describe('pull', () => {
    let cache: InMemoryCache;
    let cursors: InMemoryCursorStore;
    let pullEngine: DefaultSyncEngine;

    beforeEach(() => {
      cache = new InMemoryCache();
      cursors = new InMemoryCursorStore();
      pullEngine = new DefaultSyncEngine({
        outbox,
        getAdapter: (id) => (id === REMOTE ? adapter : undefined),
        cache,
        cursors,
        sleep: noSleep,
        random: () => 0,
      });
    });

    it('applies a clean pull verbatim and persists the new cursor', async () => {
      const resolver = vi.fn<ConflictResolver>();
      pullEngine.setConflictResolver(resolver);

      const t1 = makeTask({ title: 'remote-1' });
      const t2 = makeTask({ title: 'remote-2' });
      adapter.nextChanges = () => ({ upserts: [t1, t2], deletes: [], cursor: 'c1' });

      const result = await pullEngine.pull(REMOTE);

      expect(result).toEqual({ applied: 2, conflicts: 0, cursor: 'c1' });
      expect(resolver).not.toHaveBeenCalled();
      expect(await cache.get(REMOTE, t1.id)).toEqual(t1);
      expect(await cache.get(REMOTE, t2.id)).toEqual(t2);
      expect(await cursors.get(REMOTE)).toBe('c1');
    });

    it('passes the previously stored cursor to the adapter on subsequent pulls', async () => {
      adapter.nextChanges = () => ({ upserts: [], deletes: [], cursor: 'c1' });
      await pullEngine.pull(REMOTE);
      adapter.nextChanges = () => ({ upserts: [], deletes: [], cursor: 'c2' });
      await pullEngine.pull(REMOTE);

      expect(adapter.seenCursors).toEqual([undefined, 'c1']);
      expect(await cursors.get(REMOTE)).toBe('c2');
    });

    it('does not overwrite local-only edits when the remote has no changes', async () => {
      const local = makeTask({ title: 'local-edit' });
      await cache.put(local);
      await pullEngine.enqueueWrite('update', local);

      adapter.nextChanges = () => ({ upserts: [], deletes: [], cursor: 'c1' });
      const result = await pullEngine.pull(REMOTE);

      expect(result).toEqual({ applied: 0, conflicts: 0, cursor: 'c1' });
      expect(await cache.get(REMOTE, local.id)).toEqual(local);
      const queued = await outbox.list();
      expect(queued).toHaveLength(1);
    });

    it('invokes the resolver once per true conflict and persists the chosen side', async () => {
      const localA = makeTask({ id: 'a' as TaskId, title: 'local-A' });
      const remoteA: Task = { ...localA, title: 'remote-A' };
      const localB = makeTask({ id: 'b' as TaskId, title: 'local-B', notes: 'local-notes' });
      const remoteB: Task = { ...localB, title: 'remote-B', notes: 'remote-notes' };

      await cache.put(localA);
      await cache.put(localB);
      await pullEngine.enqueueWrite('update', localA);
      await pullEngine.enqueueWrite('update', localB);

      adapter.nextChanges = () => ({ upserts: [remoteA, remoteB], deletes: [], cursor: 'c1' });

      const seen: ConflictRecord[] = [];
      pullEngine.setConflictResolver(async (record) => {
        seen.push(record);
        // Keep local on A, take remote on B.
        return record.local.id === localA.id ? 'local' : 'remote';
      });

      const result = await pullEngine.pull(REMOTE);

      expect(result.conflicts).toBe(2);
      expect(result.applied).toBe(1); // only B applied; A kept local
      expect(seen).toHaveLength(2);
      expect(seen.find((r) => r.local.id === localA.id)?.differingFields).toEqual(['title']);
      expect(seen.find((r) => r.local.id === localB.id)?.differingFields).toEqual([
        'title',
        'notes',
      ]);

      // Cache reflects the chosen sides.
      expect(await cache.get(REMOTE, localA.id)).toEqual(localA);
      expect(await cache.get(REMOTE, localB.id)).toEqual(remoteB);

      // Outbox: A's local-update entry remains queued (will push local back
      // to backend); B's was dropped because remote won.
      const queued = await outbox.list();
      expect(queued).toHaveLength(1);
      expect(queued[0]?.taskId).toBe(localA.id);
    });

    it('skips remote upserts when no resolver is needed (identical remote)', async () => {
      const local = makeTask({ title: 'same' });
      await cache.put(local);
      await pullEngine.enqueueWrite('update', local);

      const resolver = vi.fn<ConflictResolver>();
      pullEngine.setConflictResolver(resolver);
      adapter.nextChanges = () => ({ upserts: [{ ...local }], deletes: [], cursor: 'c1' });

      const result = await pullEngine.pull(REMOTE);

      expect(result).toEqual({ applied: 1, conflicts: 0, cursor: 'c1' });
      expect(resolver).not.toHaveBeenCalled();
    });

    it('throws on conflict when no resolver is registered', async () => {
      const local = makeTask({ title: 'local' });
      await cache.put(local);
      await pullEngine.enqueueWrite('update', local);

      adapter.nextChanges = () => ({
        upserts: [{ ...local, title: 'remote' }],
        deletes: [],
        cursor: 'c1',
      });

      await expect(pullEngine.pull(REMOTE)).rejects.toThrow(/no ConflictResolver/i);
    });

    it('applies remote deletes and drops a coincident pending delete', async () => {
      const t = makeTask();
      await cache.put(t);
      await pullEngine.enqueueWrite('delete', { id: t.id, backendId: REMOTE });

      adapter.nextChanges = () => ({ upserts: [], deletes: [t.id], cursor: 'c1' });
      const result = await pullEngine.pull(REMOTE);

      expect(result).toEqual({ applied: 1, conflicts: 0, cursor: 'c1' });
      expect(await cache.get(REMOTE, t.id)).toBeUndefined();
      expect(await outbox.list()).toHaveLength(0);
    });

    it('throws when the backend has no registered adapter', async () => {
      await expect(pullEngine.pull('unknown' as BackendId)).rejects.toThrow(/No adapter/i);
    });
  });
});
