/**
 * Sanity test for the PWA web-app manifest. Guards against accidentally
 * dropping a Lighthouse-required field.
 */
import { describe, expect, it } from 'vitest';

import { pwaManifest } from '../pwa-manifest.ts';

describe('pwaManifest', () => {
  it('declares the core install fields', () => {
    expect(pwaManifest.name).toBeTruthy();
    expect(pwaManifest.short_name).toBeTruthy();
    expect(pwaManifest.description).toBeTruthy();
    expect(pwaManifest.theme_color).toBe('#0A0E14');
    expect(pwaManifest.background_color).toBe('#0A0E14');
    expect(pwaManifest.display).toBe('standalone');
    expect(pwaManifest.scope).toBeTruthy();
    expect(pwaManifest.start_url).toBeTruthy();
    expect(pwaManifest.id).toBeTruthy();
    expect(pwaManifest.lang).toBe('en');
  });

  it('ships 192, 512, and a maskable icon', () => {
    const icons = pwaManifest.icons ?? [];
    const sizes = icons.map((i) => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
    const maskable = icons.find((i) => i.purpose === 'maskable');
    expect(maskable).toBeDefined();
    expect(maskable!.sizes).toBe('512x512');
  });
});
