/**
 * Pinch-out highlight (Step 7.2).
 *
 * When the user pinches out from view2, we navigate back to the
 * matrix and ask the corresponding `MatrixCell` to glow for 600 ms
 * so the user can see *which* quadrant they just came from in the
 * shared 2 × 2 layout. The state lives in this small Zustand store
 * because:
 *
 *   - it isn't URL-derivable (it's a transient UI cue, not a route),
 *   - both `MatrixCell` (the reader) and `QuadrantView` (the writer)
 *     would otherwise need to thread props through `Routes` and
 *     `ZoomController`, which don't otherwise know about it.
 *
 * The store auto-clears via `setTimeout`. Calling `highlight(q)` again
 * before the timer fires resets the timer — i.e. the last call wins.
 */
import type { Quadrant } from '@emt/backend-core';
import { create } from 'zustand';

export const PINCH_HIGHLIGHT_MS = 600;

export interface PinchHighlightStore {
  active: Quadrant | undefined;
  /** Internal generation token; bumped on every `highlight()` call. */
  generation: number;
  highlight: (quadrant: Quadrant, ttlMs?: number) => void;
  clear: () => void;
}

export const usePinchHighlightStore = create<PinchHighlightStore>((set, get) => ({
  active: undefined,
  generation: 0,
  highlight: (quadrant, ttlMs = PINCH_HIGHLIGHT_MS) => {
    const generation = get().generation + 1;
    set({ active: quadrant, generation });
    setTimeout(() => {
      // Only clear if no later highlight superseded ours.
      if (get().generation === generation) {
        set({ active: undefined });
      }
    }, ttlMs);
  },
  clear: () => set({ active: undefined, generation: get().generation + 1 }),
}));

/** Convenience selector hook: is this quadrant currently highlighted? */
export function usePinchHighlight(quadrant: Quadrant): boolean {
  return usePinchHighlightStore((s) => s.active === quadrant);
}
