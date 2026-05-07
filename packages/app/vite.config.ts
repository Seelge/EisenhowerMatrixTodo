import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

import { pwaManifest } from './pwa-manifest.ts';

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? (process.env['VITE_BASE_PATH'] ?? '/EisenhowerMatrixTodo/') : '/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/192.png', 'icons/512.png', 'icons/maskable-512.png'],
      manifest: pwaManifest,
      workbox: {
        // Precache the built app-shell (HTML, JS, CSS, web manifest,
        // icons). Default globs already cover this set; spelled out
        // for clarity.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
        // Single-page-app fallback: any navigation request that
        // misses the precache returns the precached `index.html`.
        // That's what makes offline reload (and offline deep-links)
        // work — the SPA router takes over from there.
        navigateFallback: 'index.html',
        // Skip waiting + clientsClaim are already implied by
        // `registerType: 'autoUpdate'`; setting them here as well
        // keeps the behavior explicit.
        clientsClaim: true,
        skipWaiting: true,
        runtimeCaching: [
          {
            // Future remote backends (Google Tasks, Microsoft Graph)
            // hit cross-origin `https://*.googleapis.com` /
            // `https://graph.microsoft.com`. NetworkFirst keeps the
            // app responsive offline while preferring fresh data
            // when online; failed requests fall through to whatever
            // the adapter does on a thrown error.
            urlPattern: ({ url }) =>
              url.hostname.endsWith('googleapis.com') ||
              url.hostname.endsWith('graph.microsoft.com'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'remote-backends',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
  preview: {
    port: 4173,
  },
}));
