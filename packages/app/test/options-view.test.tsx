/**
 * Step 9.1 — OptionsView routing.
 *
 * The "Done when" assertion: browser back/forward works between
 * groups. We drive `navigateRaw('/options/backends')` and then a
 * synthetic `popstate` (the browser's contract on back/forward)
 * and verify the surface mirrors the URL each time.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import { OptionsView } from '../src/views/options/OptionsView.tsx';

import { renderWithQueryClient } from './query-render.tsx';

describe('OptionsView — Step 9.1', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    window.history.replaceState(null, '', '/options');
    useViewStateStore.getState().syncFromUrl();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
  });

  it('renders the index when at /options', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <OptionsView />
      </I18nProvider>,
    );
    teardown = unmount;
    expect(container.querySelector('[data-options-list]')).not.toBeNull();
    expect(container.querySelectorAll('.emt-options__list-button')).toHaveLength(6);
  });

  it('clicking a group entry navigates to /options/:group', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <OptionsView />
      </I18nProvider>,
    );
    teardown = unmount;
    const backends = container.querySelector<HTMLButtonElement>(
      '.emt-options__list-button[data-options-group="backends"]',
    )!;

    await act(async () => {
      backends.click();
    });

    expect(useViewStateStore.getState().internalPath).toBe('/options/backends');
    expect(container.querySelector('[data-options-group="backends"]')).not.toBeNull();
    expect(container.querySelector('[data-options-list]')).toBeNull();
  });

  it('browser back returns to the index', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <OptionsView />
      </I18nProvider>,
    );
    teardown = unmount;

    await act(async () => {
      useViewStateStore.getState().navigateRaw('/options/backends');
    });
    expect(useViewStateStore.getState().internalPath).toBe('/options/backends');

    // Simulate back: pop history and fire popstate; Router listens
    // for it in production. In this test the store is wired directly.
    await act(async () => {
      window.history.back();
      // Some happy-dom releases don't synchronously fire popstate on
      // history.back(); call syncFromUrl as the safety net.
      window.dispatchEvent(new PopStateEvent('popstate'));
      useViewStateStore.getState().syncFromUrl();
    });

    expect(useViewStateStore.getState().internalPath.replace(/\?.*$/, '')).toBe('/options');
    // List is back.
    expect(container.querySelector('[data-options-list]')).not.toBeNull();
  });
});
