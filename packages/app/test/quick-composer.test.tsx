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
import { SnackbarProvider } from '@emt/design-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import { MatrixCell } from '../src/views/matrix/MatrixCell.tsx';
import { MatrixView } from '../src/views/matrix/MatrixView.tsx';
import { QuickComposer } from '../src/views/matrix/QuickComposer.tsx';
import { QuadrantView } from '../src/views/quadrant/QuadrantView.tsx';

import { renderWithQueryClient } from './query-render.tsx';
import { renderToContainer } from './render.ts';

function resetTo(internalPath: string): void {
  window.history.replaceState(null, '', internalPath);
  useViewStateStore.getState().syncFromUrl();
}

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
          <SnackbarProvider>
            <I18nProvider>
              <MatrixCell quadrant="Q1" />
              <QuickComposer open={true} onClose={() => {}} defaultQuadrant="Q1" />
            </I18nProvider>
          </SnackbarProvider>
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

  it('hides the quadrant picker when showQuadrantPicker is false (Step 6.5)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuickComposer
          open={true}
          onClose={() => {}}
          defaultQuadrant="Q3"
          showQuadrantPicker={false}
        />
      </I18nProvider>,
    );
    teardown = unmount;

    // Picker is not rendered — view2's focused frame already implies
    // the destination, so the composer surface only shows the title
    // input + submit row.
    expect(container.querySelector('.emt-quadrant-picker')).toBeNull();
    // The title input is still present.
    expect(container.querySelector('.emt-quick-composer__input')).not.toBeNull();
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

  it('hides due/priority until "More options" is expanded (TODO 4)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuickComposer open={true} onClose={() => {}} />
      </I18nProvider>,
    );
    teardown = unmount;

    expect(container.querySelector('.emt-due-date-picker')).toBeNull();
    expect(container.querySelector('.emt-quick-composer__priority')).toBeNull();

    const toggle = container.querySelector<HTMLButtonElement>('[data-action="composer-more"]')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    await act(async () => {
      toggle.click();
    });
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(container.querySelector('.emt-due-date-picker')).not.toBeNull();
    expect(container.querySelector('.emt-quick-composer__priority')).not.toBeNull();
  });

  it('submit with expanded due + priority writes those fields', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuickComposer open={true} onClose={() => {}} defaultQuadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;

    const input = container.querySelector<HTMLInputElement>('.emt-quick-composer__input')!;
    await act(async () => {
      setInputValue(input, 'with meta');
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-action="composer-more"]')!.click();
    });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>('.emt-due-date-picker [data-emt-preset="today"]')!
        .click();
    });
    await act(async () => {
      container
        .querySelector<HTMLButtonElement>(
          '.emt-quick-composer__priority-option[data-priority="high"]',
        )!
        .click();
    });
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    });

    await waitFor(async () => {
      const tasks = await adapter.list('Q1');
      return tasks.some((t) => t.title === 'with meta' && t.priority === 'high' && t.dueDate);
    });
    const created = (await adapter.list('Q1')).find((t) => t.title === 'with meta')!;
    expect(created.priority).toBe('high');
    expect(created.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
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

describe('QuadrantView — Step 6.5 FAB integration', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    resetTo('/q/Q3');
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    resetTo('/');
  });

  it('renders the FAB and opens a picker-less composer that creates in the focused quadrant', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q3" />
      </I18nProvider>,
    );
    teardown = unmount;

    const fab = container.querySelector<HTMLButtonElement>('.emt-quadrant__fab')!;
    expect(fab).not.toBeNull();
    expect(fab.getAttribute('aria-haspopup')).toBe('dialog');
    expect(fab.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      fab.click();
    });

    expect(fab.getAttribute('aria-expanded')).toBe('true');
    expect(document.querySelector('.emt-quick-composer')).not.toBeNull();
    // Picker is hidden — view2's frame already implies the destination.
    expect(document.querySelector('.emt-quadrant-picker')).toBeNull();

    const input = container.querySelector<HTMLInputElement>('.emt-quick-composer__input')!;
    await act(async () => {
      setInputValue(input, 'from view2');
    });
    const submit = container.querySelector<HTMLButtonElement>('button[type="submit"]')!;
    await act(async () => {
      submit.click();
    });

    await waitFor(async () => {
      const tasks = await adapter.list('Q3');
      return tasks.some((t) => t.title === 'from view2');
    });
    // None of the other quadrants picked it up.
    for (const q of ['Q1', 'Q2', 'Q4'] as const) {
      const tasks = await adapter.list(q);
      expect(tasks.some((t) => t.title === 'from view2')).toBe(false);
    }
  });
});
