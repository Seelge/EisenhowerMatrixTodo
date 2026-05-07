/**
 * Tests the app-level backend bootstrap. Each test starts from a fresh
 * `IDBFactory` and clears the cached singleton so the registry is
 * reconstructed from a clean slate.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';

function freshIdb(): void {
  // Replace the global `indexedDB` so every test starts with empty
  // databases, regardless of what a previous test wrote.
  globalThis.indexedDB = new IDBFactory();
}

describe('app backends bootstrap', () => {
  beforeEach(() => {
    freshIdb();
    __resetBackendsCacheForTesting();
  });

  afterEach(() => {
    __resetBackendsCacheForTesting();
  });

  it('registers the local IndexedDB adapter', async () => {
    const { registry } = await getBackends();
    const adapters = registry.list();
    expect(adapters).toHaveLength(1);
    expect(adapters[0]?.describe().id).toBe('local');
  });

  it('exposes local as the fallback default', async () => {
    const { registry } = await getBackends();
    expect(registry.getDefault()?.describe().id).toBe('local');
  });

  it('memoizes — concurrent calls share the same singleton', async () => {
    const [a, b] = await Promise.all([getBackends(), getBackends()]);
    expect(a).toBe(b);
  });

  it('a fresh bootstrap produces an empty task list', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0];
    expect(adapter).toBeDefined();
    expect(await adapter!.list()).toEqual([]);
  });
});
