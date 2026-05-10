/**
 * End-to-end PWA smoke. Run with `pnpm e2e` after `pnpm --filter
 * @emt/app build` so `vite preview` has a built bundle to serve. The
 * playwright config's `webServer` block handles the build + preview
 * lifecycle automatically.
 *
 * Three checks correspond to the plan-step-4.5 "Done when" criteria:
 *  1. The manifest is served and parses; required fields are present.
 *  2. A service worker registers and takes control.
 *  3. With the network blocked, a reload still serves the app shell
 *     (workbox precache + `navigateFallback: 'index.html'`).
 */
import { expect, test, type Page } from '@playwright/test';

async function waitForServiceWorkerControl(page: Page): Promise<void> {
  await page.waitForFunction(
    async () => {
      const reg = await navigator.serviceWorker.ready;
      return reg.active?.state === 'activated' && navigator.serviceWorker.controller !== null;
    },
    null,
    { timeout: 15_000 },
  );
}

test('serves a valid web-app manifest', async ({ page, request }) => {
  await page.goto('/');
  const res = await request.get('/manifest.webmanifest');
  expect(res.status()).toBe(200);
  const manifest: {
    name?: string;
    short_name?: string;
    display?: string;
    icons?: ReadonlyArray<{ sizes?: string; purpose?: string }>;
  } = await res.json();
  expect(manifest.name).toBe('Eisenhower Matrix Todo');
  expect(manifest.short_name).toBe('EMT');
  expect(manifest.display).toBe('standalone');
  const sizes = (manifest.icons ?? []).map((i) => i.sizes);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
});

test('registers a service worker and takes control', async ({ page }) => {
  await page.goto('/');
  await waitForServiceWorkerControl(page);
  const count = await page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    return regs.length;
  });
  expect(count).toBeGreaterThan(0);
});

test('offline reload serves the precached shell', async ({ page, context }) => {
  await page.goto('/');
  await waitForServiceWorkerControl(page);

  await context.setOffline(true);
  try {
    await page.reload();
    // Whatever the matrix renders is fine — we just need the shell
    // HTML + JS to come back from the precache rather than a "no
    // network" browser error.
    await expect(page.locator('[data-view="matrix"]')).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});
