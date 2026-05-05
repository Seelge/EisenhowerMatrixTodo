/**
 * Default {@link SyncEngine} implementation.
 *
 * Steps 2.4–2.5: enqueueWrite + flush + pull + conflict detection. The
 * outbox and per-backend cursors are persisted in IndexedDB (via the
 * {@link OutboxStore} / {@link CursorStore} abstractions so tests can
 * inject in-memory implementations). The canonical backings are IDB per
 * the cache schema in `cache-schema.ts`.
 *
 * The local task cache is injected as an opaque {@link LocalTaskCache}
 * — pull writes remote upserts/deletes through it. Its concrete IDB
 * implementation lives outside this module (the cache will be wired up
 * when the app integrates with the registry).
 */

import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

import type { BackendAdapter, Cursor } from './adapter.ts';
import { STORE_NAMES } from './cache-schema.js';
import type { CursorRecord, OutboxOp, OutboxRecord } from './cache-schema.ts';
import type { ConflictRecord, ConflictResolver, DifferingField } from './conflict.ts';
import type { FlushResult, PullResult, SyncEngine, TaskRef } from './sync.ts';
import type { BackendId, Task, TaskId } from './task.ts';

/**
 * Storage for pending outbox entries. Decouples the engine from the
 * concrete persistence layer so tests can swap in an in-memory store.
 *
 * Implementations must preserve insertion order via `seq` and serialize
 * concurrent appends so each entry receives a unique `seq`.
 */
export interface OutboxStore {
  /**
   * Return outbox entries, optionally filtered to a single backend, in
   * ascending `seq` order.
   */
  list(backendId?: BackendId): Promise<readonly OutboxRecord[]>;
  /** Append a new entry; returns the persisted record with `seq` set. */
  append(entry: OutboxAppend): Promise<OutboxRecord>;
  /** Persist an updated entry (e.g. after a failed flush attempt). */
  update(entry: OutboxRecord): Promise<void>;
  /** Remove an entry by `seq` (called after a successful flush). */
  delete(seq: number): Promise<void>;
}

/** Input shape for {@link OutboxStore.append} — `seq` is assigned by the store. */
export type OutboxAppend = Omit<OutboxRecord, 'seq'>;

/**
 * Per-backend cursor persistence. The sync engine reads the most
 * recently consumed cursor before calling `BackendAdapter.changesSince`
 * and writes back the cursor returned by the adapter on completion.
 */
export interface CursorStore {
  get(backendId: BackendId): Promise<Cursor | undefined>;
  set(backendId: BackendId, cursor: Cursor): Promise<void>;
}

interface SyncDbSchema extends DBSchema {
  [STORE_NAMES.outbox]: {
    key: number;
    value: OutboxRecord;
    indexes: { byBackend: BackendId };
  };
  [STORE_NAMES.cursors]: {
    key: BackendId;
    value: CursorRecord;
  };
}

/** Connection type returned by {@link openSyncDb}. */
export type SyncDb = IDBPDatabase<SyncDbSchema>;

export const SYNC_DB_VERSION = 2;

/**
 * Open (and migrate) the sync-engine IDB database. Holds the `outbox`
 * (v1) and `cursors` (v2) stores; the cached `tasks` mirror lives in a
 * separate IDB owned by the cache layer per `cache-schema.ts`.
 */
export function openSyncDb(name = 'emt-sync'): Promise<SyncDb> {
  return openDB<SyncDbSchema>(name, SYNC_DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const outbox = db.createObjectStore(STORE_NAMES.outbox, {
          keyPath: 'seq',
          autoIncrement: true,
        });
        outbox.createIndex('byBackend', 'backendId');
      }
      if (oldVersion < 2) {
        db.createObjectStore(STORE_NAMES.cursors, { keyPath: 'backendId' });
      }
    },
  });
}

/** IDB-backed {@link OutboxStore}. */
export function createIdbOutboxStore(db: SyncDb): OutboxStore {
  return new IdbOutboxStore(db);
}

class IdbOutboxStore implements OutboxStore {
  constructor(private readonly db: SyncDb) {}

  async list(backendId?: BackendId): Promise<readonly OutboxRecord[]> {
    const rows =
      backendId === undefined
        ? await this.db.getAll(STORE_NAMES.outbox)
        : await this.db.getAllFromIndex(STORE_NAMES.outbox, 'byBackend', backendId);
    return [...rows].sort((a, b) => a.seq - b.seq);
  }

  async append(entry: OutboxAppend): Promise<OutboxRecord> {
    // keyPath='seq' + autoIncrement: IDB assigns the seq on the in-line
    // key path. The `as` cast is necessary because the schema value type
    // requires seq, but the key generator fills it in.
    const seq = await this.db.add(STORE_NAMES.outbox, entry as unknown as OutboxRecord);
    return { ...entry, seq };
  }

  async update(entry: OutboxRecord): Promise<void> {
    await this.db.put(STORE_NAMES.outbox, entry);
  }

  async delete(seq: number): Promise<void> {
    await this.db.delete(STORE_NAMES.outbox, seq);
  }
}

/** IDB-backed {@link CursorStore}. */
export function createIdbCursorStore(db: SyncDb): CursorStore {
  return new IdbCursorStore(db);
}

class IdbCursorStore implements CursorStore {
  constructor(private readonly db: SyncDb) {}

  async get(backendId: BackendId): Promise<Cursor | undefined> {
    const row = await this.db.get(STORE_NAMES.cursors, backendId);
    return row?.cursor;
  }

  async set(backendId: BackendId, cursor: Cursor): Promise<void> {
    const record: CursorRecord = {
      backendId,
      cursor,
      updatedAt: new Date().toISOString(),
    };
    await this.db.put(STORE_NAMES.cursors, record);
  }
}

/**
 * Local task cache used by `pull` to apply remote changes and to read
 * the current local copy when computing field-level conflict diffs.
 *
 * Implementations key tasks by `(backendId, taskId)` — see
 * {@link taskKey} in `cache-schema.ts`.
 */
export interface LocalTaskCache {
  get(backendId: BackendId, taskId: TaskId): Promise<Task | undefined>;
  put(task: Task): Promise<void>;
  delete(backendId: BackendId, taskId: TaskId): Promise<void>;
}

export interface DefaultSyncEngineOptions {
  /** Backing store for the outbox. */
  readonly outbox: OutboxStore;
  /**
   * Look up the adapter for a backend id. Returning `undefined` signals
   * that the backend is not currently reachable (e.g. offline / not yet
   * connected); affected entries stay queued without consuming retries.
   */
  readonly getAdapter: (backendId: BackendId) => BackendAdapter | undefined;
  /**
   * Local task cache. Required for `pull`; flush-only deployments may
   * omit it.
   */
  readonly cache?: LocalTaskCache;
  /**
   * Per-backend cursor persistence. Required for `pull`; flush-only
   * deployments may omit it.
   */
  readonly cursors?: CursorStore;
  /** Max attempts per outbox entry per `flush` call. Default 5. */
  readonly maxAttempts?: number;
  /** Base backoff in ms; doubled each attempt. Default 1000. */
  readonly baseBackoffMs?: number;
  /** Cap on the computed backoff delay. Default 60_000. */
  readonly maxBackoffMs?: number;
  /** Random source for jitter. Defaults to `Math.random`. */
  readonly random?: () => number;
  /** Sleep helper (injected in tests to avoid real timers). */
  readonly sleep?: (ms: number) => Promise<void>;
}

/** Default {@link SyncEngine} implementation. */
export class DefaultSyncEngine implements SyncEngine {
  private readonly outbox: OutboxStore;
  private readonly getAdapter: (id: BackendId) => BackendAdapter | undefined;
  private readonly cache: LocalTaskCache | undefined;
  private readonly cursors: CursorStore | undefined;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly random: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private resolver: ConflictResolver | undefined;

  constructor(options: DefaultSyncEngineOptions) {
    this.outbox = options.outbox;
    this.getAdapter = options.getAdapter;
    this.cache = options.cache;
    this.cursors = options.cursors;
    this.maxAttempts = options.maxAttempts ?? 5;
    this.baseBackoffMs = options.baseBackoffMs ?? 1000;
    this.maxBackoffMs = options.maxBackoffMs ?? 60_000;
    this.random = options.random ?? Math.random;
    this.sleep = options.sleep ?? defaultSleep;
  }

  enqueueWrite(op: 'create' | 'update', task: Task): Promise<void>;
  enqueueWrite(op: 'delete', ref: TaskRef): Promise<void>;
  async enqueueWrite(op: OutboxOp, payload: Task | TaskRef): Promise<void> {
    await this.outbox.append({
      op,
      backendId: payload.backendId,
      taskId: payload.id,
      payload,
      attempts: 0,
    });
  }

  async flush(backendId?: BackendId): Promise<FlushResult> {
    const entries = await this.outbox.list(backendId);
    let flushed = 0;
    let failed = 0;
    for (const entry of entries) {
      const result = await this.flushEntry(entry);
      if (result === 'flushed') flushed++;
      else if (result === 'failed') failed++;
      // 'deferred' (no adapter) is silently left queued for the next flush.
    }
    return { flushed, failed };
  }

  setConflictResolver(resolver: ConflictResolver): void {
    this.resolver = resolver;
  }

  async pull(backendId: BackendId): Promise<PullResult> {
    const adapter = this.getAdapter(backendId);
    if (adapter === undefined) {
      throw new Error(`No adapter registered for backend "${String(backendId)}"`);
    }
    if (this.cache === undefined) {
      throw new Error('DefaultSyncEngine.pull requires a `cache` option');
    }
    if (this.cursors === undefined) {
      throw new Error('DefaultSyncEngine.pull requires a `cursors` option');
    }
    const cache = this.cache;
    const cursorStore = this.cursors;

    const previousCursor = await cursorStore.get(backendId);
    const changes = await adapter.changesSince(previousCursor);

    const pendingByTaskId = new Map<TaskId, OutboxRecord>();
    for (const entry of await this.outbox.list(backendId)) {
      // Last entry wins if a task has multiple queued ops — flush drains
      // in seq order, so the latest is what would land at the backend.
      pendingByTaskId.set(entry.taskId, entry);
    }

    let applied = 0;
    let conflicts = 0;

    for (const remote of changes.upserts) {
      const pending = pendingByTaskId.get(remote.id);
      if (pending === undefined) {
        await cache.put(remote);
        applied++;
        continue;
      }
      // Local has a queued change for this task: a possible conflict.
      // We can only diff fields when both sides are full Tasks, which
      // means the local pending op is `create` or `update` (not `delete`)
      // and the cache holds the local copy.
      if (pending.op === 'delete') {
        // Local wants to delete; remote upserted. Leave local pending in
        // place — the queued delete will reach the backend on next flush.
        continue;
      }
      const localCached = await cache.get(backendId, remote.id);
      if (localCached === undefined) {
        // Pending create/update without a cache row is anomalous; fall
        // back to remote so we converge.
        await cache.put(remote);
        applied++;
        continue;
      }
      const differingFields = computeDifferingFields(localCached, remote);
      if (differingFields.length === 0) {
        await cache.put(remote);
        applied++;
        continue;
      }
      const resolver = this.resolver;
      if (resolver === undefined) {
        throw new Error(
          `Conflict on task ${String(remote.id)} but no ConflictResolver is registered`,
        );
      }
      const record: ConflictRecord = {
        local: localCached,
        remote,
        differingFields,
      };
      const choice = await resolver(record);
      conflicts++;
      if (choice === 'remote') {
        await cache.put(remote);
        // Drop the now-superseded local pending entry.
        await this.outbox.delete(pending.seq);
        applied++;
      } else {
        // Keep local. Cache already holds the local copy; the queued
        // outbox entry will push it to the backend on the next flush.
      }
    }

    for (const taskId of changes.deletes) {
      const pending = pendingByTaskId.get(taskId);
      if (pending !== undefined && pending.op !== 'delete') {
        // Local has a pending create/update; remote deleted. Leave local
        // alone — the queued local change will recreate / update on the
        // backend during the next flush.
        continue;
      }
      await cache.delete(backendId, taskId);
      if (pending !== undefined) {
        // Pending was also a delete: both sides agree. Drop the queued
        // entry since the backend has already deleted.
        await this.outbox.delete(pending.seq);
      }
      applied++;
    }

    await cursorStore.set(backendId, changes.cursor);
    return { applied, conflicts, cursor: changes.cursor };
  }

  private async flushEntry(entry: OutboxRecord): Promise<'flushed' | 'failed' | 'deferred'> {
    let mutable: OutboxRecord = entry;
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      const adapter = this.getAdapter(mutable.backendId);
      if (adapter === undefined) return 'deferred';
      try {
        await applyEntry(adapter, mutable);
        await this.outbox.delete(mutable.seq);
        return 'flushed';
      } catch (err) {
        mutable = {
          ...mutable,
          attempts: mutable.attempts + 1,
          lastAttemptAt: new Date().toISOString(),
          lastError: err instanceof Error ? err.message : String(err),
        };
        await this.outbox.update(mutable);
        if (attempt < this.maxAttempts) {
          await this.sleep(this.computeBackoff(attempt));
        }
      }
    }
    return 'failed';
  }

  private computeBackoff(attempt: number): number {
    const exp = Math.min(this.maxBackoffMs, this.baseBackoffMs * 2 ** (attempt - 1));
    return Math.floor(exp * this.random());
  }
}

async function applyEntry(adapter: BackendAdapter, entry: OutboxRecord): Promise<void> {
  if (entry.op === 'delete') {
    await adapter.delete(entry.taskId);
    return;
  }
  const task = entry.payload as Task;
  const draft = {
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    quadrant: task.quadrant,
    status: task.status,
    tags: [...task.tags],
    ...(task.dueDate !== undefined ? { dueDate: task.dueDate } : {}),
    ...(task.dueTime !== undefined ? { dueTime: task.dueTime } : {}),
    ...(task.completedAt !== undefined ? { completedAt: task.completedAt } : {}),
  };
  if (entry.op === 'create') {
    await adapter.create(draft);
  } else {
    await adapter.update(task.id as TaskId, draft);
  }
}

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const DIFFABLE_FIELDS = [
  'title',
  'notes',
  'dueDate',
  'dueTime',
  'priority',
  'quadrant',
  'status',
  'completedAt',
  'tags',
] as const satisfies readonly DifferingField[];

/**
 * Shallow field-level diff between two Tasks. Identity / timestamp
 * fields are intentionally excluded (see {@link DifferingField}).
 */
export function computeDifferingFields(local: Task, remote: Task): readonly DifferingField[] {
  const out: DifferingField[] = [];
  for (const field of DIFFABLE_FIELDS) {
    if (field === 'tags') {
      if (!stringArraysEqual(local.tags, remote.tags)) out.push(field);
    } else if (local[field] !== remote[field]) {
      out.push(field);
    }
  }
  return out;
}

function stringArraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
