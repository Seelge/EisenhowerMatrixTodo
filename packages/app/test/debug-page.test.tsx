/**
 * Smoke test for the dev-only DebugPage. Verifies it mounts, renders
 * the create form and an empty-list message, then renders a row after
 * an underlying task is added through the registry.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DebugPage } from '../src/debug/DebugPage.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';

import { renderWithQueryClient } from './query-render.tsx';

function freshIdb(): void {
  globalThis.indexedDB = new IDBFactory();
}

async function waitFor(check: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('<DebugPage />', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    freshIdb();
    __resetBackendsCacheForTesting();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
  });

  it('renders the create form and an empty-list message', async () => {
    const { container, unmount } = await renderWithQueryClient(<DebugPage />);
    teardown = unmount;

    expect(container.querySelector('input[aria-label="Task title"]')).not.toBeNull();
    expect(container.querySelector('select[aria-label="Quadrant"]')).not.toBeNull();
    await waitFor(() => container.textContent?.includes('No tasks yet') === true);
  });

  it('lists tasks created through the registry', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({
      title: 'Already-here',
      notes: '',
      priority: 'normal',
      quadrant: 'Q1',
      status: 'open',
      tags: [],
    });

    const { container, unmount } = await renderWithQueryClient(<DebugPage />);
    teardown = unmount;

    await waitFor(() => container.querySelector('[data-task-id]') !== null);
    expect(container.textContent).toContain('Already-here');
    expect(container.textContent).toContain('Q1');
  });
});
