/**
 * Touch / pointer swipe resolution for view2 (Step 6.3).
 *
 * Pure helpers — extracted from `QuadrantView` so the gesture geometry,
 * thresholds, and per-quadrant neighbor table can be unit-tested
 * directly without happy-dom's pointer-event quirks getting in the way.
 *
 * Direction semantics follow `design-input.md`: swipe left/right flips
 * the urgency axis; swipe up/down flips the importance axis. In the
 * canonical Eisenhower layout (top row important, right column urgent)
 * that resolves to the geometric neighbor on each side: swiping left
 * from Q1 reveals Q2, swiping down from Q1 reveals Q3, and so on. The
 * two non-adjacent directions for each quadrant are intentionally
 * absent from `SWIPE_NEIGHBORS` — a swipe that direction is a no-op
 * because there's no quadrant past the matrix edge.
 */
import type { Quadrant } from '@emt/backend-core';

export type SwipeDirection = 'up' | 'down' | 'left' | 'right';

/**
 * For each focused quadrant, the geometric neighbor reached by each
 * cardinal swipe. Two directions per quadrant — the other two face the
 * matrix outside and intentionally have no entry, so a lookup miss is
 * the correct "no-op" signal for the caller.
 *
 * Layout reference (matches `MatrixView`'s grid):
 *   +----+----+
 *   | Q2 | Q1 |    top row    = important
 *   +----+----+
 *   | Q4 | Q3 |    bottom row = not important
 *   +----+----+
 *      left col = not urgent · right col = urgent
 */
export const SWIPE_NEIGHBORS: Readonly<
  Record<Quadrant, Readonly<Partial<Record<SwipeDirection, Quadrant>>>>
> = {
  Q1: { left: 'Q2', down: 'Q3' },
  Q2: { right: 'Q1', down: 'Q4' },
  Q3: { up: 'Q1', left: 'Q4' },
  Q4: { up: 'Q2', right: 'Q3' },
};

export interface SwipeOptions {
  /** Minimum dominant-axis distance (px) for a gesture to count as a swipe. */
  readonly distance: number;
  /**
   * Minimum ratio of dominant to off-axis distance. Keeps "diagonal"
   * gestures from being misinterpreted as a clean horizontal or
   * vertical swipe. The off-axis denominator is clamped to ≥ 1 so a
   * perfectly axis-aligned swipe (off-axis = 0) still resolves rather
   * than dividing by zero.
   */
  readonly dominance: number;
  /**
   * Maximum gesture duration (ms). Real swipes are quick flicks; slow
   * drags through the same distance are usually scrolls or accidental
   * drift, not navigation intent.
   */
  readonly maxDuration: number;
  /**
   * Cooldown (ms) between two successful swipes. Prevents one fast
   * double-flick from firing two navigations in a row.
   */
  readonly cooldown: number;
}

export const DEFAULT_SWIPE_OPTIONS: SwipeOptions = {
  distance: 50,
  dominance: 1.5,
  maxDuration: 400,
  cooldown: 300,
};

/**
 * Classify a finished gesture as a `SwipeDirection`, or `undefined` if
 * it's too slow / too short / too diagonal to be a swipe.
 *
 * `dx` and `dy` are the signed deltas in CSS pixels (end - start);
 * `duration` is the gesture's total time in milliseconds.
 */
export function resolveSwipeDirection(
  dx: number,
  dy: number,
  duration: number,
  options: SwipeOptions = DEFAULT_SWIPE_OPTIONS,
): SwipeDirection | undefined {
  if (duration > options.maxDuration) return undefined;
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax >= ay) {
    if (ax < options.distance) return undefined;
    if (ax < options.dominance * Math.max(ay, 1)) return undefined;
    return dx > 0 ? 'right' : 'left';
  }
  if (ay < options.distance) return undefined;
  if (ay < options.dominance * Math.max(ax, 1)) return undefined;
  return dy > 0 ? 'down' : 'up';
}

/**
 * Resolve a swipe to its destination quadrant given the focused
 * quadrant. Returns `undefined` when the swipe direction has no
 * neighbor in the matrix (i.e. it points off the edge).
 */
export function resolveSwipeTarget(
  from: Quadrant,
  direction: SwipeDirection,
): Quadrant | undefined {
  return SWIPE_NEIGHBORS[from][direction];
}
