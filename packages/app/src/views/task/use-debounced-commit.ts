/**
 * Debounced field-commit helper for view3 editors (Step 8.2).
 *
 * Field editors mirror task state locally so typing feels instant, but
 * coalesce writes to the backend: each keystroke restarts a 300 ms
 * timer; when the timer fires (or the field blurs / unmounts), the
 * latest value is committed via `useUpdateTask`.
 *
 * The hook exposes:
 *  - `value` / `setValue` — the local string the input binds to;
 *  - `flush()` — commit the pending value immediately (call from
 *    `onBlur`, route changes, before navigating away);
 *
 * Unmount auto-flushes, so closing view3 mid-edit still persists the
 * last keystroke instead of dropping it. The commit short-circuits
 * when the pending value equals the last value the hook saw committed,
 * so a flush following a debounced write does not re-issue.
 *
 * `external` is the authoritative server value the input was seeded
 * from. The hook does NOT reset local state when `external` changes —
 * a server invalidation while the user is mid-edit must not stomp
 * their in-flight keystrokes. Callers that need to swap to a different
 * task should remount the component (e.g. `key={task.id}`) instead.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

export interface DebouncedCommit<T> {
  readonly value: T;
  readonly setValue: (next: T) => void;
  readonly flush: () => void;
}

export function useDebouncedCommit<T>(
  external: T,
  commit: (next: T) => void,
  delay = 300,
): DebouncedCommit<T> {
  const [value, setLocal] = useState<T>(external);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<T>(external);
  const lastCommittedRef = useRef<T>(external);
  // Keep `commit` current without forcing the debounced timer to
  // re-arm whenever a parent re-renders and produces a new closure.
  const commitRef = useRef(commit);
  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  const doCommit = useCallback((next: T) => {
    if (Object.is(next, lastCommittedRef.current)) return;
    lastCommittedRef.current = next;
    commitRef.current(next);
  }, []);

  const flush = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    doCommit(pendingRef.current);
  }, [doCommit]);

  const setValue = useCallback(
    (next: T) => {
      pendingRef.current = next;
      setLocal(next);
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        doCommit(pendingRef.current);
      }, delay);
    },
    [delay, doCommit],
  );

  // Flush on unmount so closing the surface mid-edit doesn't drop the
  // last keystroke. Ref-only — the effect runs once for the lifetime
  // of the field.
  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        doCommit(pendingRef.current);
      }
    };
  }, [doCommit]);

  return { value, setValue, flush };
}
