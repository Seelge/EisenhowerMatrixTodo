/**
 * Two-pointer pinch resolution for view1 ↔ view2 (Step 7.2).
 *
 * Pure helpers — kept out of the React handler so the geometry,
 * thresholds, and per-quadrant midpoint mapping can be unit-tested
 * without happy-dom's pointer-event quirks. The handler in
 * `MatrixView` / `QuadrantView` only owns pointer bookkeeping (which
 * `pointerId`s are currently down, what their last positions were);
 * everything else routes through this file.
 *
 * Direction semantics follow `design-input.md`:
 *   - pinch-in (fingers spread apart from view1)  → zoom into the
 *     quadrant under the pinch midpoint at gesture start;
 *   - pinch-out (fingers come together in view2) → return to view1
 *     and start a brief highlight on the previously-focused quadrant.
 *
 * The midpoint-at-gesture-start rule is what makes the gesture feel
 * deterministic: the user's fingers may drift a lot during the spread,
 * but the destination quadrant is decided once (when the second finger
 * goes down), so the morph target doesn't shift mid-gesture.
 */
import type { Quadrant } from '@emt/backend-core';

export type PinchDirection = 'in' | 'out';

export interface PinchOptions {
  /**
   * Minimum ratio of (current finger distance / initial finger
   * distance) required to count as pinch-in. 1.3 = fingers spread by
   * 30% — enough to be deliberate, low enough that small displays
   * (where there's not much room to spread) still register.
   */
  readonly inThreshold: number;
  /**
   * Maximum ratio of (current / initial) to count as pinch-out. 0.77
   * ≈ 1 / 1.3, so spread/contract are symmetric.
   */
  readonly outThreshold: number;
  /**
   * Minimum initial finger separation (px). Below this we ignore the
   * gesture: two fingers landing on top of each other isn't a pinch,
   * it's noise — and the divide-by-something-tiny would be sensitive
   * to a single-pixel jitter.
   */
  readonly minInitialDistance: number;
}

export const DEFAULT_PINCH_OPTIONS: PinchOptions = {
  inThreshold: 1.3,
  outThreshold: 0.77,
  minInitialDistance: 40,
};

export interface Point {
  readonly x: number;
  readonly y: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/**
 * Classify a pinch as `'in'` / `'out'` / `undefined`.
 *
 * Returns `undefined` when the initial separation was too small to
 * trust, or when the ratio sits inside the deadzone between the in
 * and out thresholds.
 */
export function resolvePinchDirection(
  initialDistance: number,
  currentDistance: number,
  options: PinchOptions = DEFAULT_PINCH_OPTIONS,
): PinchDirection | undefined {
  if (initialDistance < options.minInitialDistance) return undefined;
  const ratio = currentDistance / initialDistance;
  if (ratio >= options.inThreshold) return 'in';
  if (ratio <= options.outThreshold) return 'out';
  return undefined;
}

/**
 * Quadrant at a viewport-relative point inside a rect, using the
 * canonical layout from `MatrixView`'s grid:
 *
 *     +----+----+
 *     | Q2 | Q1 |    top row    = important
 *     +----+----+
 *     | Q4 | Q3 |    bottom row = not important
 *     +----+----+
 *        left col = not urgent · right col = urgent
 *
 * The split is at the rect's geometric center. A pinch midpoint that
 * lands exactly on the center line resolves to the bottom-right
 * quadrant (Q3) — arbitrary but stable.
 */
export function quadrantAtPoint(
  point: Point,
  rect: { left: number; top: number; width: number; height: number },
): Quadrant {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const right = point.x >= cx;
  const bottom = point.y >= cy;
  if (!bottom && !right) return 'Q2';
  if (!bottom && right) return 'Q1';
  if (bottom && !right) return 'Q4';
  return 'Q3';
}
