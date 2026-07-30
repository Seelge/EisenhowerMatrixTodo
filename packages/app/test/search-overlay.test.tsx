/**
 * Search overlay integration (TODO 6):
 *   - Search button opens the overlay
 *   - Typing filters results
 *   - Picking a result opens view3 and closes search
 *   - Matching cards get data-search-match
 */
import 'fake-indexeddb/auto';
import type { TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import { MatrixView } from '../src/views/matrix/MatrixView.tsx';
import { useSearchStore } from '../src/views/search/search-store.ts';
import { SearchHotkeys, SearchOverlay } from '../src/views/search/SearchOverlay.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'placeholder',
  notes: '',
  priority: 'normal',
  quadrant: 'Q1',
  status: 'open',
  tags: [],
};

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function waitFor(check: () => boolean, timeoutMs = 1500): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('SearchOverlay — TODO 6', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    useSearchStore.setState({ open: false, query: '', matchIds: new Set() });
    window.history.replaceState(null, '', '/');
    useViewStateStore.getState().syncFromUrl();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    useSearchStore.setState({ open: false, query: '', matchIds: new Set() });
  });

  it('Search button opens the overlay from the matrix shell', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
        <SearchOverlay />
      </I18nProvider>,
    );
    teardown = unmount;

    const btn = container.querySelector<HTMLButtonElement>('[data-action="open-search"]')!;
    expect(btn).not.toBeNull();
    expect(btn.getAttribute('aria-label')).toBe('Search tasks');

    await act(async () => {
      btn.click();
    });
    expect(document.querySelector('[data-view="search"]')).not.toBeNull();
    expect(useSearchStore.getState().open).toBe(true);
  });

  it('filters results and opens the matched task', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const created = await adapter.create({ ...DRAFT, title: 'Find me later', quadrant: 'Q2' });
    await adapter.create({ ...DRAFT, title: 'Other chore', quadrant: 'Q1' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
        <SearchOverlay />
      </I18nProvider>,
    );
    teardown = unmount;

    await act(async () => {
      useSearchStore.getState().openSearch();
    });
    await waitFor(() => document.querySelector('.emt-search__input') !== null);

    const input = document.querySelector<HTMLInputElement>('.emt-search__input')!;
    await act(async () => {
      setInputValue(input, 'find me');
    });

    await waitFor(() => {
      const results = document.querySelectorAll<HTMLElement>('.emt-search__result');
      return results.length === 1 && results[0]?.textContent?.includes('Find me later') === true;
    });

    // Matching card on the matrix is highlighted.
    await waitFor(() => {
      const card = container.querySelector<HTMLElement>(`[data-task-id="${created.id}"]`);
      return card?.dataset['searchMatch'] === 'true';
    });

    await act(async () => {
      document.querySelector<HTMLButtonElement>('.emt-search__result')!.click();
    });

    expect(useSearchStore.getState().open).toBe(false);
    expect(useViewStateStore.getState().state.focusedTaskId).toBe(created.id);
  });

  it('Ctrl+K hotkey opens search', async () => {
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <SearchHotkeys />
        <SearchOverlay />
      </I18nProvider>,
    );
    teardown = unmount;

    await act(async () => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
      );
    });
    expect(useSearchStore.getState().open).toBe(true);
  });

  it('Escape closes search', async () => {
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <SearchOverlay />
      </I18nProvider>,
    );
    teardown = unmount;

    await act(async () => {
      useSearchStore.getState().openSearch();
    });
    expect(useSearchStore.getState().open).toBe(true);

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(useSearchStore.getState().open).toBe(false);
  });
});
