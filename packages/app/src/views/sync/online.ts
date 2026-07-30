/**
 * `navigator.onLine` as a React subscription (TODO 3).
 *
 * The browser fires `online` / `offline` on `window`. We treat a missing
 * `navigator` (SSR / tests without a polyfill) as online so the chip
 * defaults to the calm "Local" state rather than flashing Offline.
 */
import { useSyncExternalStore } from 'react';

function subscribe(onStoreChange: () => void): () => void {
  window.addEventListener('online', onStoreChange);
  window.addEventListener('offline', onStoreChange);
  return () => {
    window.removeEventListener('online', onStoreChange);
    window.removeEventListener('offline', onStoreChange);
  };
}

function getSnapshot(): boolean {
  return typeof navigator === 'undefined' ? true : navigator.onLine;
}

function getServerSnapshot(): boolean {
  return true;
}

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
