import { describe, expect, it, vi } from 'vitest';

import type {
  BackendAdapter,
  BackendDescriptor,
  BackendId,
  ChangeSet,
  Cursor,
  Quadrant,
  StaleSourceEvent,
  Task,
  TaskDraft,
  TaskId,
  TaskPatch,
} from '../src/index.ts';
import { migrateTask } from '../src/index.ts';

interface AdapterState {
  readonly tasks: Map<TaskId, Task>;
  failNextCreate?: boolean;
  failNextDelete?: boolean;
}

class StubAdapter implements BackendAdapter {
  readonly state: AdapterState = { tasks: new Map() };
  /** Operations the adapter accepted, in order. */
  readonly applied: { readonly op: 'create' | 'update' | 'delete'; readonly id: TaskId }[] = [];

  constructor(private readonly id: BackendId) {}

  describe(): BackendDescriptor {
    return {
      id: this.id,
      displayName: this.id,
      capabilities: { dueTime: true, priority: true, recurrence: true },
    };
  }

  list(_quadrant?: Quadrant): Promise<readonly Task[]> {
    return Promise.resolve([...this.state.tasks.values()]);
  }

  get(id: TaskId): Promise<Task | undefined> {
    return Promise.resolve(this.state.tasks.get(id));
  }

  create(draft: TaskDraft): Promise<Task> {
    if (this.state.failNextCreate === true) {
      this.state.failNextCreate = false;
      return Promise.reject(new Error(`stub ${String(this.id)}: create rejected`));
    }
    const id = crypto.randomUUID() as TaskId;
    const now = new Date().toISOString();
    const task: Task = {
      ...draft,
      tags: [...draft.tags],
      id,
      backendId: this.id,
      createdAt: now,
      updatedAt: now,
    };
    this.state.tasks.set(id, task);
    this.applied.push({ op: 'create', id });
    return Promise.resolve(task);
  }

  update(_id: TaskId, _patch: TaskPatch): Promise<Task> {
    return Promise.reject(new Error('not used in migrate tests'));
  }

  delete(id: TaskId): Promise<void> {
    if (this.state.failNextDelete === true) {
      this.state.failNextDelete = false;
      return Promise.reject(new Error(`stub ${String(this.id)}: delete rejected`));
    }
    this.state.tasks.delete(id);
    this.applied.push({ op: 'delete', id });
    return Promise.resolve();
  }

  changesSince(_cursor?: Cursor): Promise<ChangeSet> {
    return Promise.resolve({ upserts: [], deletes: [], cursor: '0' });
  }

  /** Test helper: seed a task directly without going through `create`. */
  seed(task: Task): void {
    this.state.tasks.set(task.id, task);
  }
}

const SRC: BackendId = 'src' as BackendId;
const DST: BackendId = 'dst' as BackendId;

function seededTask(backendId: BackendId, overrides: Partial<Task> = {}): Task {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID() as TaskId,
    backendId,
    title: 'Original',
    notes: 'note body',
    priority: 'high',
    quadrant: 'Q2',
    status: 'open',
    tags: ['alpha', 'beta'],
    dueDate: '2026-06-01',
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeContext(): {
  source: StubAdapter;
  target: StubAdapter;
  getAdapter: (id: BackendId) => BackendAdapter | undefined;
} {
  const source = new StubAdapter(SRC);
  const target = new StubAdapter(DST);
  const getAdapter = (id: BackendId): BackendAdapter | undefined =>
    id === SRC ? source : id === DST ? target : undefined;
  return { source, target, getAdapter };
}

describe('migrateTask', () => {
  it('creates on target, deletes from source, and returns the new task', async () => {
    const { source, target, getAdapter } = makeContext();
    const original = seededTask(SRC, { title: 'Migrate me' });
    source.seed(original);

    const onStaleSource = vi.fn<(event: StaleSourceEvent) => void>();

    const created = await migrateTask({ getAdapter, onStaleSource }, original.id, SRC, DST);

    expect(created.id).not.toBe(original.id);
    expect(created.backendId).toBe(DST);
    expect(created.title).toBe('Migrate me');
    expect(created.notes).toBe(original.notes);
    expect(created.priority).toBe(original.priority);
    expect(created.quadrant).toBe(original.quadrant);
    expect(created.status).toBe(original.status);
    expect(created.tags).toEqual(original.tags);
    expect(created.dueDate).toBe(original.dueDate);

    expect(await source.get(original.id)).toBeUndefined();
    expect(await target.get(created.id)).toEqual(created);
    expect(onStaleSource).not.toHaveBeenCalled();
  });

  describe('target-create failure', () => {
    it('leaves the source untouched and surfaces the error', async () => {
      const { source, target, getAdapter } = makeContext();
      const original = seededTask(SRC);
      source.seed(original);
      target.state.failNextCreate = true;

      const onStaleSource = vi.fn<(event: StaleSourceEvent) => void>();

      await expect(
        migrateTask({ getAdapter, onStaleSource }, original.id, SRC, DST),
      ).rejects.toThrow(/create rejected/);

      // Source still holds the original; target never received anything.
      expect(await source.get(original.id)).toEqual(original);
      expect(target.applied).toHaveLength(0);
      expect(await target.list()).toHaveLength(0);
      expect(onStaleSource).not.toHaveBeenCalled();
    });
  });

  describe('source-delete failure after target-create success', () => {
    it('returns the new task and raises a stale-source event', async () => {
      const { source, target, getAdapter } = makeContext();
      const original = seededTask(SRC);
      source.seed(original);
      source.state.failNextDelete = true;

      const events: StaleSourceEvent[] = [];

      const created = await migrateTask(
        { getAdapter, onStaleSource: (event) => events.push(event) },
        original.id,
        SRC,
        DST,
      );

      expect(created.backendId).toBe(DST);
      expect(await target.get(created.id)).toEqual(created);
      // Source still holds the stale copy — that's the whole point of the event.
      expect(await source.get(original.id)).toEqual(original);

      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        sourceBackendId: SRC,
        sourceTaskId: original.id,
        targetBackendId: DST,
        targetTaskId: created.id,
      });
      expect((events[0]?.error as Error).message).toMatch(/delete rejected/);
    });

    it('still returns the new task when no onStaleSource handler is registered', async () => {
      const { source, target, getAdapter } = makeContext();
      const original = seededTask(SRC);
      source.seed(original);
      source.state.failNextDelete = true;

      const created = await migrateTask({ getAdapter }, original.id, SRC, DST);

      expect(created.backendId).toBe(DST);
      expect(await source.get(original.id)).toEqual(original);
      expect(await target.get(created.id)).toEqual(created);
    });
  });

  describe('input validation', () => {
    it('throws when source and target are the same backend', async () => {
      const { getAdapter } = makeContext();
      await expect(migrateTask({ getAdapter }, 'whatever' as TaskId, SRC, SRC)).rejects.toThrow(
        /same backend/i,
      );
    });

    it('throws when the source backend is unregistered', async () => {
      const { getAdapter } = makeContext();
      await expect(
        migrateTask({ getAdapter }, 'whatever' as TaskId, 'ghost' as BackendId, DST),
      ).rejects.toThrow(/Source backend "ghost"/);
    });

    it('throws when the target backend is unregistered', async () => {
      const { getAdapter } = makeContext();
      await expect(
        migrateTask({ getAdapter }, 'whatever' as TaskId, SRC, 'ghost' as BackendId),
      ).rejects.toThrow(/Target backend "ghost"/);
    });

    it('throws when the task does not exist on the source', async () => {
      const { getAdapter } = makeContext();
      await expect(migrateTask({ getAdapter }, 'missing' as TaskId, SRC, DST)).rejects.toThrow(
        /not found/i,
      );
    });
  });
});
