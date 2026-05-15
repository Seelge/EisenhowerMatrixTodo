/**
 * Step 12.9 — Ctrl+wheel drives our zoom, not the browser's.
 *
 * React registers `onWheel` as a passive listener, so a
 * `preventDefault()` inside a synthetic handler was a no-op and the
 * browser still ran its native Ctrl+wheel page-zoom. The fix binds a
 * non-passive `window` listener.
 *
 * Playwright's `mouse.wheel` doesn't carry held-modifier state into
 * the wheel event, so this spec dispatches a real `WheelEvent` with
 * `ctrlKey: true` through the actual `window` listener and asserts:
 *   - our zoom handler ran (view2 for Q1 is showing);
 *   - the event was `preventDefault`-ed (so a real browser would not
 *     have run its native page-zoom);
 *   - the document's inline `zoom` / font-size is untouched.
 */
import { expect, test } from '@playwright/test';

test('Ctrl+wheel zooms our matrix, not the browser page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();

  const rootFontBefore = await page.evaluate(
    () => getComputedStyle(document.documentElement).fontSize,
  );

  // Dispatch a real Ctrl+wheel-up over the Q1 cell.
  const q1 = page.locator('.emt-matrix__cell[data-quadrant="Q1"]');
  const box = await q1.boundingBox();
  expect(box).not.toBeNull();
  const defaultPrevented = await page.evaluate(
    ({ x, y }) => {
      const event = new WheelEvent('wheel', {
        deltaY: -120,
        ctrlKey: true,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
      });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    },
    { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 },
  );

  // Our non-passive listener swallowed the event...
  expect(defaultPrevented).toBe(true);
  // ...and drove our zoom into view2 for Q1.
  await expect(page.locator('[data-view="quadrant"][data-quadrant="Q1"]')).toBeVisible();
  await expect(page).toHaveURL(/\/q\/Q1$/);

  // The browser's own page-zoom did not fire.
  expect(await page.evaluate(() => document.documentElement.style.zoom)).toBe('');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
    rootFontBefore,
  );
});
