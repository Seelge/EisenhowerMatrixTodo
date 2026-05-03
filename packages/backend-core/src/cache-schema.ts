/**
 * IndexedDB cache schema used in front of every backend.
 *
 * The cache lets the app stay local-first: writes commit to IDB
 * immediately and queue for sync, reads are served from IDB, and
 * the sync engine reconciles with each backend in the background.
 *
 * This module declares only TypeScript types — no IDB open / migrate
 * code lives here. The first concrete implementation lands in Phase 2
 * inside `@emt/backend-local-indexeddb` and the sync engine package.
 *
 * Data flow:
 *
 *   ┌──────────────┐    write          ┌────────────┐
 *   │  app / view  │ ───────────────▶ │  IDB tasks │
 *   └──────────────┘                   └─────┬──────┘
 *           │                                │ (mirrors canonical Task)
 *           │ enqueueWrite                   ▼
 *           │                          ┌────────────┐
 *           ▼                          │ IDB outbox │ ← pending writes
 *      ┌──────────┐  flush(backend)    └─────┬──────┘   (per backend)
 *      │  Sync    │ ─────────────────────────┘
 *      │  Engine  │
 *      │          │  pull(backend)     ┌────────────┐
 *      │          │ ◀──────────────── │ adapter    │ ← changesSince(cursor)
 *      └─────┬────┘                    └────────────┘
 *            │ apply remote ops
 *            ▼
 *      ┌────────────┐
 *      │  IDB tasks │ ← upserts / deletes from remote
 *      └────────────┘
 *      ┌──────────────┐
 *      │ IDB cursors  │ ← per-backend last-consumed cursor
 *      └──────────────┘
 *
 * On conflict (a task has both a queued local change AND a remote
 * change since the last cursor), the engine invokes the registered
 * `ConflictResolver` and writes the chosen side to both ends.
 */

import type { Cursor } from './adapter.ts';
import type { BackendId, Task, TaskId } from './task.ts';

/**
 * Object store: `tasks`. Keyed by `${backendId}:${taskId}` so multiple
 * backends can coexist in a single database. Mirrors the canonical
 * `Task` shape plus a composite key field.
 *
 * Indexes (planned):
 * - `byBackend`           on `backendId`
 * - `byBackendQuadrant`   on `[backendId, quadrant]`
 * - `byBackendStatus`     on `[backendId, status]`
 * - `byUpdatedAt`         on `updatedAt`
 */
export interface TaskRecord extends Task {
  /** Composite primary key: `${backendId}:${taskId}`. */
  readonly key: string;
}

/** Operation kind enqueued in the outbox. */
export type OutboxOp = 'create' | 'update' | 'delete';

/**
 * Object store: `outbox`. Auto-incrementing primary key. One row per
 * pending write that the sync engine still needs to push to a backend.
 *
 * - `payload` carries either a full `Task` (for create / update) or
 *   just `{ id, backendId }` (for delete).
 * - `attempts` and `lastError` track retry state for backoff.
 *
 * Indexes (planned):
 * - `byBackend` on `backendId`
 */
export interface OutboxRecord {
  /** Auto-incrementing key assigned by IDB. */
  readonly seq: number;
  readonly op: OutboxOp;
  readonly backendId: BackendId;
  readonly taskId: TaskId;
  readonly payload: Task | { readonly id: TaskId; readonly backendId: BackendId };
  /** Number of flush attempts so far. */
  attempts: number;
  /** ISO datetime of the last attempt. Undefined before the first try. */
  lastAttemptAt?: string;
  /** Stringified error from the last failed attempt. */
  lastError?: string;
}

/**
 * Object store: `cursors`. Keyed by `backendId`. Value is the most
 * recent cursor that the sync engine has consumed from that backend.
 *
 * The local IndexedDB backend uses a sequence number; remote
 * backends use whatever opaque token they return.
 */
export interface CursorRecord {
  readonly backendId: BackendId;
  readonly cursor: Cursor;
  readonly updatedAt: string;
}

/**
 * Names of the object stores. Centralized so the IDB open-and-migrate
 * code in Phase 2 stays in lockstep with the consumers.
 */
export const STORE_NAMES = {
  tasks: 'tasks',
  outbox: 'outbox',
  cursors: 'cursors',
} as const satisfies Record<string, string>;

/**
 * Compose the composite key for a `tasks` row.
 */
export function taskKey(backendId: BackendId, taskId: TaskId): string {
  return `${backendId}:${taskId}`;
}
