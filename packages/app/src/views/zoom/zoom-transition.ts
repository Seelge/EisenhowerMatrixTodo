/**
 * Zoom morph transition constants (Step 7.1 + 7.5).
 *
 * `ZOOM_TRANSITION` is the M3-standard 220 ms ease used for the view1
 * ↔ view2 snap morph. `INSTANT_TRANSITION` collapses the morph to
 * zero duration — Framer Motion still routes the state change, but
 * the visual cut is instantaneous, which is what
 * `prefers-reduced-motion: reduce` users have opted into.
 *
 * `selectZoomTransition` is the pure choice function used by
 * `ZoomController`, broken out of the React tree so the both-modes
 * coverage required by the plan's "Done when" is a one-liner unit
 * test rather than a hairy DOM/animation assertion.
 *
 * The chosen transition is also propagated to every descendant
 * `motion.div` (matrix cell, focused quadrant frame, task card) via a
 * `<MotionConfig transition={...}>` wrapper, so the morph snaps as
 * one piece. See `ZoomController.tsx`.
 */

export const ZOOM_TRANSITION = {
  duration: 0.22,
  ease: [0.2, 0, 0, 1],
} as const;

export const INSTANT_TRANSITION = {
  duration: 0,
} as const;

export type ZoomTransition = typeof ZOOM_TRANSITION | typeof INSTANT_TRANSITION;

export function selectZoomTransition(prefersReducedMotion: boolean): ZoomTransition {
  return prefersReducedMotion ? INSTANT_TRANSITION : ZOOM_TRANSITION;
}
