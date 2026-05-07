/**
 * App-level backend wiring.
 *
 * Constructs and memoizes the singleton `BackendRegistry` and
 * `SyncEngine` for the running app. Phase 4 ships with one backend
 * registered — `LocalIndexedDbAdapter` — which is also the default for
 * new tasks; remote backends (Google, Microsoft) are added in phases 8+
 * by registering further adapters with this registry.
 *
 * The bootstrap is async because it has to open IndexedDB. Callers
 * wait via `getBackends()`; the returned promise is cached so a second
 * caller during initial bootstrap shares the work and post-bootstrap
 * callers see the resolved value immediately.
 *
 * Tests can call `__resetBackendsCacheForTesting()` to drop the cache
 * between cases. They should also point `fake-indexeddb/auto` at a
 * fresh `FDBFactory` (or use unique database names) so previous
 * tests' tasks don't leak into the next one.
 */
import {
  BackendRegistry,
  createIdbCursorStore,
  createIdbMetaStore,
  createIdbOutboxStore,
  DefaultSyncEngine,
  openSyncDb,
  type SyncEngine,
} from '@emt/backend-core';
import { createLocalIndexedDbAdapter } from '@emt/backend-local-indexeddb';

export interface AppBackends {
  readonly registry: BackendRegistry;
  readonly syncEngine: SyncEngine;
}

let cached: Promise<AppBackends> | undefined;

/**
 * Returns the shared `AppBackends`. Concurrent callers during bootstrap
 * share the same in-flight promise; subsequent callers receive the
 * memoized value.
 */
export function getBackends(): Promise<AppBackends> {
  if (cached === undefined) {
    cached = bootstrap();
  }
  return cached;
}

async function bootstrap(): Promise<AppBackends> {
  const syncDb = await openSyncDb();
  const meta = createIdbMetaStore(syncDb);
  const outbox = createIdbOutboxStore(syncDb);
  const cursors = createIdbCursorStore(syncDb);

  const registry = new BackendRegistry({ meta });
  await registry.load();

  const local = await createLocalIndexedDbAdapter();
  registry.register(local);

  // No persisted default ⇒ fall back to local. We don't unconditionally
  // setDefault(local) because doing so would clobber a user-chosen
  // default (e.g., Google) on every reload.
  if (registry.getDefault()?.describe().id !== local.describe().id) {
    // Persisted default points at a backend we haven't registered yet
    // (Google / Microsoft will register later in phase 8+). Leave the
    // persisted id alone — `getDefault()` already falls back to the
    // first registered adapter (local) until that backend joins.
  }

  const syncEngine = new DefaultSyncEngine({
    outbox,
    cursors,
    getAdapter: (id) => registry.get(id),
  });

  return { registry, syncEngine };
}

/** Drops the cached singleton. Tests only. */
export function __resetBackendsCacheForTesting(): void {
  cached = undefined;
}
