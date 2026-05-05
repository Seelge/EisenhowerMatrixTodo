import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';

import type {
  BackendAdapter,
  BackendDescriptor,
  BackendId,
  ChangeSet,
  Cursor,
  MetaStore,
  Quadrant,
  Task,
  TaskDraft,
  TaskId,
  TaskPatch,
} from '../src/index.ts';
import { BackendRegistry, META_DEFAULT_BACKEND_KEY } from '../src/index.ts';
import { createIdbMetaStore, openSyncDb } from '../src/sync-engine.ts';

class StubAdapter implements BackendAdapter {
  constructor(private readonly descriptor: BackendDescriptor) {}

  describe(): BackendDescriptor {
    return this.descriptor;
  }
  list(_quadrant?: Quadrant): Promise<readonly Task[]> {
    return Promise.resolve([]);
  }
  get(_id: TaskId): Promise<Task | undefined> {
    return Promise.resolve(undefined);
  }
  create(_draft: TaskDraft): Promise<Task> {
    return Promise.reject(new Error('not used'));
  }
  update(_id: TaskId, _patch: TaskPatch): Promise<Task> {
    return Promise.reject(new Error('not used'));
  }
  delete(_id: TaskId): Promise<void> {
    return Promise.resolve();
  }
  changesSince(_cursor?: Cursor): Promise<ChangeSet> {
    return Promise.resolve({ upserts: [], deletes: [], cursor: '0' });
  }
}

function makeAdapter(id: string, displayName = id): StubAdapter {
  return new StubAdapter({
    id: id as BackendId,
    displayName,
    capabilities: { dueTime: true, priority: true, recurrence: true },
  });
}

class InMemoryMeta implements MetaStore {
  readonly entries = new Map<string, string>();
  get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.entries.get(key));
  }
  set(key: string, value: string): Promise<void> {
    this.entries.set(key, value);
    return Promise.resolve();
  }
  delete(key: string): Promise<void> {
    this.entries.delete(key);
    return Promise.resolve();
  }
}

describe('BackendRegistry', () => {
  describe('registration', () => {
    it('registers, lists, and resolves adapters by id', () => {
      const registry = new BackendRegistry();
      const a = makeAdapter('a');
      const b = makeAdapter('b');

      registry.register(a);
      registry.register(b);

      expect(registry.get('a' as BackendId)).toBe(a);
      expect(registry.get('b' as BackendId)).toBe(b);
      expect(registry.get('missing' as BackendId)).toBeUndefined();
      expect(registry.list()).toEqual([a, b]);
    });

    it('replaces an existing adapter when re-registering the same id', () => {
      const registry = new BackendRegistry();
      const v1 = makeAdapter('a', 'first');
      const v2 = makeAdapter('a', 'second');
      registry.register(v1);
      registry.register(v2);

      expect(registry.list()).toHaveLength(1);
      expect(registry.get('a' as BackendId)).toBe(v2);
    });

    it('removes adapters via unregister', () => {
      const registry = new BackendRegistry();
      const a = makeAdapter('a');
      registry.register(a);
      registry.unregister('a' as BackendId);

      expect(registry.get('a' as BackendId)).toBeUndefined();
      expect(registry.list()).toEqual([]);
    });
  });

  describe('default selection', () => {
    it('returns undefined when no adapters are registered', () => {
      const registry = new BackendRegistry();
      expect(registry.getDefault()).toBeUndefined();
    });

    it('falls back to the first registered adapter when no default is set', () => {
      const registry = new BackendRegistry();
      const a = makeAdapter('a');
      const b = makeAdapter('b');
      registry.register(a);
      registry.register(b);

      expect(registry.getDefault()).toBe(a);
    });

    it('honors setDefault and writes the new id to the meta store', async () => {
      const meta = new InMemoryMeta();
      const registry = new BackendRegistry({ meta });
      const a = makeAdapter('a');
      const b = makeAdapter('b');
      registry.register(a);
      registry.register(b);

      await registry.setDefault('b' as BackendId);

      expect(registry.getDefault()).toBe(b);
      expect(meta.entries.get(META_DEFAULT_BACKEND_KEY)).toBe('b');
    });

    it('throws when setDefault targets an unregistered backend', async () => {
      const registry = new BackendRegistry();
      await expect(registry.setDefault('ghost' as BackendId)).rejects.toThrow(/unregistered/i);
    });

    it('falls back to first-registered when the persisted default is no longer registered', async () => {
      const meta = new InMemoryMeta();
      meta.entries.set(META_DEFAULT_BACKEND_KEY, 'gone');
      const registry = new BackendRegistry({ meta });
      await registry.load();

      const a = makeAdapter('a');
      registry.register(a);

      expect(registry.getDefault()).toBe(a);
    });
  });

  describe('persistence across re-instantiation', () => {
    it('rehydrates the persisted default-id via load()', async () => {
      const meta = new InMemoryMeta();

      // First session: register two backends, mark `b` as default.
      const session1 = new BackendRegistry({ meta });
      await session1.load();
      session1.register(makeAdapter('a'));
      session1.register(makeAdapter('b'));
      await session1.setDefault('b' as BackendId);

      // Second session: same meta store, fresh adapters.
      const session2 = new BackendRegistry({ meta });
      await session2.load();
      const a2 = makeAdapter('a');
      const b2 = makeAdapter('b');
      session2.register(a2);
      session2.register(b2);

      expect(session2.getDefault()).toBe(b2);
    });

    it('persists across an IDB-backed meta store re-open', async () => {
      const dbName = `registry-test-${Date.now()}-${Math.random()}`;

      const db1 = await openSyncDb(dbName);
      const meta1 = createIdbMetaStore(db1);
      const r1 = new BackendRegistry({ meta: meta1 });
      await r1.load();
      r1.register(makeAdapter('a'));
      r1.register(makeAdapter('b'));
      await r1.setDefault('b' as BackendId);
      db1.close();

      const db2 = await openSyncDb(dbName);
      const meta2 = createIdbMetaStore(db2);
      const r2 = new BackendRegistry({ meta: meta2 });
      await r2.load();
      const b2 = makeAdapter('b');
      r2.register(makeAdapter('a'));
      r2.register(b2);

      expect(r2.getDefault()).toBe(b2);
      db2.close();
    });
  });

  describe('IDB meta store', () => {
    let dbName: string;

    beforeEach(() => {
      dbName = `meta-test-${Date.now()}-${Math.random()}`;
    });

    it('round-trips set / get / delete', async () => {
      const db = await openSyncDb(dbName);
      const meta = createIdbMetaStore(db);

      expect(await meta.get('k')).toBeUndefined();
      await meta.set('k', 'v1');
      expect(await meta.get('k')).toBe('v1');
      await meta.set('k', 'v2');
      expect(await meta.get('k')).toBe('v2');
      await meta.delete('k');
      expect(await meta.get('k')).toBeUndefined();
      db.close();
    });
  });
});
