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
  /** Push a new history entry and update the store. */
  navigate: (next: ViewState) => void;
  /** Replace the current history entry and update the store. */
  replace: (next: ViewState) => void;
  /** Re-read the URL into the store. Idempotent. */
  syncFromUrl: () => void;
}

export const useViewStateStore = create<ViewStateStore>((set) => ({
  // Eager init: a deep-link like `/q/Q2?task=abc` must hydrate the
  // store before children first render, otherwise we'd flash the
  // matrix view for one frame. Tests can call `syncFromUrl` after
  // mutating `window.location` to re-seed.
  state: typeof window !== 'undefined' ? parseUrl(readInternalPath()) : defaultViewState,
  navigate: (next) => {
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', toExternalPath(serializeUrl(next)));
    }
    set({ state: next });
  },
  replace: (next) => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', toExternalPath(serializeUrl(next)));
    }
    set({ state: next });
  },
  syncFromUrl: () => {
    if (typeof window === 'undefined') return;
    set({ state: parseUrl(readInternalPath()) });
  },
}));

/** Read-only hook: the current `ViewState`. */
export function useViewState(): ViewState {
  return useViewStateStore((s) => s.state);
}

/** Hook: a stable reference to `navigate`. */
export function useNavigate(): (next: ViewState) => void {
  return useViewStateStore((s) => s.navigate);
}
