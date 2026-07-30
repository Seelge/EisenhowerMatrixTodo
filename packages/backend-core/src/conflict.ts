/**
 * Conflict-resolution contract.
 *
 * When the sync engine pulls remote changes for a task that has also
 * been modified locally since the last sync, it surfaces the conflict
 * to the application via a `ConflictResolver` callback. The resolver
 * picks a side (or a field-level merge); the sync engine then writes
 * the chosen record so both ends reconverge.
 *
 * Phase 21 extends whole-record local/remote with an optional merged
 * {@link Task} built from per-field picks in the conflict modal.
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
 * Resolver outcome:
 * - `'local'` / `'remote'` — keep that whole record
 * - `{ merged }` — field-level blend; engine writes this task to cache
 *   and updates the pending outbox payload so the next flush pushes it
 */
export type ConflictResolution = 'local' | 'remote' | { readonly merged: Task };

/**
 * Resolves a single conflict.
 *
 * All choices are async to allow user prompting. Resolvers may also be
 * implemented headlessly in tests (`Promise.resolve('local')`, etc.).
 */
export type ConflictResolver = (record: ConflictRecord) => Promise<ConflictResolution>;

function copyTask(source: Task): Task {
  return {
    id: source.id,
    backendId: source.backendId,
    title: source.title,
    notes: source.notes,
    priority: source.priority,
    quadrant: source.quadrant,
    status: source.status,
    tags: [...source.tags],
    createdAt: source.createdAt,
    updatedAt: source.updatedAt,
    ...(source.dueDate !== undefined ? { dueDate: source.dueDate } : {}),
    ...(source.dueTime !== undefined ? { dueTime: source.dueTime } : {}),
    ...(source.completedAt !== undefined ? { completedAt: source.completedAt } : {}),
  };
}

function applyField(target: Task, source: Task, field: DifferingField): void {
  switch (field) {
    case 'title':
      target.title = source.title;
      break;
    case 'notes':
      target.notes = source.notes;
      break;
    case 'priority':
      target.priority = source.priority;
      break;
    case 'quadrant':
      target.quadrant = source.quadrant;
      break;
    case 'status':
      target.status = source.status;
      break;
    case 'tags':
      target.tags = [...source.tags];
      break;
    case 'dueDate':
      if (source.dueDate === undefined) delete target.dueDate;
      else target.dueDate = source.dueDate;
      break;
    case 'dueTime':
      if (source.dueTime === undefined) delete target.dueTime;
      else target.dueTime = source.dueTime;
      break;
    case 'completedAt':
      if (source.completedAt === undefined) delete target.completedAt;
      else target.completedAt = source.completedAt;
      break;
  }
}

/**
 * Build a task from per-field side picks. Fields not listed in
 * `choices` keep the local value (they should already match remote).
 */
export function buildMergedTask(
  local: Task,
  remote: Task,
  choices: Readonly<Partial<Record<DifferingField, 'local' | 'remote'>>>,
): Task {
  const out = copyTask(local);
  for (const [field, side] of Object.entries(choices) as [DifferingField, 'local' | 'remote'][]) {
    applyField(out, side === 'local' ? local : remote, field);
  }
  return out;
}

/** Collapse uniform picks to a whole-record side when possible. */
export function resolutionFromFieldPicks(
  local: Task,
  remote: Task,
  differingFields: readonly DifferingField[],
  picks: Readonly<Record<DifferingField, 'local' | 'remote'>>,
): ConflictResolution {
  if (differingFields.length === 0) return 'local';
  const sides = differingFields.map((f) => picks[f]);
  if (sides.every((s) => s === 'local')) return 'local';
  if (sides.every((s) => s === 'remote')) return 'remote';
  return { merged: buildMergedTask(local, remote, picks) };
}
