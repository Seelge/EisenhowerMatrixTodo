/**
 * Conflict-resolution contract.
 *
 * When the sync engine pulls remote changes for a task that has also
 * been modified locally since the last sync, it surfaces the conflict
 * to the application via a `ConflictResolver` callback. The resolver
 * picks a side; the sync engine then writes the chosen record to both
 * ends so they reconverge.
 *
 * Per `design-input.md`: resolution is whole-record (not field-merge).
 * The user picks "keep local" or "keep remote" via a side-by-side diff
 * modal in `view3` (Phase 10). For headless tests, supply a synchronous
 * implementation that returns a fixed choice.
 */

import type { Task } from './task.ts';

/**
 * The set of fields whose values differ between local and remote.
 * Read-only identity / timestamp fields are never reported here even
 * if they technically differ.
 */
export type DifferingField = Exclude<keyof Task, 'id' | 'backendId' | 'createdAt' | 'updatedAt'>;

/**
 * A single pending conflict. The sync engine constructs one of these
 * per conflicting task and passes it to the registered `ConflictResolver`.
 */
export interface ConflictRecord {
  /** Local copy as last persisted by this app. */
  readonly local: Task;
  /** Remote copy as last fetched from the backend. */
  readonly remote: Task;
  /** Fields whose values differ between `local` and `remote`. */
  readonly differingFields: readonly DifferingField[];
}

/**
 * Resolves a single conflict by returning the side to keep.
 *
 * Returning `'local'` instructs the sync engine to write the local
 * record over the remote; `'remote'` instructs the inverse. Either
 * way, after the engine completes its writes both sides hold the
 * chosen record.
 *
 * All choices are async to allow user prompting (e.g., the modal in
 * `view3`). Resolvers may also be implemented headlessly in tests
 * (return `Promise.resolve('local')`, etc.).
 */
export type ConflictResolver = (record: ConflictRecord) => Promise<'local' | 'remote'>;
