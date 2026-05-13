/**
 * Step 11.4 — golden-path e2e.
 *
 * One end-to-end flow exercising the load-bearing user journey for
 * the first release:
 *   1. Open the app → the first-run seed inserts the three sample
 *      tasks; assert they're rendered in their expected quadrants.
 *   2. Open the quick composer, create a new "Refactor module" task
 *      in Q3.
 *   3. Drag that task from Q3 → Q1.
 *   4. Click it to focus → view3 opens.
 *   5. Pick the "Tomorrow" preset on the due-date picker.
 *   6. Toggle Mark complete.
 *   7. Close view3 → the task now renders with `data-status="done"`
 *      under Q1 (after the move and the completion).
 *
 * Drag is simulated with raw pointer events (dnd-kit uses pointer,
 * not HTML5 drag-and-drop): pointerdown on the card, move past the
 * 5px activation threshold, hover over the destination cell, then
 * pointerup. The activation budget is exact to dnd-kit's
 * PointerSensor configuration in MatrixView.
 */
import { expect, test, type Locator, type Page } from '@playwright/test';

async function pointerDrag(page: Page, source: Locator, target: Locator): Promise<void> {
  const src = await source.boundingBox();
  const dst = await target.boundingBox();
  if (src === null || dst === null) throw new Error('drag bounds resolution failed');
  const srcX = src.x + src.width / 2;
  const srcY = src.y + src.height / 2;
  const dstX = dst.x + dst.width / 2;
  const dstY = dst.y + dst.height / 2;
  await page.mouse.move(srcX, srcY);
  await page.mouse.down();
  // Cross the PointerSensor's 5px activation distance, then several
  // intermediate steps so the dnd-kit overlay tracks correctly.
  await page.mouse.move(srcX + 8, srcY, { steps: 4 });
  await page.mouse.move(dstX, dstY, { steps: 12 });
  await page.mouse.up();
}

test('golden path: seed → create → drag → focus → due tomorrow → complete', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-view="matrix"]')).toBeVisible();

  // (1) First-run seed. The three sample tasks live in Q1, Q2, Q4.
  await expect(
    page
      .locator('[data-quadrant="Q1"] .emt-task-card__title')
      .filter({ hasText: 'Reply to the urgent email' }),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-quadrant="Q2"] .emt-task-card__title')
      .filter({ hasText: 'Plan next week' }),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-quadrant="Q4"] .emt-task-card__title')
      .filter({ hasText: 'Old to-do (already done)' }),
  ).toBeVisible();

  // (2) Create a new "Refactor module" task in Q3 via the FAB.
  await page.locator('.emt-matrix__fab').click();
  await page.locator('.emt-quick-composer__input').fill('Refactor module');
  await page.locator('[data-emt-quadrant="q3"]').click();
  await page.getByRole('button', { name: /^Add$/ }).click();
  const newTask = page
    .locator('[data-quadrant="Q3"] .emt-task-card')
    .filter({ has: page.locator('.emt-task-card__title', { hasText: 'Refactor module' }) });
  await expect(newTask).toBeVisible();

  // (3) Drag Q3 → Q1.
  const q1Cell = page.locator('.emt-matrix__cell[data-quadrant="Q1"]');
  await pointerDrag(page, newTask, q1Cell);

  const movedTask = page
    .locator('[data-quadrant="Q1"] .emt-task-card')
    .filter({ has: page.locator('.emt-task-card__title', { hasText: 'Refactor module' }) });
  await expect(movedTask).toBeVisible();
  await expect(
    page
      .locator('[data-quadrant="Q3"] .emt-task-card__title')
      .filter({ hasText: 'Refactor module' }),
  ).toHaveCount(0);

  // (4) Focus → view3 opens.
  await movedTask.locator('.emt-task-card__open').click();
  await expect(page.locator('[data-view="task"]')).toBeVisible();

  // (5) Pick the "Tomorrow" preset.
  await page.locator('[data-emt-preset="tomorrow"]').click();
  // Verify the data-emt-preset button shows as selected (aria-pressed).
  await expect(page.locator('[data-emt-preset="tomorrow"]')).toHaveAttribute(
    'aria-pressed',
    'true',
  );

  // (6) Mark complete. The checkbox is controlled via the React Query
  // cache; click and then wait for the round-trip to flip the state.
  await page.locator('input[data-field="status"]').click();
  await expect(page.locator('input[data-field="status"]')).toBeChecked({ timeout: 3000 });

  // (7) Close view3 (Escape) and verify the task is shown as done in Q1.
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-view="task"]')).toBeHidden();
  const doneCard = page
    .locator('[data-quadrant="Q1"] .emt-task-card[data-status="done"]')
    .filter({ has: page.locator('.emt-task-card__title', { hasText: 'Refactor module' }) });
  await expect(doneCard).toBeVisible();
});
