/**
 * Backend registry.
 *
 * Holds the set of backends installed in the running app and tracks
 * which one is the default for newly-created tasks. The registry is the
 * single source of truth that the sync engine and the UI both read
 * through:
 *
 * - The sync engine resolves `BackendId → BackendAdapter` via
 *   `registry.get(id)` (used as `getAdapter` in
 *   `DefaultSyncEngineOptions`).
 * - View 3 / view 2 read `registry.list()` for the backend selector
 *   and `registry.getDefault()` to pre-fill new-task forms.
 *
 * The default-id is persisted to a {@link MetaStore} so it survives
 * page reloads. Adapter instances themselves are not persisted — the
 * app re-registers them on startup (each backend module knows how to
 * reconstruct its adapter from its own config).
 */

import type { BackendAdapter } from './adapter.ts';
import { META_DEFAULT_BACKEND_KEY } from './cache-schema.js';
import type { BackendId } from './task.ts';

/**
 * Generic key/value persistence for app-level state. Backed by the
 * IDB `meta` store in production (see `createIdbMetaStore` in
 * `sync-engine.ts`); tests provide an in-memory implementation.
 */
export interface MetaStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface BackendRegistryOptions {
  /**
   * Persistence for the default-backend id. When omitted, the default
   * lives only in memory (useful in tests / SSR).
   */
  readonly meta?: MetaStore;
}

/**
 * Registry of installed backends.
 *
 * # Lifecycle
 *
 * The registry is constructed once per app instance. To restore the
 * persisted default-id, call {@link load} after construction (and
 * before {@link getDefault}). Adapters can be registered before or
 * after `load` — registration order does not affect which one is the
 * persisted default.
 *
 * # Default selection
 *
 * `getDefault()` returns the persisted default if it has been set
 * **and** that adapter is currently registered. Otherwise it falls
 * back to the first adapter in registration order, or `undefined` if
 * none are registered.
 */
export class BackendRegistry {
  private readonly adapters = new Map<BackendId, BackendAdapter>();
  private defaultId: BackendId | undefined;
  private readonly meta: MetaStore | undefined;

  constructor(options: BackendRegistryOptions = {}) {
    this.meta = options.meta;
  }

  /**
   * Hydrate the persisted default-id from the meta store. Safe to
   * call multiple times (re-reads the latest persisted value).
   * No-op when no `meta` store was configured.
   */
  async load(): Promise<void> {
    if (this.meta === undefined) return;
    const stored = await this.meta.get(META_DEFAULT_BACKEND_KEY);
    this.defaultId = stored as BackendId | undefined;
  }

  /** Register an adapter. Replaces any existing adapter with the same id. */
  register(adapter: BackendAdapter): void {
    this.adapters.set(adapter.describe().id, adapter);
  }

  /**
   * Remove the adapter with the given id. The persisted default-id
   * is intentionally not cleared — re-registering the same adapter
   * later restores it as the default.
   */
  unregister(id: BackendId): void {
    this.adapters.delete(id);
  }

  /** Returns the adapter with the given id, or `undefined`. */
  get(id: BackendId): BackendAdapter | undefined {
    return this.adapters.get(id);
  }

  /** Returns all registered adapters, in registration order. */
  list(): readonly BackendAdapter[] {
    return [...this.adapters.values()];
  }

  /**
   * Returns the default adapter for new tasks: the persisted default
   * if registered, else the first registered adapter, else
   * `undefined`.
   */
  getDefault(): BackendAdapter | undefined {
    if (this.defaultId !== undefined) {
      const persisted = this.adapters.get(this.defaultId);
      if (persisted !== undefined) return persisted;
    }
    const first = this.adapters.values().next();
    return first.done ? undefined : first.value;
  }

  /**
   * Mark `id` as the persisted default for new tasks. Throws if `id`
   * is not currently registered (callers must `register` first).
   */
  async setDefault(id: BackendId): Promise<void> {
    if (!this.adapters.has(id)) {
      throw new Error(`Cannot set default to unregistered backend "${String(id)}"`);
    }
    this.defaultId = id;
    if (this.meta !== undefined) {
      await this.meta.set(META_DEFAULT_BACKEND_KEY, id);
    }
  }
}
