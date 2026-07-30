/**
 * Step 5.3 "Done when": tasks created via the Phase 4 backend stack
 * appear in their respective cells without reload.
 *
 * Mounts a single `MatrixCell` per case (cheaper and more focused than
 * the whole matrix), seeds tasks via the registered local IDB adapter,
 * and asserts:
 *   - the cell renders one `TaskCard` per task it owns
 *   - tasks for other quadrants don't leak in
 *   - cards are ordered by `createdAt` ascending (the temporary fallback
 *     until manual order lands in Step 5.7)
 *   - creating a new task after first paint causes it to appear (the
 *     "without reload" half of the requirement) thanks to the query
 *     invalidation in `useCreateTask`
 *   - load failures surface through `ErrorBanner`
 */
import 'fake-indexeddb/auto';
import type { TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { useCreateTask } from '../src/queries/tasks.ts';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { useDefaultsStore } from '../src/state/defaults.ts';
import { MatrixCell } from '../src/views/matrix/MatrixCell.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'placeholder',
  notes: '',
  priority: 'normal',
  quadrant: 'Q2',
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

function cardTitles(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll<HTMLElement>('.emt-task-card__title')).map(
    (el) => el.textContent ?? '',
  );
}

describe('MatrixCell — Step 5.3 per-cell task list', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    useDefaultsStore.setState({
      loaded: true,
      newTaskQuadrant: 'Q1',
      sortBy: 'dueDate',
      hideCompleted: true,
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
    });
  });

  it('renders only its own quadrant tasks, sorted by createdAt asc', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    // Seed in non-chronological insertion order to ensure the sort
    // is doing the work (not just IDB iteration order).
    await adapter.create({ ...DRAFT, title: 'second', quadrant: 'Q2' });
    await new Promise((r) => setTimeout(r, 5));
    await adapter.create({ ...DRAFT, title: 'first', quadrant: 'Q2' });
    await adapter.create({ ...DRAFT, title: 'other-quadrant', quadrant: 'Q3' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q2" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(() => container.querySelectorAll('.emt-task-card').length === 2);

    const titles = cardTitles(container);
    expect(titles).not.toContain('other-quadrant');
    // The two Q2 cards are listed by ascending createdAt — 'second'
    // was inserted before 'first', so it sorts first.
    expect(titles).toEqual(['second', 'first']);
  });

  it('renders no cards when the quadrant is empty', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, quadrant: 'Q1' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q4" />
      </I18nProvider>,
    );
    teardown = unmount;

    // Wait for the load to settle (skeleton placeholders are removed
    // once the query resolves; their selector is independent of card
    // markup, so we wait on `data-task-count` flipping to 0).
    await waitFor(
      () =>
        container.querySelector<HTMLElement>('[data-task-count="0"]') !== null &&
        container.querySelectorAll('.emt-skeleton').length === 0,
    );

    expect(container.querySelectorAll('.emt-task-card').length).toBe(0);
  });

  it('updates the cell when a new task is created — no reload required', async () => {
    function Probe(): ReactNode {
      const create = useCreateTask();
      const [created, setCreated] = useState(false);
      return (
        <>
          <MatrixCell quadrant="Q2" />
          <button
            type="button"
            data-testid="seed"
            disabled={created}
            onClick={() => {
              create.mutate(
                { draft: { ...DRAFT, title: 'fresh', quadrant: 'Q2' } },
                { onSuccess: () => setCreated(true) },
              );
            }}
          >
            seed
          </button>
        </>
      );
    }

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Probe />
      </I18nProvider>,
    );
    teardown = unmount;

    // Initial paint: cell empty, query resolved.
    await waitFor(() => container.querySelector<HTMLElement>('[data-task-count="0"]') !== null);

    // Click the seed button and verify the new card appears without
    // unmounting / remounting the cell.
    const button = container.querySelector<HTMLButtonElement>('[data-testid="seed"]')!;
    button.click();

    await waitFor(() => cardTitles(container).includes('fresh'));
  });

  it('renders a skeleton row while the initial query is pending', async () => {
    // Don't pre-seed; the first render is the loading state because the
    // query hasn't resolved yet.
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;

    expect(container.querySelectorAll('.emt-skeleton').length).toBeGreaterThan(0);
  });

  it('renders an ErrorBanner when the query fails', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    // Replace `list` with a synchronous reject so the query enters the
    // error branch on first attempt (the test query client disables
    // retries).
    const original = adapter.list.bind(adapter);
    (adapter as unknown as { list: typeof adapter.list }).list = () =>
      Promise.reject(new Error('boom'));

    try {
      const { container, unmount } = await renderWithQueryClient(
        <I18nProvider>
          <MatrixCell quadrant="Q2" />
        </I18nProvider>,
      );
      teardown = unmount;

      await waitFor(() => container.querySelector('.emt-error-banner') !== null);
      const banner = container.querySelector<HTMLElement>('.emt-error-banner__message')!;
      expect(banner.textContent).toBe('boom');
    } finally {
      (adapter as unknown as { list: typeof adapter.list }).list = original;
    }
  });

  it('hides completed tasks by default and shows them when hideCompleted is off', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'open-one', quadrant: 'Q2', status: 'open' });
    const done = await adapter.create({
      ...DRAFT,
      title: 'done-one',
      quadrant: 'Q2',
      status: 'done',
    });
    void done;

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q2" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(() => container.querySelectorAll('.emt-task-card').length === 1);
    expect(cardTitles(container)).toEqual(['open-one']);

    useDefaultsStore.setState({ hideCompleted: false });
    await waitFor(() => container.querySelectorAll('.emt-task-card').length === 2);
    expect(cardTitles(container)).toContain('done-one');
  });

  it('shows empty note when every task is hidden as completed', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'done-only', quadrant: 'Q2', status: 'done' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q2" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(
      () =>
        container.querySelector<HTMLElement>('[data-task-count="0"]') !== null &&
        container.querySelector('.emt-matrix__cell-empty') !== null,
    );
    expect(container.querySelectorAll('.emt-task-card').length).toBe(0);
  });
});
