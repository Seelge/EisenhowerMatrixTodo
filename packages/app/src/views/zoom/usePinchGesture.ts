/**
 * `usePinchGesture` — React hook that adapts the pure helpers in
 * `pinch.ts` into pointer-event handlers suitable for spreading onto
 * `MatrixView`'s and `QuadrantView`'s root `<main>` (Step 7.2).
 *
 * Design:
 *   - Tracks every active pointer, regardless of `pointerType`. Touch
 *     pinch is the primary use case; mouse / pen wouldn't normally
 *     produce a 2-pointer state, so this is a no-op for them.
 *   - When the second pointer goes down, snapshots the initial finger
 *     distance, midpoint, and the host's bounding rect. The midpoint
 *     and rect are frozen at gesture start: the destination quadrant
 *     is decided once, so the morph target doesn't shift mid-spread.
 *   - Step 12.8 — the gesture resolves on `pointermove`, the moment
 *     the ratio crosses a threshold, rather than waiting for
 *     `pointerup`. On Android Chrome the pointer stream for a pinch is
 *     unreliable at the *end* of the gesture (the browser may steal it
 *     for native page-zoom and emit a `pointercancel`), so waiting for
 *     `pointerup` meant the snap often never fired. Resolving mid-move
 *     catches the gesture while the stream is still live. `pointerup`
 *     stays as a fallback for the rare case where the threshold is
 *     only crossed on the very last frame. Either way the callback
 *     fires at most once per gesture (`resolved` latch).
 *   - The native pinch-zoom that used to win the race is suppressed by
 *     `touch-action: pan-y` on the gesture hosts (`matrix.css` /
 *     `quadrant.css`): it keeps vertical scroll but tells the browser
 *     not to claim two-finger gestures.
 *
 * Callers (`MatrixView` for pinch-in, `QuadrantView` for pinch-out)
 * also need to read `hasMultiPointer()` so they can suppress
 * single-pointer behaviors (swipe, drag) while a pinch is in flight.
 */
import { useCallback, useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

import {
  distance,
  midpoint,
  resolvePinchDirection,
  type PinchDirection,
  type PinchOptions,
  type Point,
} from './pinch.js';

interface PointerSnapshot {
  pointerId: number;
  x: number;
  y: number;
}

export interface PinchEvent {
  readonly direction: PinchDirection;
  /** Midpoint between the two pointers at gesture start. */
  readonly midpoint: Point;
  /** Bounding rect of the gesture host at gesture start. */
  readonly rect: DOMRect;
}

export interface PinchHandlers {
  onPointerDown: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerMove: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerUp: (e: ReactPointerEvent<HTMLElement>) => void;
  onPointerCancel: (e: ReactPointerEvent<HTMLElement>) => void;
  /**
   * Read-only probe for callers that need to suppress single-pointer
   * gestures while a pinch is being tracked (e.g. cancel a pending
   * swipe in `QuadrantView`).
   */
  hasMultiPointer: () => boolean;
}

export function usePinchGesture(
  onPinch: (event: PinchEvent) => void,
  options?: PinchOptions,
): PinchHandlers {
  // Refs avoid re-binding handlers on every render and dodge stale
  // closures over the consumer's callback. Update the refs in an
  // effect — assigning during render trips React's "no ref writes
  // during render" lint and is technically unsafe under concurrent
  // rendering. Pointer events fire after the commit phase, so the
  // refs are always current by the time a handler reads them.
  const onPinchRef = useRef(onPinch);
  const optionsRef = useRef(options);
  useEffect(() => {
    onPinchRef.current = onPinch;
    optionsRef.current = options;
  });

  const pointers = useRef<Map<number, PointerSnapshot>>(new Map());
  const startSnapshot = useRef<{
    distance: number;
    midpoint: Point;
    rect: DOMRect;
  } | null>(null);
  // Latch so the consumer's callback fires at most once per gesture —
  // set when the gesture resolves (on move or up), cleared when a fresh
  // two-pointer gesture begins or the gesture tears down.
  const resolved = useRef(false);

  const captureStart = (host: HTMLElement): void => {
    const values = Array.from(pointers.current.values());
    if (values.length < 2) return;
    const a = values[0]!;
    const b = values[1]!;
    startSnapshot.current = {
      distance: distance(a, b),
      midpoint: midpoint(a, b),
      rect: host.getBoundingClientRect(),
    };
    resolved.current = false;
  };

  /**
   * Evaluate the two currently-tracked pointers against the start
   * snapshot and fire the consumer callback if the ratio has crossed a
   * threshold. Idempotent within a gesture via the `resolved` latch.
   */
  const tryResolveFromTracked = (): void => {
    const start = startSnapshot.current;
    if (start === null || resolved.current) return;
    const values = Array.from(pointers.current.values());
    if (values.length < 2) return;
    const dCurrent = distance(values[0]!, values[1]!);
    const dir = resolvePinchDirection(start.distance, dCurrent, optionsRef.current);
    if (dir === undefined) return;
    resolved.current = true;
    onPinchRef.current({ direction: dir, midpoint: start.midpoint, rect: start.rect });
  };

  const onPointerDown = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    pointers.current.set(e.pointerId, {
      pointerId: e.pointerId,
      x: e.clientX,
      y: e.clientY,
    });
    if (pointers.current.size === 2) {
      captureStart(e.currentTarget);
    }
  }, []);

  const onPointerMove = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    const snap = pointers.current.get(e.pointerId);
    if (snap === undefined) return;
    snap.x = e.clientX;
    snap.y = e.clientY;
    // Step 12.8 — resolve mid-gesture so the snap doesn't depend on a
    // clean `pointerup` (which Android Chrome may never deliver).
    tryResolveFromTracked();
  }, []);

  const finalize = (e: ReactPointerEvent<HTMLElement>): void => {
    const start = startSnapshot.current;
    pointers.current.delete(e.pointerId);
    // Step 12.8 — the gesture already fired on `pointermove`; the
    // pointerup is just teardown.
    if (resolved.current) {
      if (pointers.current.size < 2) {
        startSnapshot.current = null;
        resolved.current = false;
      }
      return;
    }
    if (start === null) {
      if (pointers.current.size < 2) startSnapshot.current = null;
      return;
    }
    const remaining = Array.from(pointers.current.values());
    // Use the most up-to-date positions of any two tracked pointers,
    // including the one that just lifted (we already stored its last
    // move). Reconstruct from `pointers` before delete is moot here
    // because we deleted the lifted one, so include `e` directly.
    const lifted: PointerSnapshot = { pointerId: e.pointerId, x: e.clientX, y: e.clientY };
    const candidates = remaining.length > 0 ? [remaining[0]!, lifted] : [lifted];
    if (candidates.length < 2) {
      // Only one pointer tracked when the second was already lifted —
      // can't compute current distance. Bail.
      if (pointers.current.size < 2) startSnapshot.current = null;
      return;
    }
    const dCurrent = distance(candidates[0]!, candidates[1]!);
    const dir = resolvePinchDirection(start.distance, dCurrent, optionsRef.current);
    // Reset before calling the consumer so re-entrant nav / state
    // updates don't see a stale snapshot.
    startSnapshot.current = null;
    if (dir !== undefined) {
      onPinchRef.current({ direction: dir, midpoint: start.midpoint, rect: start.rect });
    }
  };

  const onPointerUp = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    finalize(e);
  }, []);

  const onPointerCancel = useCallback((e: ReactPointerEvent<HTMLElement>) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) {
      startSnapshot.current = null;
      resolved.current = false;
    }
  }, []);

  const hasMultiPointer = useCallback(() => pointers.current.size >= 2, []);

  return { onPointerDown, onPointerMove, onPointerUp, onPointerCancel, hasMultiPointer };
}
