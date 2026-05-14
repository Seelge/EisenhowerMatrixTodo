/**
 * Step 12.5 — card title readability on narrow viewports.
 *
 * Regression: on a 360 px-wide portrait viewport the view1 cells were
 * so tight that the title's `white-space: nowrap` clipped it after
 * 2-3 characters. Titles now use a two-line clamp and the matrix
 * chrome is tightened at this breakpoint, so a real seed title stays
 * legible — rendered over two lines, not snipped to a few glyphs.
 */
import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 360, height: 720 } });

test('view1 card titles stay legible at 360px wide', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();

  // The first-run seed puts "Reply to the urgent email" (25 chars) in Q1.
  const title = page
    .locator('[data-quadrant="Q1"] .emt-task-card__title')
    .filter({ hasText: 'Reply to the urgent email' });
  await expect(title).toBeVisible();

  // The full title text is in the DOM (ellipsis is purely visual)...
  const text = (await title.textContent()) ?? '';
  expect(text.length).toBeGreaterThan(10);

  // ...and the rendered element is tall enough to be showing two
  // wrapped lines rather than a single clipped one. A single ~16 px
  // line is ~20 px tall; the two-line clamp clears 28 px comfortably.
  const box = await title.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.height).toBeGreaterThan(28);
});
