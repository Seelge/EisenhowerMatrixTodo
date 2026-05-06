/**
 * SnackbarProvider + useSnackbar — queue-of-one snackbar surface with an
 * optional 5 s undo CTA.
 *
 * Semantics (matching design-input §view3 "Delete: trash icon with a
 * 5-second undo snackbar; no modal confirmation"):
 *   - `show({ message, onCommit, onUndo, duration })` shows the snackbar.
 *   - If the user clicks Undo before `duration` (default 5000 ms) elapses,
 *     `onUndo` fires and `onCommit` is suppressed.
 *   - If the timer expires first, `onCommit` fires and `onUndo` is
 *     suppressed.
 *   - Calling `show` while a snackbar is active fires the previous one's
 *     `onCommit` immediately (the user has implicitly forfeited their
 *     undo window) and replaces it.
 *
 * The active item is React state (so render reflects it without reading
 * a ref); a parallel ref keeps the latest opts available to the timeout
 * callback without going through a stale closure.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { Snackbar } from './Snackbar.js';

export interface SnackbarShowOptions {
  message: string;
  /** Fires when the snackbar dismisses without an undo. */
  onCommit?: () => void;
  /** When provided, an Undo CTA is shown; clicking it fires this and suppresses commit. */
  onUndo?: () => void;
  /** Override the default 5000 ms timeout. */
  duration?: number;
  /** Override the default "Undo" CTA label. */
  undoLabel?: string;
}

export interface SnackbarContextValue {
  show: (options: SnackbarShowOptions) => void;
  dismiss: () => void;
}

const SnackbarContext = createContext<SnackbarContextValue | null>(null);

const DEFAULT_DURATION = 5000;

export interface SnackbarProviderProps {
  children?: ReactNode;
}

export function SnackbarProvider({ children }: SnackbarProviderProps): ReactNode {
  const [active, setActive] = useState<SnackbarShowOptions | null>(null);
  const optsRef = useRef<SnackbarShowOptions | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const finish = useCallback((reason: 'commit' | 'undo' | 'cancel') => {
    const opts = optsRef.current;
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    optsRef.current = null;
    setActive(null);
    if (opts) {
      if (reason === 'commit') opts.onCommit?.();
      if (reason === 'undo') opts.onUndo?.();
    }
  }, []);

  const show = useCallback(
    (options: SnackbarShowOptions) => {
      // A pending snackbar implicitly commits when superseded — the user
      // has lost their undo window by triggering the next action.
      if (optsRef.current) finish('commit');
      optsRef.current = options;
      setActive(options);
      const duration = options.duration ?? DEFAULT_DURATION;
      timerRef.current = setTimeout(() => finish('commit'), duration);
    },
    [finish],
  );

  const dismiss = useCallback(() => finish('cancel'), [finish]);

  // Cleanup any pending timer on provider unmount. We do *not* fire
  // onCommit here — provider unmount is closer to "the host page is
  // tearing down" than to "the user accepted the action".
  useEffect(
    () => () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    },
    [],
  );

  const value = useMemo<SnackbarContextValue>(() => ({ show, dismiss }), [show, dismiss]);

  const undoHandler = active?.onUndo ? () => finish('undo') : undefined;

  return (
    <SnackbarContext.Provider value={value}>
      {children}
      {active && (
        <Snackbar
          message={active.message}
          onUndo={undoHandler}
          {...(active.undoLabel !== undefined ? { undoLabel: active.undoLabel } : {})}
        />
      )}
    </SnackbarContext.Provider>
  );
}

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error('useSnackbar must be used inside a <SnackbarProvider>.');
  }
  return ctx;
}
