/**
 * ReorderHint (TODO 13) — one-shot discoverability nudge.
 */
import 'fake-indexeddb/auto';
import type { TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { MatrixCell } from '../src/views/matrix/MatrixCell.tsx';
import { __resetReorderHintForTesting, ReorderHint } from '../src/views/matrix/ReorderHint.tsx';

import { renderWithQueryClient } from './query-render.tsx';
import { renderToContainer } from './render.ts';

const DRAFT: TaskDraft = {
  title: 'placeholder',
  notes: '',
  priority: 'normal',
  quadrant: 'Q1',
  status: 'open',
  tags: [],
};

async function waitFor(check: () => boolean, timeoutMs = 1500): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('ReorderHint — TODO 13', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    __resetReorderHintForTesting();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    __resetReorderHintForTesting();
  });

  it('renders when visible and dismisses into sessionStorage', async () => {
    const { container, unmount } = await renderToContainer(
      <I18nProvider>
        <ReorderHint visible={true} />
      </I18nProvider>,
    );
    teardown = unmount;

    expect(container.querySelector('[data-reorder-hint]')).not.toBeNull();
    await act(async () => {
      container.querySelector<HTMLButtonElement>('.emt-reorder-hint__dismiss')!.click();
    });
    expect(container.querySelector('[data-reorder-hint]')).toBeNull();
    expect(sessionStorage.getItem('emt:reorder-hint-dismissed')).toBe('1');
  });

  it('stays hidden after a prior dismissal in the same session', async () => {
    sessionStorage.setItem('emt:reorder-hint-dismissed', '1');
    const { container, unmount } = await renderToContainer(
      <I18nProvider>
        <ReorderHint visible={true} />
      </I18nProvider>,
    );
    teardown = unmount;
    expect(container.querySelector('[data-reorder-hint]')).toBeNull();
  });

  it('appears in a MatrixCell with two+ unranked tasks', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'one' });
    await adapter.create({ ...DRAFT, title: 'two' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(() => container.querySelectorAll('.emt-task-card').length >= 2);
    expect(container.querySelector('[data-reorder-hint]')).not.toBeNull();
  });
});
