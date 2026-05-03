/**
 * Sync engine contract.
 *
 * The sync engine is the glue between the local IDB cache (see
 * `cache-schema.ts`) and the registered backend adapters. The app
 * never talks to adapters directly for writes — it goes through the
 * sync engine, which:
 *
 *  1. commits writes to IDB immediately (local-first),
 *  2. enqueues a job in the outbox for each affected backend,
 *  3. flushes the outbox to the backend on demand or when online,
 *  4. pulls remote changes via `BackendAdapter.changesSince(cursor)`,
 *  5. invokes the registered `ConflictResolver` when both sides
 *     changed a task since the last cursor, then writes the chosen
 *     side to both ends.
 *
 * The interface is intentionally small. Implementations live in the
 * core package and ship as the default; alternate engines (e.g., a
 * test-only synchronous one) are encouraged.
 */

import type { Cursor } from './adapter.ts';
import type { ConflictResolver } from './conflict.ts';
import type { BackendId, Task, TaskId } from './task.ts';

/** Reference to a task without its full payload — used for deletes. */
export interface TaskRef {
  readonly id: TaskId;
  readonly backendId: BackendId;
}

/** Result of a flush call. */
export interface FlushResult {
  /** Number of outbox entries successfully pushed to a backend. */
  readonly flushed: number;
  /** Number of outbox entries that failed and remain queued for retry. */
  readonly failed: number;
}

/** Result of a pull call. */
export interface PullResult {
  /** Number of remote upserts / deletes applied to the local cache. */
  readonly applied: number;
  /**
   * Number of conflicts detected and resolved during the pull. Each
   * conflict produces exactly one `ConflictResolver` invocation.
   */
  readonly conflicts: number;
  /** New cursor after the pull. */
  readonly cursor: Cursor;
}

/**
 * Sync engine. The app holds a single instance, registers backends
 * with the {@link BackendRegistry} (Phase 2), and calls these methods
 * from queries / commands.
 */
export interface SyncEngine {
  /**
   * Enqueue a write to the outbox. The local cache must already be
   * updated by the caller (sync engine does not write IDB twice).
   *
   * `'create'` and `'update'` carry the full Task payload; `'delete'`
   * carries only `TaskRef`.
   */
  enqueueWrite(op: 'create' | 'update', task: Task): Promise<void>;
  enqueueWrite(op: 'delete', ref: TaskRef): Promise<void>;

  /**
   * Push pending outbox entries to the backend(s). When `backendId`
   * is omitted, flushes every backend with queued work. Failures are
   * retained in the outbox for retry; this method does not throw on
   * adapter errors but reports them in `failed`.
   */
  flush(backendId?: BackendId): Promise<FlushResult>;

  /**
   * Pull remote changes from the given backend, apply them to the
   * local cache, and resolve any conflicts via the registered
   * resolver. Updates the per-backend cursor on completion.
   *
   * Throws only on programmer errors (unknown backendId, missing
   * resolver when one is needed). Adapter errors propagate to the
   * caller.
   */
  pull(backendId: BackendId): Promise<PullResult>;

  /**
   * Register the application-level conflict resolver. The engine
   * stores a single resolver; subsequent calls replace it. Without a
   * resolver, `pull` throws when it encounters a conflict.
   */
  setConflictResolver(resolver: ConflictResolver): void;
}
