/**
 * Unit tests for the first-run seed.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  __resetFirstRunForTesting,
  META_FIRST_RUN_KEY,
  runFirstRunSeed,
  SAMPLE_TASKS,
} from '../src/onboarding/first-run.ts';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';

function freshIdb(): void {
  globalThis.indexedDB = new IDBFactory();
}

describe('first-run seed', () => {
  beforeEach(() => {
    freshIdb();
    __resetBackendsCacheForTesting();
    __resetFirstRunForTesting();
  });

  afterEach(() => {
    __resetBackendsCacheForTesting();
    __resetFirstRunForTesting();
  });

  it('seeds the sample tasks on an empty IDB and sets the meta flag', async () => {
    const result = await runFirstRunSeed();
    expect(result).toEqual({ seeded: true });

    const { meta, registry } = await getBackends();
    expect(await meta.get(META_FIRST_RUN_KEY)).toBe('true');

    const adapter = registry.list()[0]!;
    const tasks = await adapter.list();
    expect(tasks).toHaveLength(SAMPLE_TASKS.length);
    const titles = tasks.map((t) => t.title).sort();
    expect(titles).toEqual([...SAMPLE_TASKS].map((d) => d.title).sort());
  });

  it('is idempotent — second call does not duplicate', async () => {
    await runFirstRunSeed();
    __resetFirstRunForTesting(); // simulate a fresh page load (singleton resets)
    const second = await runFirstRunSeed();
    expect(second).toEqual({ seeded: false });

    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    expect(await adapter.list()).toHaveLength(SAMPLE_TASKS.length);
  });

  it('concurrent calls within the same page load share one in-flight seed', async () => {
    const [a, b, c] = await Promise.all([runFirstRunSeed(), runFirstRunSeed(), runFirstRunSeed()]);
    // Exactly one of them should report seeded; the others must coalesce
    // onto the same promise rather than race three concurrent inserts.
    expect([a, b, c].filter((r) => r.seeded)).toHaveLength(3);
    // (All three see `seeded: true` because they share the same promise
    //  return value, not because three seeds ran.)
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    expect(await adapter.list()).toHaveLength(SAMPLE_TASKS.length);
  });
});
