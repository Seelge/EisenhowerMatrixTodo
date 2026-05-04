/**
 * Local-IndexedDB backend adapter.
 *
 * Persists canonical {@link Task} records in an IndexedDB database. This
 * is the always-available local backend; remote backends (Google,
 * Microsoft) are layered on top of the same {@link BackendAdapter}
 * contract.
 *
 * Change tracking is implemented via a per-database monotonic `seq`
 * stamped on every mutation (see `db.ts`). `changesSince(cursor)`
 * surfaces both upserts (from the `tasks` store) and tombstones
 * (from the `deletions` store) above the given watermark.
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
import type { IDBPObjectStore } from 'idb';

import { DELETIONS_STORE, META_STORE, TASKS_STORE, openLocalDb } from './db.js';
import type { LocalDb, LocalDbSchema, LocalTaskRecord } from './db.ts';

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

function stripSeq(record: LocalTaskRecord): Task {
  const { seq: _seq, ...task } = record;
  return task;
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
    const records =
      quadrant === undefined
        ? await this.db.getAll(TASKS_STORE)
        : await this.db.getAllFromIndex(TASKS_STORE, 'byQuadrant', quadrant);
    return records.map(stripSeq);
  }

  async get(id: TaskId): Promise<Task | undefined> {
    const record = await this.db.get(TASKS_STORE, id);
    return record === undefined ? undefined : stripSeq(record);
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
    const tx = this.db.transaction([TASKS_STORE, META_STORE], 'readwrite');
    const seq = await allocateSeq(tx.objectStore(META_STORE));
    const record: LocalTaskRecord = { ...task, seq };
    await tx.objectStore(TASKS_STORE).add(record);
    await tx.done;
    return task;
  }

  async update(id: TaskId, patch: TaskPatch): Promise<Task> {
    const tx = this.db.transaction([TASKS_STORE, META_STORE], 'readwrite');
    const tasksStore = tx.objectStore(TASKS_STORE);
    const existing = await tasksStore.get(id);
    if (!existing) {
      await tx.done;
      throw new Error(`LocalIndexedDbAdapter: unknown task id ${String(id)}`);
    }
    const seq = await allocateSeq(tx.objectStore(META_STORE));
    const next: LocalTaskRecord = {
      ...existing,
      ...patch,
      tags: patch.tags ? [...patch.tags] : existing.tags,
      id: existing.id,
      backendId: existing.backendId,
      createdAt: existing.createdAt,
      updatedAt: this.nextIso(),
      seq,
    };
    await tasksStore.put(next);
    await tx.done;
    return stripSeq(next);
  }

  async delete(id: TaskId): Promise<void> {
    const tx = this.db.transaction([TASKS_STORE, DELETIONS_STORE, META_STORE], 'readwrite');
    const tasksStore = tx.objectStore(TASKS_STORE);
    const existing = await tasksStore.get(id);
    if (!existing) {
      // Idempotent: deleting an unknown id is a no-op (no tombstone
      // written, since there was nothing to tombstone).
      await tx.done;
      return;
    }
    const seq = await allocateSeq(tx.objectStore(META_STORE));
    await tasksStore.delete(id);
    await tx.objectStore(DELETIONS_STORE).put({ id, seq });
    await tx.done;
  }

  async changesSince(cursor?: Cursor): Promise<ChangeSet> {
    const since = parseCursor(cursor);
    const range = IDBKeyRange.lowerBound(since, true);
    const tx = this.db.transaction([TASKS_STORE, DELETIONS_STORE, META_STORE], 'readonly');
    const upsertRecords = await tx.objectStore(TASKS_STORE).index('bySeq').getAll(range);
    const deletionRecords = await tx.objectStore(DELETIONS_STORE).index('bySeq').getAll(range);
    const nextSeq = (await tx.objectStore(META_STORE).get('nextSeq')) ?? 1;
    await tx.done;

    upsertRecords.sort((a, b) => a.seq - b.seq);
    deletionRecords.sort((a, b) => a.seq - b.seq);

    return {
      upserts: upsertRecords.map(stripSeq),
      deletes: deletionRecords.map((d) => d.id),
      cursor: String(nextSeq - 1),
    };
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

/**
 * Reserve the next sequence number using the supplied open `meta` store.
 * The caller's transaction must be `readwrite` over `META_STORE`.
 */
async function allocateSeq(
  meta: IDBPObjectStore<LocalDbSchema, readonly StoreScope[], typeof META_STORE, 'readwrite'>,
): Promise<number> {
  const current = (await meta.get('nextSeq')) ?? 1;
  await meta.put(current + 1, 'nextSeq');
  return current;
}

type StoreScope = typeof TASKS_STORE | typeof DELETIONS_STORE | typeof META_STORE;

function parseCursor(cursor: Cursor | undefined): number {
  if (cursor === undefined) return 0;
  const n = Number.parseInt(cursor, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}
