/**
 * Reference implementation of {@link BackendAdapter}.
 *
 * Backed by an in-process Map. Used as the local cache adapter, as a
 * test double for higher layers (sync engine, registry, UI), and as the
 * canonical reference the contract test suite is calibrated against.
 *
 * Cursor format: a stringified non-negative integer; opaque to callers.
 */

import type {
  BackendAdapter,
  BackendCapabilities,
  BackendDescriptor,
  BackendId,
  ChangeSet,
  Cursor,
  Quadrant,
  Task,
  TaskDraft,
  TaskId,
  TaskPatch,
} from '@emt/backend-core';

export interface InMemoryAdapterOptions {
  /** Backend id surfaced via {@link describe}. Defaults to `'in-memory'`. */
  readonly id?: string;
  /** Human-readable label. Defaults to `'In-Memory'`. */
  readonly displayName?: string;
  /**
   * Override capabilities. Defaults to all-true; tests can pass
   * `{ dueTime: false, priority: false, recurrence: false }` to mimic
   * a less-capable remote (e.g., Google Tasks).
   */
  readonly capabilities?: BackendCapabilities;
}

interface DeletionRecord {
  readonly id: TaskId;
  readonly seq: number;
}

export class InMemoryAdapter implements BackendAdapter {
  private readonly tasks = new Map<TaskId, Task>();
  private readonly seqByTask = new Map<TaskId, number>();
  private readonly deletions: DeletionRecord[] = [];
  private readonly descriptor: BackendDescriptor;
  private seqClock = 0;
  private lastTimeMs = 0;

  constructor(options: InMemoryAdapterOptions = {}) {
    this.descriptor = {
      id: (options.id ?? 'in-memory') as BackendId,
      displayName: options.displayName ?? 'In-Memory',
      capabilities: options.capabilities ?? { dueTime: true, priority: true, recurrence: true },
    };
  }

  describe(): BackendDescriptor {
    return this.descriptor;
  }

  async list(quadrant?: Quadrant): Promise<readonly Task[]> {
    const all = [...this.tasks.values()];
    return quadrant === undefined ? all : all.filter((t) => t.quadrant === quadrant);
  }

  async get(id: TaskId): Promise<Task | undefined> {
    return this.tasks.get(id);
  }

  async create(draft: TaskDraft): Promise<Task> {
    const id = crypto.randomUUID() as TaskId;
    const now = this.nextIso();
    const task: Task = {
      ...draft,
      tags: [...draft.tags],
      id,
      backendId: this.descriptor.id,
      createdAt: now,
      updatedAt: now,
    };
    this.tasks.set(id, task);
    this.seqByTask.set(id, this.nextSeq());
    return task;
  }

  async update(id: TaskId, patch: TaskPatch): Promise<Task> {
    const existing = this.tasks.get(id);
    if (!existing) {
      throw new Error(`InMemoryAdapter: unknown task id ${String(id)}`);
    }
    const next: Task = {
      ...existing,
      ...patch,
      tags: patch.tags ? [...patch.tags] : existing.tags,
      id: existing.id,
      backendId: existing.backendId,
      createdAt: existing.createdAt,
      updatedAt: this.nextIso(),
    };
    this.tasks.set(id, next);
    this.seqByTask.set(id, this.nextSeq());
    return next;
  }

  async delete(id: TaskId): Promise<void> {
    if (!this.tasks.has(id)) return;
    this.tasks.delete(id);
    this.seqByTask.delete(id);
    this.deletions.push({ id, seq: this.nextSeq() });
  }

  async changesSince(cursor?: Cursor): Promise<ChangeSet> {
    const since = cursor === undefined ? -1 : Number.parseInt(cursor, 10);
    const upserts = [...this.seqByTask.entries()]
      .filter(([, seq]) => seq > since)
      .sort((a, b) => a[1] - b[1])
      .map(([taskId]) => this.tasks.get(taskId))
      .filter((t): t is Task => t !== undefined);
    const deletes = this.deletions.filter((d) => d.seq > since).map((d) => d.id);
    return { upserts, deletes, cursor: String(this.seqClock) };
  }

  private nextSeq(): number {
    return ++this.seqClock;
  }

  // Per-instance monotonic ISO timestamp. Date.now() resolution is 1ms,
  // so back-to-back writes can collide; we bump forward to keep
  // updatedAt strictly increasing within an adapter.
  private nextIso(): string {
    let ms = Date.now();
    if (ms <= this.lastTimeMs) ms = this.lastTimeMs + 1;
    this.lastTimeMs = ms;
    return new Date(ms).toISOString();
  }
}
