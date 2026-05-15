/**
 * Step 12.11 — Settings button is the user-visible entry into view4.
 *
 * Before 12.11 the Options screen was only reachable by typing
 * `/options` into the URL bar. Asserts the new shell affordance:
 *   - the matrix renders a gear icon button in the top-right corner;
 *   - clicking it navigates to `/options` and renders the OptionsView
 *     (the "Options" heading is the structural confirmation);
 *   - browser back returns to the matrix (history was pushed, not
 *     replaced) so the user can leave the way they came in.
 */
import { expect, test } from '@playwright/test';

test('matrix exposes a Settings button that opens view4', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();

  const settings = page.locator('.emt-matrix__settings[data-action="open-options"]');
  await expect(settings).toBeVisible();
  await expect(settings).toHaveAttribute('aria-label', 'Settings');

  await settings.click();

  await expect(page).toHaveURL(/\/options$/);
  await expect(page.locator('[data-view="options"]')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Options' })).toBeVisible();

  await page.goBack();
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();
});

test('focused quadrant view also exposes the Settings button', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();

  // Drop into view2 by clicking a cell header link path: keyboard Enter
  // on a focused cell zooms in (the keyboard.spec.ts contract).
  await page.locator('.emt-matrix__cell[data-quadrant="Q1"]').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-view="quadrant"][data-quadrant="Q1"]')).toBeVisible();

  const settings = page.locator('.emt-quadrant__settings[data-action="open-options"]');
  await expect(settings).toBeVisible();
  await settings.click();

  await expect(page).toHaveURL(/\/options$/);
  await expect(page.locator('[data-view="options"]')).toBeVisible();
});
