/**
 * TagsField + filter bar (Phase 14).
 */
import 'fake-indexeddb/auto';
import type { TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { MatrixView } from '../src/views/matrix/MatrixView.tsx';
import { useTagFilterStore } from '../src/views/tags/tag-filter-store.ts';
import { TagsField } from '../src/views/task/TagsField.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'tagged',
  notes: '',
  priority: 'normal',
  quadrant: 'Q1',
  status: 'open',
  tags: ['work'],
};

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('TagsField — Phase 14', () => {
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

  it('adds a tag on submit and removes via chip button', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const created = await adapter.create({ ...DRAFT, tags: [] });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <TagsField task={created} />
      </I18nProvider>,
    );
    teardown = unmount;

    const input = container.querySelector<HTMLInputElement>('[data-field="tags"]')!;
    await act(async () => {
      setInputValue(input, 'home');
      input.form?.requestSubmit();
    });

    await waitFor(async () => {
      const fresh = await adapter.get(created.id);
      return fresh?.tags.includes('home') === true;
    });

    // Re-fetch the rendered task's remove for the chip that appears after
    // invalidation — TagsField reads task.tags from props, so remount with
    // the updated task for the remove assertion.
    const updated = (await adapter.get(created.id))!;
    unmount();
    const second = await renderWithQueryClient(
      <I18nProvider>
        <TagsField task={updated} />
      </I18nProvider>,
    );
    teardown = second.unmount;

    expect(second.container.querySelector('[data-tag="home"]')).not.toBeNull();
    await act(async () => {
      second.container.querySelector<HTMLButtonElement>('[data-tag="home"]')!.click();
    });
    await waitFor(async () => {
      const fresh = await adapter.get(created.id);
      return fresh?.tags.includes('home') === false;
    });
  });

  it('filter bar on matrix hides non-matching cards', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'Work item', tags: ['work'], quadrant: 'Q1' });
    await adapter.create({
      ...DRAFT,
      title: 'Home chore',
      tags: ['home'],
      quadrant: 'Q1',
    });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(() => container.querySelectorAll('.emt-task-card').length >= 2);
    await waitFor(() => container.querySelector('[data-tag-filter]') !== null);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('.emt-tag-filter__chip[data-tag="work"]')!.click();
    });

    await waitFor(() => {
      const titles = Array.from(
        container.querySelectorAll<HTMLElement>('.emt-task-card__title'),
      ).map((el) => el.textContent);
      return titles.includes('Work item') && !titles.includes('Home chore');
    });
  });
});
