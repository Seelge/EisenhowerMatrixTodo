/**
 * @vitest-environment node
 *
 * Drift guard: `components.css` is the canonical stylesheet for bundler
 * @import paths; `COMPONENT_CSS` is the runtime-injected mirror used by
 * ThemeProvider. Anything that updates one must update the other.
 *
 * Forced to the node environment because happy-dom rewrites
 * `import.meta.url` to a non-file URL, breaking `fileURLToPath`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { COMPONENT_CSS } from '../src/components.ts';

describe('COMPONENT_CSS / components.css drift guard', () => {
  it('matches components.css byte-for-byte', () => {
    const cssPath = fileURLToPath(new URL('../src/components.css', import.meta.url));
    const fromFile = readFileSync(cssPath, 'utf8');
    expect(COMPONENT_CSS).toBe(fromFile);
  });
});
