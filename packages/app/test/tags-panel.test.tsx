/**
 * Options → Tags panel: filter, rename, delete (Phase 19).
 */
import 'fake-indexeddb/auto';
import type { TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { TagsPanel } from '../src/views/options/TagsPanel.tsx';
import { useTagFilterStore } from '../src/views/tags/tag-filter-store.ts';

import { renderWithQueryClient } from './query-render.tsx';

const base = (tags: string[], title: string): TaskDraft => ({
  title,
  notes: '',
  priority: 'normal',
  quadrant: 'Q1',
  status: 'open',
  tags,
});

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function waitFor(check: () => boolean | Promise<boolean>, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 15));
  }
}

describe('TagsPanel — Phase 19', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    useTagFilterStore.setState({ activeTag: undefined });
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    useTagFilterStore.setState({ activeTag: undefined });
  });

  it('renames a tag across tasks and updates the active filter', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const a = await adapter.create(base(['work'], 'a'));
    const b = await adapter.create(base(['Work', 'home'], 'b'));
    useTagFilterStore.getState().setActiveTag('work');

    const { container, unmount, client } = await renderWithQueryClient(
      <I18nProvider>
        <TagsPanel />
      </I18nProvider>,
    );
    teardown = unmount;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['tasks'] });
    });

    await waitFor(() => container.querySelectorAll('.emt-tags-panel__row').length >= 1);

    const row =
      container.querySelector<HTMLElement>('[data-tag="work"]') ??
      container.querySelector<HTMLElement>('[data-tag="Work"]');
    expect(row).not.toBeNull();

    await act(async () => {
      row!.querySelector<HTMLButtonElement>('[data-action="rename"]')!.click();
    });
    const input = container.querySelector<HTMLInputElement>('[data-action="rename-input"]')!;
    await act(async () => {
      setInputValue(input, 'job');
      container.querySelector<HTMLButtonElement>('[data-action="rename-save"]')!.click();
    });

    await waitFor(async () => {
      const ta = await adapter.get(a.id);
      const tb = await adapter.get(b.id);
      return (
        ta?.tags.includes('job') === true &&
        tb?.tags.includes('job') === true &&
        useTagFilterStore.getState().activeTag === 'job'
      );
    });
    expect((await adapter.get(b.id))?.tags).toEqual(['job', 'home']);
    expect(container.querySelector('[data-tags-info]')?.textContent).toMatch(/job/i);
  });

  it('deletes a tag after confirm and clears the filter', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const created = await adapter.create(base(['errand'], 'c'));
    useTagFilterStore.getState().setActiveTag('errand');

    const { container, unmount, client } = await renderWithQueryClient(
      <I18nProvider>
        <TagsPanel />
      </I18nProvider>,
    );
    teardown = unmount;
    await act(async () => {
      await client.invalidateQueries({ queryKey: ['tasks'] });
    });

    await waitFor(() => container.querySelector('[data-tag="errand"]') !== null);

    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('[data-tag="errand"] [data-action="delete"]')!
        .click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-action="delete-confirm-yes"]')!.click();
    });

    await waitFor(async () => {
      const fresh = await adapter.get(created.id);
      return fresh?.tags.length === 0 && useTagFilterStore.getState().activeTag === undefined;
    });
  });
});
