/**
 * Cross-backend task migration.
 *
 * `migrateTask` moves a task from one backend to another by:
 *   1. reading the source task,
 *   2. creating an equivalent on the target,
 *   3. deleting the source.
 *
 * The two failure paths (per `plan.md` Step 2.7):
 *
 * - **Target-create fails.** The source is untouched; the error is
 *   surfaced to the caller. No partial state.
 * - **Source-delete fails after a successful target-create.** The new
 *   task is returned to the caller (the migration is logically
 *   committed on the target) and a {@link StaleSourceEvent} is raised
 *   so the UI can offer a manual cleanup later.
 *
 * The function is intentionally side-effect-light: it does not touch
 * the local cache or outbox itself. Callers integrate it with the sync
 * engine — typically by enqueueing the appropriate writes after the
 * migration resolves — so caching policy stays in one place.
 */

import type { BackendAdapter, TaskDraft } from './adapter.ts';
import type { BackendId, Task, TaskId } from './task.ts';

/**
 * Raised when the target-create succeeded but the source-delete
 * failed. The source backend still holds the original task; the UI
 * should offer the user a way to retry the delete (or dismiss).
 */
export interface StaleSourceEvent {
  readonly sourceBackendId: BackendId;
  readonly sourceTaskId: TaskId;
  readonly targetBackendId: BackendId;
  /** The id assigned by the target backend to the migrated task. */
  readonly targetTaskId: TaskId;
  /** The original error thrown by the source adapter's `delete` call. */
  readonly error: unknown;
}

export interface MigrateOptions {
  /**
   * Resolves a `BackendId` to its registered adapter. Returning
   * `undefined` causes `migrateTask` to throw with a descriptive
   * error before any backend write is attempted.
   */
  readonly getAdapter: (id: BackendId) => BackendAdapter | undefined;
  /**
   * Called with a {@link StaleSourceEvent} when the source-delete
   * fails after a successful target-create. Optional; consumers that
   * do not need cleanup tracking may omit it.
   */
  readonly onStaleSource?: (event: StaleSourceEvent) => void;
}

/**
 * Migrate a single task between backends.
 *
 * Throws if either backend is unregistered, the source/target are the
 * same, the task is not found on the source, or the target's `create`
 * call fails. Returns the freshly-created target task on success
 * (including the partial-success case where source-delete failed).
 */
export async function migrateTask(
  options: MigrateOptions,
  taskId: TaskId,
  fromBackendId: BackendId,
  toBackendId: BackendId,
): Promise<Task> {
  if (fromBackendId === toBackendId) {
    throw new Error(`Cannot migrate task to the same backend "${String(fromBackendId)}"`);
  }
  const source = options.getAdapter(fromBackendId);
  if (source === undefined) {
    throw new Error(`Source backend "${String(fromBackendId)}" is not registered`);
  }
  const target = options.getAdapter(toBackendId);
  if (target === undefined) {
    throw new Error(`Target backend "${String(toBackendId)}" is not registered`);
  }

  const original = await source.get(taskId);
  if (original === undefined) {
    throw new Error(`Task "${String(taskId)}" not found in backend "${String(fromBackendId)}"`);
  }

  const draft: TaskDraft = {
    title: original.title,
    notes: original.notes,
    priority: original.priority,
    quadrant: original.quadrant,
    status: original.status,
    tags: [...original.tags],
    ...(original.dueDate !== undefined ? { dueDate: original.dueDate } : {}),
    ...(original.dueTime !== undefined ? { dueTime: original.dueTime } : {}),
    ...(original.completedAt !== undefined ? { completedAt: original.completedAt } : {}),
  };

  // Target-create failure propagates to the caller — source is untouched.
  const created = await target.create(draft);

  try {
    await source.delete(taskId);
  } catch (error) {
    options.onStaleSource?.({
      sourceBackendId: fromBackendId,
      sourceTaskId: taskId,
      targetBackendId: toBackendId,
      targetTaskId: created.id,
      error,
    });
  }

  return created;
}
