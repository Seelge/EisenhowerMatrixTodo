import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  // Build (so the SW + manifest exist on disk) and serve via Vite
  // preview before the suite runs. Reuse a server already started
  // outside of CI so iterating locally doesn't pay the rebuild cost
  // each run.
  webServer: {
    // VITE_BASE_PATH=/ overrides the production GitHub-Pages prefix so
    // preview serves from the root and the e2e specs can use simple
    // relative URLs (`/`, `/manifest.webmanifest`).
    command:
      'VITE_BASE_PATH=/ pnpm build && pnpm preview --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://localhost:4173/',
    reuseExistingServer: !process.env['CI'],
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
