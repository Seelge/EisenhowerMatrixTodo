/**
 * Step 9.6 — Data panel round-trip (pure-function level).
 *
 * "Done when": export → clear → import restores tasks, and
 * clear-local-cache leaves remote backends intact.
 *
 * The DataPanel React component drives `buildExportFile`,
 * `importTasks`, and `clearLocalBackend` directly — testing those
 * three functions against real adapter pairs covers the contract
 * the UI exposes. The UI plumbing (download click, file-picker)
 * stays untested at this level: it's straight DOM glue.
 */
import 'fake-indexeddb/auto';
import type { TaskDraft } from '@emt/backend-core';
import { InMemoryAdapter } from '@emt/backend-inmemory';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import {
  buildExportFile,
  clearLocalBackend,
  importTasks,
} from '../src/views/options/data-export.ts';

const DRAFT_A: TaskDraft = {
  title: 'A',
  notes: '',
  priority: 'normal',
  quadrant: 'Q1',
  status: 'open',
  tags: [],
};
const DRAFT_B: TaskDraft = { ...DRAFT_A, title: 'B', quadrant: 'Q2', dueDate: '2026-06-01' };

describe('Data panel pipeline — Step 9.6', () => {
  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
  });

  afterEach(() => {
    __resetBackendsCacheForTesting();
  });

  it('round-trips: export → clear local → import → tasks restored', async () => {
    const { registry } = await getBackends();
    const local = registry.list()[0]!;
    await local.create(DRAFT_A);
    await local.create(DRAFT_B);

    const file = await buildExportFile([local]);
    expect(file.version).toBe(1);
    expect(file.backends[0]?.tasks).toHaveLength(2);

    const cleared = await clearLocalBackend(local);
    expect(cleared).toBe(2);
    expect(await local.list()).toHaveLength(0);

    const result = await importTasks(file, {
      getAdapter: (id) => registry.get(id),
      fallback: local,
    });
    expect(result.imported).toBe(2);

    const after = await local.list();
    expect(after).toHaveLength(2);
    const titles = after.map((t) => t.title).sort();
    expect(titles).toEqual(['A', 'B']);
  });

  it('clear-local-cache leaves remote backends intact', async () => {
    const { registry } = await getBackends();
    const local = registry.list()[0]!;
    const remote = new InMemoryAdapter({ id: 'remote', displayName: 'Remote' });
    registry.register(remote);

    await local.create(DRAFT_A);
    await remote.create(DRAFT_B);
    expect(await local.list()).toHaveLength(1);
    expect(await remote.list()).toHaveLength(1);

    await clearLocalBackend(local);
    expect(await local.list()).toHaveLength(0);
    // Remote untouched.
    expect(await remote.list()).toHaveLength(1);
  });

  it('falls back to the default backend when an exported backendId is missing', async () => {
    const { registry } = await getBackends();
    const local = registry.list()[0]!;
    const remote = new InMemoryAdapter({ id: 'remote', displayName: 'Remote' });
    registry.register(remote);
    const created = await remote.create(DRAFT_A);

    const file = await buildExportFile([remote]);
    registry.unregister(created.backendId);

    const result = await importTasks(file, {
      getAdapter: (id) => registry.get(id),
      fallback: local,
    });
    expect(result.imported).toBe(1);
    expect(result.fellBack).toBe(1);
    expect(result.missingBackends).toContain(created.backendId);

    // The task landed on local instead.
    const localTasks = await local.list();
    expect(localTasks.map((t) => t.title)).toContain('A');
  });

  it('rejects unsupported export versions', async () => {
    const { registry } = await getBackends();
    const local = registry.list()[0]!;
    await expect(
      importTasks(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { version: 2, exportedAt: 'now', backends: [] } as any,
        { getAdapter: (id) => registry.get(id), fallback: local },
      ),
    ).rejects.toThrow(/version/i);
  });
});
