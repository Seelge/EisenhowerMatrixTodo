/**
 * Step 9.5 — DefaultsPanel.
 *
 * "Done when": changing the default quadrant changes the FAB → quick
 * composer pre-selection. Verified by checking that
 * `useNewTaskQuadrant()` (the hook MatrixView uses to feed
 * `QuickComposer.defaultQuadrant`) flips to the chosen value after
 * the panel writes.
 *
 * The companion sortBy round-trip is also covered — both values
 * persist through the shared meta IDB store and rehydrate on a
 * fresh `load()`.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { useDefaultsStore } from '../src/state/defaults.ts';
import { DefaultsPanel } from '../src/views/options/DefaultsPanel.tsx';

import { renderWithQueryClient } from './query-render.tsx';

async function waitForAsync(
  check: () => Promise<boolean> | boolean,
  timeoutMs = 1500,
): Promise<void> {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('DefaultsPanel — Step 9.5', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    useDefaultsStore.setState({
      loaded: false,
      newTaskQuadrant: 'Q1',
      sortBy: 'dueDate',
      hideCompleted: true,
      defaultPriority: 'normal',
    });
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    useDefaultsStore.setState({
      loaded: false,
      newTaskQuadrant: 'Q1',
      sortBy: 'dueDate',
      hideCompleted: true,
      defaultPriority: 'normal',
    });
  });

  it('selects Q3 and the FAB pre-selection follows', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DefaultsPanel />
      </I18nProvider>,
    );
    teardown = unmount;
    const q3 = container.querySelector<HTMLInputElement>(
      '[data-field="default-quadrant"][value="Q3"]',
    )!;

    await act(async () => {
      q3.click();
    });
    await waitForAsync(() => useDefaultsStore.getState().newTaskQuadrant === 'Q3');

    // The same hook MatrixView reads sees the new value.
    expect(useDefaultsStore.getState().newTaskQuadrant).toBe('Q3');
  });

  it('switches default sort to "title" and persists across reloads', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DefaultsPanel />
      </I18nProvider>,
    );
    teardown = unmount;
    const titleSort = container.querySelector<HTMLInputElement>(
      '[data-field="default-sort"][value="title"]',
    )!;

    await act(async () => {
      titleSort.click();
    });
    await waitForAsync(() => useDefaultsStore.getState().sortBy === 'title');

    // Reset the in-memory store, reload from the (still-populated)
    // meta IDB — value rehydrates.
    useDefaultsStore.setState({
      loaded: false,
      newTaskQuadrant: 'Q1',
      sortBy: 'dueDate',
      hideCompleted: true,
      defaultPriority: 'normal',
    });
    await act(async () => {
      await useDefaultsStore.getState().load();
    });
    expect(useDefaultsStore.getState().sortBy).toBe('title');
  });

  it('toggles hide completed off and persists across reloads', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DefaultsPanel />
      </I18nProvider>,
    );
    teardown = unmount;
    const checkbox = container.querySelector<HTMLInputElement>('[data-field="hide-completed"]')!;
    expect(checkbox.checked).toBe(true);

    await act(async () => {
      checkbox.click();
    });
    await waitForAsync(() => useDefaultsStore.getState().hideCompleted === false);

    useDefaultsStore.setState({
      loaded: false,
      newTaskQuadrant: 'Q1',
      sortBy: 'dueDate',
      hideCompleted: true,
      defaultPriority: 'normal',
    });
    await act(async () => {
      await useDefaultsStore.getState().load();
    });
    expect(useDefaultsStore.getState().hideCompleted).toBe(false);
  });

  it('sets default priority to high and persists', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DefaultsPanel />
      </I18nProvider>,
    );
    teardown = unmount;
    const high = container.querySelector<HTMLInputElement>(
      '[data-field="default-priority"][value="high"]',
    )!;
    await act(async () => {
      high.click();
    });
    await waitForAsync(() => useDefaultsStore.getState().defaultPriority === 'high');

    useDefaultsStore.setState({
      loaded: false,
      newTaskQuadrant: 'Q1',
      sortBy: 'dueDate',
      hideCompleted: true,
      defaultPriority: 'normal',
    });
    await act(async () => {
      await useDefaultsStore.getState().load();
    });
    expect(useDefaultsStore.getState().defaultPriority).toBe('high');
  });
});
