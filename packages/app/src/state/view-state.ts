/**
 * View-state store. Mirrors the URL into a Zustand store so views can
 * read it without parsing `window.location` themselves.
 *
 * Invariant: the URL is the source of truth.
 *  - `navigate(next)` and `replace(next)` write the URL via `pushState`
 *    / `replaceState`, then update the store. Browsers do not fire
 *    `popstate` for these, which is why we update the store ourselves.
 *  - `syncFromUrl()` re-reads the URL into the store. The Router calls
 *    it on mount (initial seed) and from a `popstate` listener
 *    (back/forward, hash navigation, etc.).
 *
 * Base path: in production the app is served from
 * `/EisenhowerMatrixTodo/`. The contract layer (`parseUrl` /
 * `serializeUrl`) only deals with internal app paths (`/`, `/q/Q2`,
 * …); this module strips the Vite base prefix on read and re-prefixes
 * on write so the contract stays a pure function of the app's own
 * URL space.
 */
import { create } from 'zustand';

import { defaultViewState, parseUrl, serializeUrl, type ViewState } from '../routes/contract.js';

const RAW_BASE: string =
  typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL ? import.meta.env.BASE_URL : '/';
// '/EisenhowerMatrixTodo/' → '/EisenhowerMatrixTodo'; '/' → ''
const BASE_PREFIX = RAW_BASE.replace(/\/+$/, '');

function readInternalPath(): string {
  if (typeof window === 'undefined') return '/';
  let path = window.location.pathname + window.location.search;
  if (BASE_PREFIX && path.startsWith(BASE_PREFIX)) {
    path = path.slice(BASE_PREFIX.length);
  }
  return path === '' ? '/' : path;
}

function toExternalPath(internal: string): string {
  if (!BASE_PREFIX) return internal;
  // serializeUrl always returns a path starting with '/'.
  return BASE_PREFIX + internal;
}

export interface ViewStateStore {
  state: ViewState;
  /**
   * Raw internal path (with query string), base-prefix stripped. Kept
   * alongside the projected `ViewState` so out-of-band routes (the
   * dev-only `/__debug` page, future view4 `/options/*` sub-router,
   * etc.) can match against it reactively without their own popstate
   * subscription.
   */
  internalPath: string;
  /** Push a new history entry and update the store. */
  navigate: (next: ViewState) => void;
  /** Replace the current history entry and update the store. */
  replace: (next: ViewState) => void;
  /**
   * Push a raw internal path (out-of-band routes like `/options/...`
   * that don't map to a `ViewState`). The store's `internalPath`
   * updates so subscribers re-render; the projected `state` reflects
   * `parseUrl(internal)`, which falls back to the matrix view for
   * unknown paths — fine because nothing under `/options/*` cares
   * about the projected state.
   */
  navigateRaw: (internal: string) => void;
  /** Re-read the URL into the store. Idempotent. */
  syncFromUrl: () => void;
}

export const useViewStateStore = create<ViewStateStore>((set) => ({
  // Eager init: a deep-link like `/q/Q2?task=abc` must hydrate the
  // store before children first render, otherwise we'd flash the
  // matrix view for one frame. Tests can call `syncFromUrl` after
  // mutating `window.location` to re-seed.
  state: typeof window !== 'undefined' ? parseUrl(readInternalPath()) : defaultViewState,
  internalPath: typeof window !== 'undefined' ? readInternalPath() : '/',
  navigate: (next) => {
    const internal = serializeUrl(next);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', toExternalPath(internal));
    }
    set({ state: next, internalPath: internal });
  },
  replace: (next) => {
    const internal = serializeUrl(next);
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', toExternalPath(internal));
    }
    set({ state: next, internalPath: internal });
  },
  navigateRaw: (internal) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', toExternalPath(internal));
    }
    set({ state: parseUrl(internal), internalPath: internal });
  },
  syncFromUrl: () => {
    if (typeof window === 'undefined') return;
    const internal = readInternalPath();
    set({ state: parseUrl(internal), internalPath: internal });
  },
}));

/** Read-only hook: the current `ViewState`. */
export function useViewState(): ViewState {
  return useViewStateStore((s) => s.state);
}

/** Read-only hook: the current internal path (base-prefix stripped). */
export function useInternalPath(): string {
  return useViewStateStore((s) => s.internalPath);
}

/** Hook: a stable reference to `navigate`. */
export function useNavigate(): (next: ViewState) => void {
  return useViewStateStore((s) => s.navigate);
}
