/**
 * Step 10.2 — Resolver wiring.
 *
 * "Done when":
 *  - Synthetic two-conflict pull: modal opens twice in sequence.
 *  - Choosing remote produces the same record on both sides after sync.
 *
 * Strategy: mount `<ConflictResolverHost />` with an isolated
 * `DefaultSyncEngine` (test prop) so we don't share state with the
 * global app engine. The engine is driven through `pull()` against
 * an `InMemoryAdapter` whose records diverge from the local cache;
 * the host installs its resolver, the modal renders, and clicking
 * Keep-Remote unblocks `pull()`.
 */
import 'fake-indexeddb/auto';
import {
  DefaultSyncEngine,
  type BackendId,
  type Cursor,
  type CursorStore,
  type LocalTaskCache,
  type OutboxAppend,
  type OutboxRecord,
  type OutboxStore,
  type Task,
  type TaskId,
} from '@emt/backend-core';
import { InMemoryAdapter } from '@emt/backend-inmemory';
import { act } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { ConflictResolverHost } from '../src/views/conflict/ConflictResolverHost.tsx';

import { renderWithQueryClient } from './query-render.tsx';

class MemOutbox implements OutboxStore {
  private next = 1;
  private readonly rows: OutboxRecord[] = [];

  async list(backendId?: BackendId): Promise<readonly OutboxRecord[]> {
    return this.rows
      .filter((r) => backendId === undefined || r.backendId === backendId)
      .sort((a, b) => a.seq - b.seq);
  }
  async append(entry: OutboxAppend): Promise<OutboxRecord> {
    const row: OutboxRecord = { ...entry, seq: this.next++ };
    this.rows.push(row);
    return row;
  }
  async update(entry: OutboxRecord): Promise<void> {
    const i = this.rows.findIndex((r) => r.seq === entry.seq);
    if (i >= 0) this.rows[i] = entry;
  }
  async delete(seq: number): Promise<void> {
    const i = this.rows.findIndex((r) => r.seq === seq);
    if (i >= 0) this.rows.splice(i, 1);
  }
}

class MemCache implements LocalTaskCache {
  private readonly tasks = new Map<string, Task>();
  private key(b: BackendId, id: TaskId): string {
    return `${String(b)}::${String(id)}`;
  }
  async get(b: BackendId, id: TaskId): Promise<Task | undefined> {
    return this.tasks.get(this.key(b, id));
  }
  async put(task: Task): Promise<void> {
    this.tasks.set(this.key(task.backendId, task.id), task);
  }
  async delete(b: BackendId, id: TaskId): Promise<void> {
    this.tasks.delete(this.key(b, id));
  }
}

class MemCursors implements CursorStore {
  private readonly map = new Map<BackendId, Cursor>();
  async get(b: BackendId): Promise<Cursor | undefined> {
    return this.map.get(b);
  }
  async set(b: BackendId, c: Cursor): Promise<void> {
    this.map.set(b, c);
  }
}

async function seedDivergingTask(
  adapter: InMemoryAdapter,
  cache: LocalTaskCache,
  outbox: OutboxStore,
  overrides: { localTitle: string; remoteTitle: string },
): Promise<{ remote: Task; local: Task }> {
  const remote = await adapter.create({
    title: overrides.remoteTitle,
    notes: '',
    priority: 'normal',
    quadrant: 'Q1',
    status: 'open',
    tags: [],
  });
  // Local cache holds a record with the same id but a different title;
  // a pending update entry lives in the outbox so the engine treats
  // this as a conflict, not a blind overwrite.
  const local: Task = { ...remote, title: overrides.localTitle };
  await cache.put(local);
  await outbox.append({
    op: 'update',
    backendId: local.backendId,
    taskId: local.id,
    payload: local,
    attempts: 0,
  });
  return { remote, local };
}

async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('ConflictResolverHost — Step 10.2', () => {
  let teardown: (() => void) | undefined;

  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('queues a two-conflict pull and presents the modal twice in sequence', async () => {
    const adapter = new InMemoryAdapter({ id: 'remote' as BackendId, displayName: 'Remote' });
    const outbox = new MemOutbox();
    const cache = new MemCache();
    const cursors = new MemCursors();

    const a = await seedDivergingTask(adapter, cache, outbox, {
      localTitle: 'Local A',
      remoteTitle: 'Remote A',
    });
    const b = await seedDivergingTask(adapter, cache, outbox, {
      localTitle: 'Local B',
      remoteTitle: 'Remote B',
    });

    const engine = new DefaultSyncEngine({
      outbox,
      cache,
      cursors,
      getAdapter: (id) => (id === adapter.describe().id ? adapter : undefined),
    });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <ConflictResolverHost syncEngine={engine} />
      </I18nProvider>,
    );
    teardown = unmount;

    const pullPromise = engine.pull(adapter.describe().id);

    // First conflict — either A or B (insertion order from adapter).
    await waitFor(
      () =>
        container.querySelector<HTMLElement>('[data-side="local"][data-field="title"]') !== null,
    );
    const firstLocalTitle = container.querySelector<HTMLElement>(
      '[data-side="local"][data-field="title"]',
    )!.textContent;
    expect([a.local.title, b.local.title]).toContain(firstLocalTitle);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-action="keep-local"]')!.click();
    });

    // Second conflict appears with the other task's titles.
    await waitFor(() => {
      const t = container.querySelector<HTMLElement>(
        '[data-side="local"][data-field="title"]',
      )?.textContent;
      return t !== undefined && t !== firstLocalTitle;
    });
    const secondLocalTitle = container.querySelector<HTMLElement>(
      '[data-side="local"][data-field="title"]',
    )!.textContent;
    expect(secondLocalTitle).not.toBe(firstLocalTitle);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-action="keep-remote"]')!.click();
    });

    await pullPromise;

    // Modal closes after the queue drains.
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('choosing remote converges cache and adapter on the remote record', async () => {
    const adapter = new InMemoryAdapter({ id: 'remote' as BackendId, displayName: 'Remote' });
    const outbox = new MemOutbox();
    const cache = new MemCache();
    const cursors = new MemCursors();

    const { remote, local } = await seedDivergingTask(adapter, cache, outbox, {
      localTitle: 'Local copy',
      remoteTitle: 'Remote copy',
    });

    const engine = new DefaultSyncEngine({
      outbox,
      cache,
      cursors,
      getAdapter: (id) => (id === adapter.describe().id ? adapter : undefined),
    });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <ConflictResolverHost syncEngine={engine} />
      </I18nProvider>,
    );
    teardown = unmount;

    const pullPromise = engine.pull(adapter.describe().id);
    await waitFor(() => container.querySelector('[role="dialog"]') !== null);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-action="keep-remote"]')!.click();
    });

    const result = await pullPromise;
    expect(result.conflicts).toBe(1);

    // Cache now holds the remote record; adapter is unchanged.
    const cached = await cache.get(remote.backendId, remote.id);
    expect(cached?.title).toBe(remote.title);
    const fromAdapter = await adapter.get(remote.id);
    expect(fromAdapter?.title).toBe(remote.title);
    expect(cached?.title).toBe(fromAdapter?.title);

    // Pending outbox entry for the now-superseded local change is dropped.
    expect(await outbox.list()).toHaveLength(0);

    // Silence the unused-binding warning on `local` — its purpose is the
    // seeding-time divergence, asserted indirectly via the cache check.
    expect(local.id).toBe(remote.id);
  });
});
