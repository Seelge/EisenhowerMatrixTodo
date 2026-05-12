/**
 * Export / import pipeline for the Data panel (Step 9.6).
 *
 * Pure functions kept separate from React so the round-trip is
 * trivially testable. See `packages/backend-core/src/export-format.md`
 * for the file format.
 */
import type { BackendAdapter, BackendId, Task, TaskDraft } from '@emt/backend-core';

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

export async function importTasks(
  file: ExportFile,
  options: {
    readonly getAdapter: (id: BackendId) => BackendAdapter | undefined;
    readonly fallback: BackendAdapter;
  },
): Promise<ImportResult> {
  if (file.version !== 1) {
    throw new Error(`Unsupported export version: ${String(file.version)}`);
  }
  let imported = 0;
  let fellBack = 0;
  const missing = new Set<BackendId>();
  for (const group of file.backends) {
    const target = options.getAdapter(group.backendId) ?? options.fallback;
    if (target !== options.getAdapter(group.backendId)) {
      missing.add(group.backendId);
    }
    for (const task of group.tasks) {
      await target.create(taskToDraft(task));
      imported += 1;
      if (target === options.fallback && target !== options.getAdapter(group.backendId)) {
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
