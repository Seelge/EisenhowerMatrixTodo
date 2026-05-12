/**
 * Step 9.7 — AboutPanel renders the Vite-injected build info.
 *
 * The vitest config mirrors the production `define` block with
 * static literals so the assertion below stays stable regardless
 * of the test runner's git state.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { AboutPanel } from '../src/views/options/AboutPanel.tsx';

import { renderWithQueryClient } from './query-render.tsx';

describe('AboutPanel — Step 9.7', () => {
  let teardown: (() => void) | undefined;

  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders the build info baked in at compile time', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <AboutPanel />
      </I18nProvider>,
    );
    teardown = unmount;

    const version = container.querySelector('[data-field="version"]')!;
    expect(version.textContent).toBe('0.0.0-test');

    const commit = container.querySelector('[data-field="commit"] code')!;
    // The panel shows a 7-character short SHA.
    expect(commit.textContent).toBe('test-sh');

    const builtAt = container.querySelector('[data-field="built-at"]')!;
    expect(builtAt.textContent).toBe('2026-01-01T00:00:00.000Z');

    // Source link present and points at the repo.
    const source = container.querySelector<HTMLAnchorElement>('a[data-action="source"]')!;
    expect(source.href).toMatch(/github\.com\/Seelge\/EisenhowerMatrixTodo/);
  });
});
