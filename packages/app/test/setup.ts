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

// React's `act` helper checks this global to refuse to run outside a
// test environment. Vitest's default DOM environment doesn't set it,
// so the test files that explicitly call `act` (Step 5.8 quick-composer
// flow, …) would otherwise log an act-unsupported warning every time.
// Setting it here lets every test in this package call `act` directly.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
