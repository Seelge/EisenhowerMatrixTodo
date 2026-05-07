/**
 * Vitest setup file — runs once per worker before any test in this
 * package. Installs `fake-indexeddb` as the global IDB factory so any
 * code path that opens IndexedDB during render (`<ConnectBanner />`,
 * `<FirstRun />`, the task query hooks, …) finds a working stub.
 *
 * Each test still needs to reset `globalThis.indexedDB = new IDBFactory()`
 * + `__resetBackendsCacheForTesting()` if it cares about isolation —
 * this file only ensures the factory exists.
 */
import 'fake-indexeddb/auto';
