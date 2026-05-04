/**
 * Default {@link SyncEngine} implementation.
 *
 * Step 2.4 scope: enqueueWrite + flush. The outbox is persisted in
 * IndexedDB (via the {@link OutboxStore} abstraction so tests can inject
 * an in-memory implementation, but the canonical backing is IDB per the
 * cache schema in `cache-schema.ts`).
 *
 * Pull / conflict handling lands in Step 2.5.
 */

import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

import type { BackendAdapter } from './adapter.ts';
import { STORE_NAMES } from './cache-schema.js';
import type { OutboxOp, OutboxRecord } from './cache-schema.ts';
import type { ConflictResolver } from './conflict.ts';
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

interface SyncDbSchema extends DBSchema {
  [STORE_NAMES.outbox]: {
    key: number;
    value: OutboxRecord;
    indexes: { byBackend: BackendId };
  };
}

/** Connection type returned by {@link openSyncDb}. */
export type SyncDb = IDBPDatabase<SyncDbSchema>;

export const SYNC_DB_VERSION = 1;

/**
 * Open (and migrate) the sync-engine IDB database. Currently holds only
 * the `outbox` store; future steps add `cursors` and the cached `tasks`
 * mirror per `cache-schema.ts`.
 */
export function openSyncDb(name = 'emt-sync'): Promise<SyncDb> {
  return openDB<SyncDbSchema>(name, SYNC_DB_VERSION, {
    upgrade(db) {
      const store = db.createObjectStore(STORE_NAMES.outbox, {
        keyPath: 'seq',
        autoIncrement: true,
      });
      store.createIndex('byBackend', 'backendId');
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

export interface DefaultSyncEngineOptions {
  /** Backing store for the outbox. */
  readonly outbox: OutboxStore;
  /**
   * Look up the adapter for a backend id. Returning `undefined` signals
   * that the backend is not currently reachable (e.g. offline / not yet
   * connected); affected entries stay queued without consuming retries.
   */
  readonly getAdapter: (backendId: BackendId) => BackendAdapter | undefined;
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

/**
 * Default sync-engine implementation. The pull / conflict path is a
 * placeholder until Step 2.5; calling `pull` throws.
 */
export class DefaultSyncEngine implements SyncEngine {
  private readonly outbox: OutboxStore;
  private readonly getAdapter: (id: BackendId) => BackendAdapter | undefined;
  private readonly maxAttempts: number;
  private readonly baseBackoffMs: number;
  private readonly maxBackoffMs: number;
  private readonly random: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  // Stored for Step 2.5 — read by `pull` once that lands.
  private resolver: ConflictResolver | undefined;

  constructor(options: DefaultSyncEngineOptions) {
    this.outbox = options.outbox;
    this.getAdapter = options.getAdapter;
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

  pull(_backendId: BackendId): Promise<PullResult> {
    void this.resolver;
    return Promise.reject(
      new Error('DefaultSyncEngine.pull is not implemented yet (lands in Step 2.5)'),
    );
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
