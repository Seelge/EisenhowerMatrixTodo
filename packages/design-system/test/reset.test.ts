/**
 * @vitest-environment node
 *
 * Drift guard: `reset.css` is the canonical reset for bundler @import
 * paths; `RESET_CSS` is the runtime-injected mirror used by ThemeProvider.
 * Anything that updates one must update the other.
 *
 * Forced to the node environment because happy-dom rewrites
 * `import.meta.url` to a non-file URL, breaking `fileURLToPath`.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { RESET_CSS } from '../src/reset.ts';

describe('RESET_CSS / reset.css drift guard', () => {
  it('matches reset.css byte-for-byte', () => {
    const cssPath = fileURLToPath(new URL('../src/reset.css', import.meta.url));
    const fromFile = readFileSync(cssPath, 'utf8');
    expect(RESET_CSS).toBe(fromFile);
  });
});
