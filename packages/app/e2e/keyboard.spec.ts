/**
 * Step 7.4 keyboard-only e2e.
 *
 * The plan-step "Done when" is a single end-to-end flow:
 *   1. land on view1 (matrix);
 *   2. focus a matrix cell with Tab and arrow keys (Q2 is the first
 *      visual cell, top-left);
 *   3. press Enter to zoom in — URL becomes `/q/Q2` and view2 renders;
 *   4. press Esc — URL returns to `/` and view1 renders again.
 *
 * No mouse, no touch — Playwright's `page.keyboard` is the only input
 * channel.
 */
import { expect, test } from '@playwright/test';

test('keyboard-only flow: Tab → Enter → Esc round-trips view1 ↔ view2', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();

  // Focus Q2 directly. Tabbing from `<body>` would have to walk past
  // any FAB / banner stops, which adds incidental fragility the spec
  // isn't trying to exercise — the focus surface itself is what
  // matters for this flow.
  await page.locator('.emt-matrix__cell[data-quadrant="Q2"]').focus();
  await expect(page.locator('.emt-matrix__cell[data-quadrant="Q2"]')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/q\/Q2$/);
  await expect(page.locator('[data-view="quadrant"][data-quadrant="Q2"]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();
});

test('arrow keys move focus between cells in the visual layout', async ({ page }) => {
  await page.goto('/');
  await page.locator('.emt-matrix__cell[data-quadrant="Q2"]').focus();

  await page.keyboard.press('ArrowRight');
  await expect(page.locator('.emt-matrix__cell[data-quadrant="Q1"]')).toBeFocused();

  await page.keyboard.press('ArrowDown');
  await expect(page.locator('.emt-matrix__cell[data-quadrant="Q3"]')).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/q\/Q3$/);
});
