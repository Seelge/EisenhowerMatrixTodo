/**
 * Step 12.7 — keyboard-aware layout core.
 *
 * `keyboardAwareLayout` turns raw Visual Viewport metrics into the
 * lift + height cap a bottom-anchored `<Sheet>` needs to clear the
 * on-screen keyboard. These cover:
 *   - keyboard open (visual viewport markedly shorter than layout) →
 *     a real `keyboardInset` and a `maxHeight` capped to the visible
 *     area;
 *   - keyboard closed (heights equal) → zero inset;
 *   - sub-threshold jitter (URL-bar collapse) → still zero inset;
 *   - a non-zero `offsetTop` (visual viewport scrolled within the
 *     layout viewport) folded into the inset.
 */
import { describe, expect, it } from 'vitest';

import { keyboardAwareLayout } from '../src/visual-viewport.ts';

describe('keyboardAwareLayout', () => {
  it('reports a lift + height cap when the keyboard shrinks the visual viewport', () => {
    // 800px layout viewport, keyboard takes the bottom ~320px.
    const layout = keyboardAwareLayout({ visualHeight: 480, offsetTop: 0, layoutHeight: 800 });
    expect(layout.keyboardInset).toBe(320);
    expect(layout.maxHeight).toBe(480);
  });

  it('reports no lift when the visual and layout viewports match', () => {
    const layout = keyboardAwareLayout({ visualHeight: 800, offsetTop: 0, layoutHeight: 800 });
    expect(layout.keyboardInset).toBe(0);
    expect(layout.maxHeight).toBe(800);
  });

  it('ignores sub-threshold deltas (URL-bar show/hide jitter)', () => {
    // A 40px delta is the browser chrome collapsing, not a keyboard.
    const layout = keyboardAwareLayout({ visualHeight: 760, offsetTop: 0, layoutHeight: 800 });
    expect(layout.keyboardInset).toBe(0);
  });

  it('folds a non-zero visual-viewport offsetTop into the inset', () => {
    const layout = keyboardAwareLayout({ visualHeight: 480, offsetTop: 20, layoutHeight: 800 });
    expect(layout.keyboardInset).toBe(300);
  });
});
