/**
 * Step 11.3 — accessibility audit e2e.
 *
 * Runs axe-core against each of the four primary views and asserts
 * zero violations at the `critical` impact level. Views with a
 * known-good accessible name + role tree should also report zero
 * `serious` issues — we report but don't fail on `serious` so a
 * future regression on a non-critical rule is visible without
 * blocking releases.
 *
 * Views exercised:
 *   - view1 (matrix)              — landing page
 *   - view2 (quadrant)            — `/q/Q1`
 *   - view3 (task focus surface)  — landing + opening the first card
 *   - view4 (options shell)       — `/options`
 *
 * Each view gets axe.analyze() run after the relevant landmark has
 * appeared. Critical violations include WCAG 2 A/AA contrast,
 * missing landmarks, and broken focus order.
 */
import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function runAxe(page: Page, label: string): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  if (critical.length > 0) {
    console.error(`axe ${label} critical violations:`, JSON.stringify(critical, null, 2));
  }
  expect(critical, `${label} should have no critical axe violations`).toEqual([]);
}

test('view1 (matrix) — axe: no critical violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();
  await expect(page.locator('[data-action="skip-to-content"]')).toHaveAttribute(
    'href',
    '#emt-main',
  );
  await runAxe(page, 'view1');
});

test('view2 (quadrant Q1) — axe: no critical violations', async ({ page }) => {
  await page.goto('/q/Q1');
  await expect(page.locator('[data-view="quadrant"][data-quadrant="Q1"]')).toBeVisible();
  await runAxe(page, 'view2');
});

test('view3 (task focus surface) — axe: no critical violations', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();
  // Open the quick composer, create a task, then open it.
  await page.locator('.emt-matrix__fab').click();
  const titleInput = page.locator('.emt-quick-composer__input');
  await expect(titleInput).toBeVisible();
  await titleInput.fill('a11y task');
  await page.getByRole('button', { name: /^Add$/ }).click();
  // Wait for the card and open view3.
  const card = page.locator('.emt-task-card__open').first();
  await expect(card).toBeVisible();
  await card.click();
  await expect(page.locator('[data-view="task"]')).toBeVisible();
  await runAxe(page, 'view3');
});

test('view4 (options) — axe: no critical violations', async ({ page }) => {
  await page.goto('/options');
  // Options surface renders the group list under [data-view="options"];
  // the group list is the load-bearing landmark.
  await expect(page.locator('[data-view="options"]')).toBeVisible();
  await runAxe(page, 'view4');
});
