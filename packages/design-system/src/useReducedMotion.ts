/**
 * useReducedMotion — JS access to the user's `prefers-reduced-motion`
 * setting, for code paths that need to make a runtime decision (e.g.,
 * skipping the zoom-morph between view1 and view2 in favor of an instant
 * cut). For pure CSS animations, prefer the `@media (prefers-reduced-motion: reduce)`
 * blocks already in `components.css`.
 *
 * Subscribes to the matchMedia change event so the value flips live if
 * the user toggles their OS setting while the app is open. SSR-safe
 * (server snapshot is `false`, i.e. "animations on" — the conservative
 * default for first paint, since no user preference is available yet).
 */
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(QUERY).matches;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
