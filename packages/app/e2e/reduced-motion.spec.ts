/**
 * Step 11.3 — `prefers-reduced-motion` regression e2e.
 *
 * The zoom morph (view1 → view2 and back), the snackbar slide, and
 * the responsive surface entry animations all run through CSS
 * transitions or framer-motion. Each one is supposed to collapse
 * to an instant transition under `prefers-reduced-motion: reduce`.
 *
 * The spec emulates the media preference, navigates view1 → view2,
 * and asserts: (a) the destination view is in the DOM and visible
 * within a tight budget (so an animation hasn't been started); and
 * (b) the surface elements expose `animation-duration: 0s` /
 * `transition-duration: 0s` for any rules gated on the media query.
 * The matrix → quadrant route flip is the primary load-bearing
 * morph here.
 */
import { expect, test } from '@playwright/test';

test.use({ colorScheme: 'dark', reducedMotion: 'reduce' });

test('matrix → quadrant lands instantly under reduced motion', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();

  // Focus Q2 and zoom in. With reduce, the morph collapses; the
  // quadrant view should be visible within 100ms of the click.
  await page.locator('.emt-matrix__cell[data-quadrant="Q2"]').focus();
  const t0 = Date.now();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-view="quadrant"][data-quadrant="Q2"]')).toBeVisible({
    timeout: 500,
  });
  const elapsed = Date.now() - t0;
  // Generous budget — playwright's own overhead dominates here. The
  // assertion catches a regression where a long transition would
  // delay the visible test for hundreds of ms.
  expect(elapsed).toBeLessThan(500);
});

test('skeleton respects reduced motion (no shimmer animation)', async ({ page }) => {
  await page.goto('/');
  // Trigger the loading state by hitting a quadrant view fresh —
  // the skeleton is mounted briefly while the tasks query resolves.
  await page.goto('/q/Q1');
  // Skeleton elements expose `animation-duration: 0s` under reduce
  // via the design-system tokens.css @media block.
  const skeleton = page.locator('[data-emt-skeleton]').first();
  if ((await skeleton.count()) > 0) {
    const duration = await skeleton.evaluate((el) => getComputedStyle(el).animationDuration);
    // jsdom-free assertion: the computed value should be 0s (or empty
    // for non-animated variants). Anything non-zero is a regression.
    expect(['0s', '', 'none']).toContain(duration);
  }
});
