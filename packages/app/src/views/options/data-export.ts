/**
 * Export / import pipeline for the Data panel (Step 9.6).
 *
 * Pure functions kept separate from React so the round-trip is
 * trivially testable. See `packages/backend-core/src/export-format.md`
 * for the file format.
 */
import type {
  BackendAdapter,
  BackendId,
  Priority,
  Quadrant,
  Task,
  TaskDraft,
  TaskId,
  TaskStatus,
} from '@emt/backend-core';

export interface ExportedBackend {
  readonly backendId: BackendId;
  readonly displayName: string;
  readonly tasks: readonly Task[];
}

export interface ExportFile {
  readonly version: 1;
  readonly exportedAt: string;
  readonly backends: readonly ExportedBackend[];
}

const QUADRANTS = new Set<string>(['Q1', 'Q2', 'Q3', 'Q4']);
const PRIORITIES = new Set<string>(['none', 'low', 'normal', 'high']);
const STATUSES = new Set<string>(['open', 'done']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Invalid export: ${field} must be a non-empty string`);
  }
  return value;
}

function parseTask(raw: unknown, path: string): Task {
  if (!isRecord(raw)) throw new Error(`Invalid export: ${path} must be an object`);
  const quadrant = asString(raw.quadrant, `${path}.quadrant`);
  const priority = asString(raw.priority, `${path}.priority`);
  const status = asString(raw.status, `${path}.status`);
  if (!QUADRANTS.has(quadrant)) throw new Error(`Invalid export: ${path}.quadrant`);
  if (!PRIORITIES.has(priority)) throw new Error(`Invalid export: ${path}.priority`);
  if (!STATUSES.has(status)) throw new Error(`Invalid export: ${path}.status`);
  if (!Array.isArray(raw.tags) || !raw.tags.every((t) => typeof t === 'string')) {
    throw new Error(`Invalid export: ${path}.tags must be a string array`);
  }
  return {
    id: asString(raw.id, `${path}.id`) as TaskId,
    backendId: asString(raw.backendId, `${path}.backendId`) as BackendId,
    title: asString(raw.title, `${path}.title`),
    notes: typeof raw.notes === 'string' ? raw.notes : '',
    priority: priority as Priority,
    quadrant: quadrant as Quadrant,
    status: status as TaskStatus,
    tags: raw.tags as string[],
    createdAt: typeof raw.createdAt === 'string' ? raw.createdAt : new Date(0).toISOString(),
    updatedAt: typeof raw.updatedAt === 'string' ? raw.updatedAt : new Date(0).toISOString(),
    ...(typeof raw.dueDate === 'string' ? { dueDate: raw.dueDate } : {}),
    ...(typeof raw.dueTime === 'string' ? { dueTime: raw.dueTime } : {}),
    ...(typeof raw.completedAt === 'string' ? { completedAt: raw.completedAt } : {}),
  };
}

/**
 * Validate unknown JSON as an {@link ExportFile}. Throws before any
 * adapter writes so a bad file never partially imports.
 */
export function parseExportFile(raw: unknown): ExportFile {
  if (!isRecord(raw)) throw new Error('Invalid export: root must be an object');
  if (raw.version !== 1) {
    throw new Error(`Unsupported export version: ${String(raw.version)}`);
  }
  if (typeof raw.exportedAt !== 'string') {
    throw new Error('Invalid export: exportedAt must be a string');
  }
  if (!Array.isArray(raw.backends)) {
    throw new Error('Invalid export: backends must be an array');
  }
  const backends: ExportedBackend[] = raw.backends.map((group, gi) => {
    if (!isRecord(group)) throw new Error(`Invalid export: backends[${String(gi)}]`);
    if (!Array.isArray(group.tasks)) {
      throw new Error(`Invalid export: backends[${String(gi)}].tasks must be an array`);
    }
    return {
      backendId: asString(group.backendId, `backends[${String(gi)}].backendId`) as BackendId,
      displayName:
        typeof group.displayName === 'string' ? group.displayName : String(group.backendId),
      tasks: group.tasks.map((task, ti) =>
        parseTask(task, `backends[${String(gi)}].tasks[${String(ti)}]`),
      ),
    };
  });
  return {
    version: 1,
    exportedAt: raw.exportedAt,
    backends,
  };
}

export async function buildExportFile(adapters: readonly BackendAdapter[]): Promise<ExportFile> {
  const backends: ExportedBackend[] = [];
  for (const adapter of adapters) {
    const d = adapter.describe();
    const tasks = await adapter.list();
    backends.push({ backendId: d.id, displayName: d.displayName, tasks });
  }
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    backends,
  };
}

function taskToDraft(task: Task): TaskDraft {
  const draft: { -readonly [K in keyof TaskDraft]: TaskDraft[K] } = {
    title: task.title,
    notes: task.notes,
    priority: task.priority,
    quadrant: task.quadrant,
    status: task.status,
    tags: [...task.tags],
  };
  if (task.dueDate !== undefined) draft.dueDate = task.dueDate;
  if (task.dueTime !== undefined) draft.dueTime = task.dueTime;
  if (task.completedAt !== undefined) draft.completedAt = task.completedAt;
  return draft;
}

export interface ImportResult {
  /** Number of tasks created across all backends. */
  readonly imported: number;
  /** Tasks whose source backend was not registered; landed on `fallback`. */
  readonly fellBack: number;
  /** Backend ids encountered in the file that are not currently registered. */
  readonly missingBackends: readonly BackendId[];
}

/** Build a user-facing import summary from {@link ImportResult}. */
export function formatImportSummary(
  result: ImportResult,
  templates: {
    readonly ok: string;
    readonly fallback: string;
  },
): string {
  let text = templates.ok.replace('{count}', String(result.imported));
  if (result.fellBack > 0) {
    text +=
      ' ' +
      templates.fallback
        .replace('{count}', String(result.fellBack))
        .replace('{backends}', result.missingBackends.join(', '));
  }
  return text;
}

export async function importTasks(
  file: ExportFile,
  options: {
    readonly getAdapter: (id: BackendId) => BackendAdapter | undefined;
    readonly fallback: BackendAdapter;
    /**
     * When set, wipe this adapter before importing (Replace mode).
     * Typically the local backend so re-import does not duplicate.
     */
    readonly clearBefore?: BackendAdapter;
  },
): Promise<ImportResult> {
  if (file.version !== 1) {
    throw new Error(`Unsupported export version: ${String(file.version)}`);
  }
  if (options.clearBefore !== undefined) {
    await clearLocalBackend(options.clearBefore);
  }
  let imported = 0;
  let fellBack = 0;
  const missing = new Set<BackendId>();
  for (const group of file.backends) {
    const matched = options.getAdapter(group.backendId);
    const target = matched ?? options.fallback;
    if (matched === undefined) {
      missing.add(group.backendId);
    }
    for (const task of group.tasks) {
      await target.create(taskToDraft(task));
      imported += 1;
      if (matched === undefined) {
        fellBack += 1;
      }
    }
  }
  return { imported, fellBack, missingBackends: [...missing] };
}

/**
 * Delete every task held by the local backend (id === 'local').
 * Remote-backend caches and the outbox are untouched per the
 * export-format contract.
 */
export async function clearLocalBackend(local: BackendAdapter): Promise<number> {
  const tasks = await local.list();
  for (const task of tasks) {
    await local.delete(task.id);
  }
  return tasks.length;
}
