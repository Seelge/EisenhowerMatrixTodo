/**
 * Phase 20 / TODO 15 — visual layout contract (CI-stable).
 *
 * Pixel golden images differ across host fonts (local vs GitHub runners),
 * so this smoke asserts geometry + computed chrome instead of bitmaps.
 * Expand with Docker-matched baselines later if needed.
 */
import { expect, test } from '@playwright/test';

test.describe('visual smoke', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });

  test('matrix shell layout and neon chrome', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    const matrix = page.locator('[data-view="matrix"]');
    await expect(matrix).toBeVisible();
    await expect(
      page
        .locator('[data-quadrant="Q1"] .emt-task-card__title')
        .filter({ hasText: 'Reply to the urgent email' }),
    ).toBeVisible();

    await expect(page.locator('.emt-matrix__cell[data-quadrant]')).toHaveCount(4);

    const box = await matrix.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThanOrEqual(360);
    // Matrix fills the app shell; absolute min leaves room for header chrome.
    expect(box!.height).toBeGreaterThanOrEqual(240);

    const chrome = await page.locator('.emt-matrix__cell[data-quadrant="Q1"]').evaluate((el) => {
      const styles = getComputedStyle(el);
      return {
        borderTopWidth: styles.borderTopWidth,
        borderTopStyle: styles.borderTopStyle,
        borderTopColor: styles.borderTopColor,
        colorQ1:
          styles.getPropertyValue('--color-q1').trim() ||
          styles.getPropertyValue('--glow-q1').trim(),
        bg: styles.getPropertyValue('--color-bg').trim(),
      };
    });
    expect(chrome.borderTopWidth).toBe('1px');
    expect(chrome.borderTopStyle).toBe('solid');
    // Q1 red neon — accept hex token or computed rgb.
    expect(chrome.borderTopColor.toLowerCase()).toMatch(/255,\s*51,\s*112|#ff3370/);
    expect(chrome.bg.toLowerCase()).toMatch(/#0a0e14|rgb\(10,\s*14,\s*20\)/);

    await expect(page.locator('.emt-matrix__fab')).toBeVisible();
    await expect(page.getByRole('button', { name: /settings/i })).toBeVisible();
  });
});
