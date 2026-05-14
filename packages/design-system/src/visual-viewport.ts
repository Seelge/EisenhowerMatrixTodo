/**
 * Keyboard-aware layout via the Visual Viewport API — Step 12.7.
 *
 * When an on-screen keyboard opens on a mobile browser, a
 * bottom-anchored `position: fixed` surface (`<Sheet>`) can end up
 * partly behind the keyboard. There are two lines of defence:
 *
 *  1. **Primary — viewport hint.** `index.html` sets
 *     `interactive-widget=resizes-content`, which makes the *layout*
 *     viewport itself shrink when the keyboard opens, so `bottom: 0`
 *     and `vh` units already track the keyboard. The app also sets
 *     `navigator.virtualKeyboard.overlaysContent = false` to keep
 *     Chrome on the resize path. On browsers that honour this, the
 *     metrics below report `keyboardInset === 0` and this hook is a
 *     no-op.
 *
 *  2. **Fallback — this module.** Browsers that don't support the
 *     `interactive-widget` hint (older Android WebViews, some Firefox
 *     builds) only shrink the *visual* viewport. We read that via the
 *     Visual Viewport API and compute how far a bottom-anchored
 *     surface must lift, plus a height cap so it never exceeds the
 *     visible area.
 *
 * {@link keyboardAwareLayout} is the pure, unit-tested core;
 * {@link useKeyboardAwareLayout} subscribes a component to live
 * viewport changes.
 */
import { useSyncExternalStore } from 'react';

export interface ViewportMetrics {
  /** `visualViewport.height` — the area not covered by a keyboard. */
  readonly visualHeight: number;
  /** `visualViewport.offsetTop` — visual viewport offset within the layout viewport. */
  readonly offsetTop: number;
  /** `window.innerHeight` — the layout viewport height. */
  readonly layoutHeight: number;
}

export interface KeyboardAwareLayout {
  /**
   * Pixels a bottom-anchored surface should lift (`bottom: <n>px`) to
   * clear the on-screen keyboard. `0` when no keyboard is detected.
   */
  readonly keyboardInset: number;
  /**
   * Pixel cap for the surface's height so a keyboard-lifted surface
   * never extends past the top of the visible viewport.
   */
  readonly maxHeight: number;
}

/**
 * Minimum visual-vs-layout viewport delta (px) that counts as a
 * keyboard rather than URL-bar show/hide jitter or sub-pixel rounding.
 */
const KEYBOARD_THRESHOLD = 60;

/**
 * Derive the bottom-anchored-surface layout from raw viewport metrics.
 * Pure — no DOM access — so it's trivially unit-testable.
 */
export function keyboardAwareLayout(metrics: ViewportMetrics): KeyboardAwareLayout {
  const rawInset = metrics.layoutHeight - metrics.visualHeight - metrics.offsetTop;
  const keyboardInset = rawInset > KEYBOARD_THRESHOLD ? Math.round(rawInset) : 0;
  return { keyboardInset, maxHeight: Math.round(metrics.visualHeight) };
}

function readMetrics(): ViewportMetrics {
  if (typeof window === 'undefined') {
    return { visualHeight: 0, offsetTop: 0, layoutHeight: 0 };
  }
  const layoutHeight = window.innerHeight;
  const vv = window.visualViewport;
  if (vv === null || vv === undefined) {
    return { visualHeight: layoutHeight, offsetTop: 0, layoutHeight };
  }
  return { visualHeight: vv.height, offsetTop: vv.offsetTop, layoutHeight };
}

function subscribe(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const vv = window.visualViewport;
  if (vv === null || vv === undefined) {
    window.addEventListener('resize', callback);
    return () => window.removeEventListener('resize', callback);
  }
  vv.addEventListener('resize', callback);
  vv.addEventListener('scroll', callback);
  return () => {
    vv.removeEventListener('resize', callback);
    vv.removeEventListener('scroll', callback);
  };
}

// `useSyncExternalStore` requires a referentially-stable snapshot, so
// memoize the derived layout and only swap the object when a field
// actually changes — otherwise React would loop on every render.
let cached: KeyboardAwareLayout = { keyboardInset: 0, maxHeight: 0 };
function getSnapshot(): KeyboardAwareLayout {
  const next = keyboardAwareLayout(readMetrics());
  if (next.keyboardInset !== cached.keyboardInset || next.maxHeight !== cached.maxHeight) {
    cached = next;
  }
  return cached;
}

const SERVER_SNAPSHOT: KeyboardAwareLayout = { keyboardInset: 0, maxHeight: 0 };

/**
 * Subscribe a component to keyboard-aware layout metrics. Re-renders
 * only when the derived `keyboardInset` / `maxHeight` change.
 */
export function useKeyboardAwareLayout(): KeyboardAwareLayout {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);
}
