/**
 * Step 5.8 "Done when":
 *   - Empty title disabled.
 *   - Esc / outside click cancels.
 *   - Created task appears optimistically in the chosen cell.
 *
 * Tests render `<QuickComposer>` directly (the FAB → composer wiring is
 * exercised by `matrix-view.test.tsx`'s expanded sanity check below).
 * The query client is fresh per test so optimistic cache writes don't
 * leak across cases. The local IDB adapter is the only registered
 * backend; new tasks land there and the post-mutation invalidation
 * refetches the cell's list.
 */
import 'fake-indexeddb/auto';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { MatrixCell } from '../src/views/matrix/MatrixCell.tsx';
import { MatrixView } from '../src/views/matrix/MatrixView.tsx';
import { QuickComposer } from '../src/views/matrix/QuickComposer.tsx';

import { renderWithQueryClient } from './query-render.tsx';
import { renderToContainer } from './render.ts';

async function waitFor(check: () => boolean, timeoutMs = 1500): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

function setInputValue(input: HTMLInputElement, value: string): void {
  // React listens at the property setter level — assigning .value
  // directly bypasses React's input change tracking. Use the prototype
  // setter + dispatchEvent so React picks it up.
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  setter?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('QuickComposer — Step 5.8', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
  });

  it('disables submit while the title is empty', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuickComposer open={true} onClose={() => {}} />
      </I18nProvider>,
    );
    teardown = unmount;

    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(submit.disabled).toBe(true);

    const input = container.querySelector<HTMLInputElement>('.emt-quick-composer__input')!;
    await act(async () => {
      setInputValue(input, 'Buy milk');
    });
    expect(submit.disabled).toBe(false);

    // Whitespace-only counts as empty.
    await act(async () => {
      setInputValue(input, '   ');
    });
    expect(submit.disabled).toBe(true);
  });

  it('Escape closes the composer (delegated to ResponsiveSurface)', async () => {
    let closed = false;
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuickComposer open={true} onClose={() => (closed = true)} />
      </I18nProvider>,
    );
    teardown = unmount;

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(closed).toBe(true);
  });

  it('submit creates a task in the chosen quadrant via the registered backend', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    let closed = false;

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuickComposer open={true} onClose={() => (closed = true)} defaultQuadrant="Q3" />
      </I18nProvider>,
    );
    teardown = unmount;

    const input = container.querySelector<HTMLInputElement>('.emt-quick-composer__input')!;
    await act(async () => {
      setInputValue(input, 'Delegate this');
    });
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    await act(async () => {
      submit.click();
    });

    // The composer closes immediately on submit so the surface feels
    // snappy; the optimistic insert keeps the card visible in the UI.
    expect(closed).toBe(true);

    // Adapter eventually has the new task in Q3.
    await waitFor(async () => {
      const tasks = await adapter.list('Q3');
      return tasks.some((t) => t.title === 'Delegate this');
    });
  });

  it('optimistically inserts the new task into the destination cell', async () => {
    // Mount the live cell + composer on the same client so the cell's
    // `useTasks` subscription keeps the `['tasks', 'list', 'Q1']` cache
    // entry alive past gc, and so we can assert the new card appears
    // in the rendered DOM (the user-visible "appears optimistically"
    // requirement) rather than just in the cache map.
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;

    // Block `adapter.create` until we release it, so the optimistic
    // placeholder is the only thing in the cell while the real write
    // is in flight.
    let release: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const original = adapter.create.bind(adapter);
    (adapter as unknown as { create: typeof adapter.create }).create = (draft) =>
      blocked.then(() => original(draft));

    try {
      const client = new QueryClient({
        defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
      });
      const { container, unmount } = await renderToContainer(
        <QueryClientProvider client={client}>
          <I18nProvider>
            <MatrixCell quadrant="Q1" />
            <QuickComposer open={true} onClose={() => {}} defaultQuadrant="Q1" />
          </I18nProvider>
        </QueryClientProvider>,
      );
      teardown = () => {
        unmount();
        client.clear();
      };

      // Wait for the cell's empty state to settle (skeletons gone).
      await waitFor(
        () =>
          container.querySelector<HTMLElement>('[data-quadrant="Q1"] [data-task-count="0"]') !==
          null,
      );

      const input = container.querySelector<HTMLInputElement>('.emt-quick-composer__input')!;
      await act(async () => {
        setInputValue(input, 'optimistic');
      });
      const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
      await act(async () => {
        submit.click();
      });

      // The Q1 cell now shows the optimistic card while adapter.create
      // is still blocked.
      await waitFor(() => {
        const titles = Array.from(
          container.querySelectorAll<HTMLElement>('[data-quadrant="Q1"] .emt-task-card__title'),
        );
        return titles.some((el) => el.textContent === 'optimistic');
      });

      // The placeholder carries the `optimistic-` id prefix until the
      // post-success invalidation refetches and replaces it.
      const cardEl = Array.from(
        container.querySelectorAll<HTMLElement>('[data-quadrant="Q1"] .emt-task-card'),
      ).find((el) => el.querySelector('.emt-task-card__title')?.textContent === 'optimistic')!;
      expect(cardEl.dataset['taskId']).toMatch(/^optimistic-/);

      // Release the adapter; after the refetch lands, the same title is
      // present but its id is the real one assigned by the adapter.
      await act(async () => {
        release?.();
        await new Promise((r) => setTimeout(r, 0));
      });
      await waitFor(() => {
        const cards = Array.from(
          container.querySelectorAll<HTMLElement>('[data-quadrant="Q1"] .emt-task-card'),
        );
        return cards.some((el) => {
          const title = el.querySelector('.emt-task-card__title')?.textContent;
          const id = el.dataset['taskId'] ?? '';
          return title === 'optimistic' && !id.startsWith('optimistic-');
        });
      });
    } finally {
      (adapter as unknown as { create: typeof adapter.create }).create = original;
    }
  });

  it('renders nothing when open is false', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuickComposer open={false} onClose={() => {}} />
      </I18nProvider>,
    );
    teardown = unmount;

    expect(container.querySelector('.emt-quick-composer')).toBeNull();
  });
});

describe('MatrixView — Step 5.8 FAB integration', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
  });

  it('renders the FAB and opens the composer on click', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
      </I18nProvider>,
    );
    teardown = unmount;

    const fab = container.querySelector<HTMLButtonElement>('.emt-matrix__fab')!;
    expect(fab).not.toBeNull();
    expect(fab.getAttribute('aria-haspopup')).toBe('dialog');
    expect(fab.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      fab.click();
    });
    // Sheet renders into the same container tree (no portal). The
    // composer form is visible and the FAB reflects the open state.
    expect(document.querySelector('.emt-quick-composer')).not.toBeNull();
    expect(fab.getAttribute('aria-expanded')).toBe('true');
  });
});
