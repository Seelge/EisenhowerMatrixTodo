/**
 * Mouse-wheel resolution for view1 ↔ view2 (Step 7.3).
 *
 * Pure direction classifier — kept out of the React handler so the
 * threshold can be unit-tested independently of jsdom/happy-dom's
 * wheel-event quirks.
 *
 * Browser convention: `WheelEvent.deltaY > 0` means the user scrolled
 * the page *down* (wheel rolled toward them); negative means *up*. We
 * map that onto the design's zoom-in / zoom-out axis:
 *
 *   - wheel-up   (deltaY < 0) → zoom in  (matrix → focused quadrant)
 *   - wheel-down (deltaY > 0) → zoom out (focused quadrant → matrix)
 *
 * The dead-zone discards trackpad jitter and the stray sub-pixel
 * deltas browsers emit at the start / end of a smooth-scroll burst.
 */
export type WheelDirection = 'up' | 'down';

/** Below this `|deltaY|` we treat the event as noise. */
export const WHEEL_DEADZONE = 5;

export function resolveWheelDirection(deltaY: number): WheelDirection | undefined {
  if (Math.abs(deltaY) < WHEEL_DEADZONE) return undefined;
  return deltaY < 0 ? 'up' : 'down';
}

/**
 * Cooldown between two consecutive zoom navigations driven by the
 * wheel. Real wheel gestures emit dozens of events per scroll-tick on
 * modern OSes (especially smooth-scroll trackpads); without a cooldown
 * a single spin would fire many redundant `navigate()` calls.
 */
export const WHEEL_COOLDOWN_MS = 300;
