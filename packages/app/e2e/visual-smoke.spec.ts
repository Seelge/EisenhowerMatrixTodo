/**
 * Phase 20 / TODO 15 — lightweight visual regression smoke.
 *
 * Captures a fixed-viewport screenshot of the seeded matrix. Baselines
 * live under `e2e/visual-smoke.spec.ts-snapshots/`. Update with:
 *   pnpm exec playwright test e2e/visual-smoke.spec.ts --update-snapshots
 */
import { expect, test } from '@playwright/test';

test.describe('visual smoke', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });

  test('matrix shell matches baseline', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('[data-view="matrix"]')).toBeVisible();
    await expect(
      page
        .locator('[data-quadrant="Q1"] .emt-task-card__title')
        .filter({ hasText: 'Reply to the urgent email' }),
    ).toBeVisible();
    // Hide volatile chrome (sync chip time, focus rings) if any — seed is stable.
    await expect(page.locator('[data-view="matrix"]')).toHaveScreenshot('matrix-shell.png', {
      animations: 'disabled',
      caret: 'hide',
      maxDiffPixelRatio: 0.03,
    });
  });
});
