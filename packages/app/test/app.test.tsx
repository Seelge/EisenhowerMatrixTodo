/**
 * Smoke test for the root composition. Verifies:
 *  - The ThemeProvider wrapper is present, exposing the dark theme.
 *  - The placeholder home heading and copy render through `useT`.
 *  - The ErrorBoundary catches a thrown error and surfaces the
 *    design-system ErrorBanner with the translated retry label.
 */
import { afterEach, describe, expect, it } from 'vitest';

import { App } from '../src/App.tsx';
import { ErrorBoundary } from '../src/ErrorBoundary.tsx';
import { strings } from '../src/i18n/strings.en.ts';

import { renderToContainer } from './render.ts';

describe('<App />', () => {
  let teardown: (() => void) | undefined;

  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('mounts the dark theme and renders the placeholder home page', async () => {
    const { container, unmount } = await renderToContainer(<App />);
    teardown = unmount;

    const themeWrapper = container.querySelector<HTMLElement>('[data-emt-theme="dark"]');
    expect(themeWrapper).not.toBeNull();
    expect(themeWrapper!.style.getPropertyValue('--color-bg')).not.toBe('');

    expect(container.querySelector('h1')?.textContent).toBe(strings['app.matrix.heading']);
    expect(container.querySelector('p')?.textContent).toBe(strings['app.matrix.placeholder']);
  });

  it('ErrorBoundary surfaces the translated fallback when a child throws', async () => {
    function Boom(): React.ReactNode {
      throw new Error('boom');
    }
    // Suppress React's expected console.error during the throw.
    const originalError = console.error;
    console.error = () => {};
    try {
      const { container, unmount } = await renderToContainer(
        <ErrorBoundary>
          <Boom />
        </ErrorBoundary>,
      );
      teardown = unmount;
      expect(container.querySelector('[role="alert"]')?.textContent).toContain(
        strings['app.error.fallback.message'],
      );
      expect(container.textContent).toContain(strings['app.error.fallback.retry']);
    } finally {
      console.error = originalError;
    }
  });
});
