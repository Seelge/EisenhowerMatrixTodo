/**
 * PWA web-app manifest declaration. Imported by `vite.config.ts` for
 * the build-time injection and by `test/pwa-manifest.test.ts` so a
 * regression test can fail fast when a Lighthouse-required field is
 * accidentally dropped.
 *
 * Fields tracked here:
 *  - name / short_name / description (search + install UI)
 *  - id (stable install identity, decoupled from start_url)
 *  - lang / dir / categories (a11y + store metadata)
 *  - theme_color / background_color (status bar + splash)
 *  - display / orientation
 *  - scope / start_url — relative `.` so they track Vite `base`
 *  - icons — 192, 512, and a 512 maskable variant
 */
import type { ManifestOptions } from 'vite-plugin-pwa';

export const pwaManifest: Partial<ManifestOptions> = {
  id: '/EisenhowerMatrixTodo/',
  name: 'Eisenhower Matrix Todo',
  short_name: 'EMT',
  description: 'Local-first Eisenhower-matrix to-do app, installable as a PWA.',
  lang: 'en',
  dir: 'ltr',
  categories: ['productivity', 'utilities'],
  theme_color: '#0A0E14',
  background_color: '#0A0E14',
  display: 'standalone',
  orientation: 'any',
  start_url: '.',
  scope: '.',
  icons: [
    { src: 'icons/192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icons/512.png', sizes: '512x512', type: 'image/png' },
    {
      src: 'icons/maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
};
