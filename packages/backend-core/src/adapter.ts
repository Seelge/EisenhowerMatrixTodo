/**
 * Backend adapter contract.
 *
 * Every storage backend (in-memory, local IndexedDB, Google Tasks,
 * Microsoft To-Do, ...) implements `BackendAdapter`. The interface is
 * deliberately small so implementations can be added without churning
 * upstream code.
 */

import type { BackendId, Quadrant, Task, TaskId } from './task.ts';

/**
 * Opaque change-stream cursor produced by an adapter. Callers must not
 * inspect or compare cursors across backends — each adapter defines its
 * own format (sequence number, ETag, server timestamp, ...).
 */
export type Cursor = string;

/**
 * Delta of changes returned by {@link BackendAdapter.changesSince}.
 *
 * - `upserts` contains tasks that were created or modified since the
 *   provided cursor, in the order they should be applied.
 * - `deletes` contains the ids of tasks that were removed since the
 *   provided cursor. Ids may refer to tasks the caller never saw.
 * - `cursor` is the new cursor to pass to the next `changesSince` call.
 *   It is monotonic per adapter instance.
 */
export interface ChangeSet {
  readonly upserts: readonly Task[];
  readonly deletes: readonly TaskId[];
  readonly cursor: Cursor;
}

/**
 * What a backend can natively represent. Fields the backend cannot
 * represent are encoded into `Task.notes` by the adapter on write and
 * decoded on read, so the canonical model round-trips losslessly through
 * any backend (see `design-input.md`).
 *
 * Capabilities surface to the UI as small "won't sync natively" hints
 * next to affected fields (View 3).
 */
export interface BackendCapabilities {
  /** True if the backend stores time-of-day natively. Google Tasks: false. */
  readonly dueTime: boolean;
  /** True if the backend has a native priority field. Google Tasks: false. */
  readonly priority: boolean;
  /** True if the backend supports recurrence natively. Google Tasks: false. */
  readonly recurrence: boolean;
}

/**
 * Self-description of an adapter — used by the registry and by the
 * options UI ("Backends" panel) to label and discriminate between
 * registered backends.
 */
export interface BackendDescriptor {
  readonly id: BackendId;
  readonly displayName: string;
  readonly capabilities: BackendCapabilities;
}

/**
 * Input shape for {@link BackendAdapter.create}. The adapter assigns
 * `id`, `createdAt`, `updatedAt`, and stamps its own `backendId`, so
 * callers must not provide those fields.
 *
 * (Spec deviation from `plan.md` Step 1.2: `backendId` is also adapter-
 * owned. Callers know which adapter they are calling and shouldn't have
 * to repeat the id.)
 */
export type TaskDraft = Omit<Task, 'id' | 'backendId' | 'createdAt' | 'updatedAt'>;

/**
 * Input shape for {@link BackendAdapter.update}. Read-only identity and
 * timestamp fields cannot be patched: `id`, `backendId`, `createdAt` are
 * immutable; `updatedAt` is set by the adapter on every write.
 */
export type TaskPatch = Partial<Omit<Task, 'id' | 'backendId' | 'createdAt' | 'updatedAt'>>;

/**
 * Storage adapter contract.
 *
 * # Concurrency
 *
 * All methods may be called concurrently. Implementations must serialize
 * conflicting writes internally (or document otherwise). Two concurrent
 * `update` calls against the same task resolve last-write-wins at the
 * field level — both writes succeed and the resulting `Task` reflects
 * the union of the two patches with the second-applied patch winning on
 * any overlapping field. Both writes advance `updatedAt`.
 *
 * # Idempotency
 *
 * - `delete` is idempotent: deleting a non-existent id resolves successfully.
 * - `update` is not inherently idempotent — applying the same patch twice
 *   advances `updatedAt` twice — but the resulting task state is stable.
 * - `create` produces a fresh id every call; calling it twice with the
 *   same draft produces two distinct tasks.
 *
 * # Errors
 *
 * Methods throw `Error` (or subclasses) on failure. Implementations are
 * encouraged to throw subclasses with stable `name` values for retryable
 * vs. terminal failures (e.g. `BackendOfflineError`, `BackendAuthError`)
 * but the base contract does not mandate specific error types.
 */
export interface BackendAdapter {
  /** Returns the descriptor for this adapter. Synchronous and cheap. */
  describe(): BackendDescriptor;

  /**
   * Returns all tasks stored in this backend, optionally filtered to a
   * single quadrant. Includes both `open` and `done` tasks. Order is
   * unspecified — callers must sort.
   */
  list(quadrant?: Quadrant): Promise<readonly Task[]>;

  /**
   * Returns the task with the given id, or `undefined` if no such task
   * exists in this backend.
   */
  get(id: TaskId): Promise<Task | undefined>;

  /**
   * Creates a new task. The adapter assigns `id`, `backendId`,
   * `createdAt`, and `updatedAt`. Returns the persisted task with
   * those fields populated.
   */
  create(draft: TaskDraft): Promise<Task>;

  /**
   * Applies `patch` to the task with the given id and returns the
   * updated task. Fields not present in `patch` are preserved.
   * Advances `updatedAt`. Throws if the id does not exist in this
   * backend.
   */
  update(id: TaskId, patch: TaskPatch): Promise<Task>;

  /**
   * Removes the task with the given id. Idempotent: resolves
   * successfully when the id does not exist.
   */
  delete(id: TaskId): Promise<void>;

  /**
   * Returns the changes that occurred since the provided `cursor`.
   *
   * - When called with no cursor (initial sync), returns the full
   *   current state as `upserts` plus a fresh cursor.
   * - When called with a stale or unknown cursor, the adapter may
   *   either return the full state again or throw — implementations
   *   should document their choice.
   *
   * The returned cursor must be passed to the next `changesSince` call
   * to continue the stream. Cursors are not exchangeable between
   * adapter instances.
   */
  changesSince(cursor?: Cursor): Promise<ChangeSet>;
}
