/**
 * Local-IndexedDB backend adapter — basic CRUD.
 *
 * Persists canonical {@link Task} records in an IndexedDB database. This
 * is the always-available local backend; remote backends (Google,
 * Microsoft) are layered on top of the same {@link BackendAdapter}
 * contract.
 *
 * `changesSince` is intentionally unimplemented in this step — change
 * tracking lands in step 2.3 (DB v2 migration adds a `seq` field plus a
 * `deletions` store).
 */

import type {
  BackendAdapter,
  BackendDescriptor,
  BackendId,
  ChangeSet,
  Cursor,
  Quadrant,
  Task,
  TaskDraft,
  TaskId,
  TaskPatch,
} from '@emt/backend-core';

import { TASKS_STORE, openLocalDb } from './db.js';
import type { LocalDb } from './db.ts';

export interface LocalIndexedDbAdapterOptions {
  /** Backend id surfaced via {@link describe}. Defaults to `'local'`. */
  readonly id?: string;
  /** Human-readable label. Defaults to `'Local'`. */
  readonly displayName?: string;
  /** IndexedDB database name. Defaults to `id` (so `'local'`). */
  readonly databaseName?: string;
}

/**
 * Open and initialize a {@link LocalIndexedDbAdapter}. The adapter holds
 * a connection to its IDB database for its lifetime.
 */
export async function createLocalIndexedDbAdapter(
  options: LocalIndexedDbAdapterOptions = {},
): Promise<LocalIndexedDbAdapter> {
  const id = options.id ?? 'local';
  const dbName = options.databaseName ?? id;
  const db = await openLocalDb(dbName);
  return new LocalIndexedDbAdapter(db, {
    id: id as BackendId,
    displayName: options.displayName ?? 'Local',
    capabilities: { dueTime: true, priority: true, recurrence: true },
  });
}

export class LocalIndexedDbAdapter implements BackendAdapter {
  private lastTimeMs = 0;

  constructor(
    private readonly db: LocalDb,
    private readonly descriptor: BackendDescriptor,
  ) {}

  describe(): BackendDescriptor {
    return this.descriptor;
  }

  async list(quadrant?: Quadrant): Promise<readonly Task[]> {
    if (quadrant === undefined) {
      return this.db.getAll(TASKS_STORE);
    }
    return this.db.getAllFromIndex(TASKS_STORE, 'byQuadrant', quadrant);
  }

  async get(id: TaskId): Promise<Task | undefined> {
    return this.db.get(TASKS_STORE, id);
  }

  async create(draft: TaskDraft): Promise<Task> {
    const now = this.nextIso();
    const task: Task = {
      ...draft,
      tags: [...draft.tags],
      id: crypto.randomUUID() as TaskId,
      backendId: this.descriptor.id,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.add(TASKS_STORE, task);
    return task;
  }

  async update(id: TaskId, patch: TaskPatch): Promise<Task> {
    const tx = this.db.transaction(TASKS_STORE, 'readwrite');
    const existing = await tx.store.get(id);
    if (!existing) {
      await tx.done;
      throw new Error(`LocalIndexedDbAdapter: unknown task id ${String(id)}`);
    }
    const next: Task = {
      ...existing,
      ...patch,
      tags: patch.tags ? [...patch.tags] : existing.tags,
      id: existing.id,
      backendId: existing.backendId,
      createdAt: existing.createdAt,
      updatedAt: this.nextIso(),
    };
    await tx.store.put(next);
    await tx.done;
    return next;
  }

  async delete(id: TaskId): Promise<void> {
    await this.db.delete(TASKS_STORE, id);
  }

  async changesSince(_cursor?: Cursor): Promise<ChangeSet> {
    throw new Error('LocalIndexedDbAdapter.changesSince: not yet implemented (step 2.3)');
  }

  /** Close the underlying IDB connection. Tests use this between cases. */
  close(): void {
    this.db.close();
  }

  // Per-instance monotonic ISO timestamp. Date.now() resolution is 1 ms,
  // so back-to-back writes can collide; we bump forward to keep
  // updatedAt strictly increasing within an adapter.
  private nextIso(): string {
    let ms = Date.now();
    if (ms <= this.lastTimeMs) ms = this.lastTimeMs + 1;
    this.lastTimeMs = ms;
    return new Date(ms).toISOString();
  }
}
