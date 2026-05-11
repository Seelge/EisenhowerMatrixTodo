/**
 * Step 8.1 — `TaskView` surface container.
 *
 * Deep-links `?task=:id` and verifies the design-system `ResponsiveSurface`
 * picks the right surface for the viewport (bottom sheet on narrow,
 * right side panel on wide) while keeping the underlying view (matrix
 * or focused quadrant) in the DOM. Also covers the close path: pressing
 * Escape inside the surface drops `focusedTaskId` from view-state and
 * the URL, returning the user to whichever zoom level they came from.
 *
 * The `matchMedia` stub mirrors `zoom-reduced-motion.test.tsx` so the
 * `useSyncExternalStore` subscription inside `ResponsiveSurface` sees a
 * stable matches value across the render. happy-dom's default
 * `matchMedia` returns `matches: false`, but we stub it explicitly per
 * test so both branches of the breakpoint are covered.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { strings } from '../src/i18n/strings.en.ts';
import { Router } from '../src/routes/Router.tsx';
import { Routes } from '../src/routes/Routes.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';

import { renderWithQueryClient } from './query-render.tsx';

function resetTo(internalPath: string): void {
  window.history.replaceState(null, '', internalPath);
  useViewStateStore.getState().syncFromUrl();
}

interface MatchMediaStub {
  restore: () => void;
}

function stubMatchMedia(isWide: boolean): MatchMediaStub {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => {
    // `ResponsiveSurface` queries `(min-width: 768px)`; other consumers
    // (e.g. `useReducedMotion`) get their default (no match).
    const matches = /min-width/.test(query) ? isWide : false;
    return {
      get matches(): boolean {
        return matches;
      },
      media: query,
      onchange: null,
      addEventListener: (): void => {},
      removeEventListener: (): void => {},
      addListener: (): void => {},
      removeListener: (): void => {},
      dispatchEvent: (): boolean => false,
    } as unknown as MediaQueryList;
  }) as typeof window.matchMedia;
  return {
    restore: () => {
      window.matchMedia = original;
    },
  };
}

function Tree(): React.ReactNode {
  return (
    <Router>
      <I18nProvider>
        <Routes />
      </I18nProvider>
    </Router>
  );
}

describe('TaskView — Step 8.1 surface container', () => {
  let teardown: (() => void) | undefined;
  let media: MatchMediaStub | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    resetTo('/');
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    media?.restore();
    media = undefined;
    __resetBackendsCacheForTesting();
    resetTo('/');
  });

  it('mounts a bottom sheet over view1 on narrow viewports', async () => {
    media = stubMatchMedia(false);
    resetTo('/?task=abc&from=matrix');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;

    const task = container.querySelector<HTMLElement>('[data-view="task"]');
    expect(task).not.toBeNull();
    expect(task!.dataset['taskId']).toBe('abc');
    expect(task!.textContent).toContain(strings['app.task.heading']);

    // Surface is the sheet (with scrim) on narrow viewports; the matrix
    // below is still in the DOM so it shows through the dimmed scrim.
    expect(container.querySelector('.emt-sheet')).not.toBeNull();
    expect(container.querySelector('[data-emt-scrim]')).not.toBeNull();
    expect(container.querySelector('.emt-side-panel')).toBeNull();
    expect(container.querySelector('[data-view="matrix"]')).not.toBeNull();
  });

  it('mounts a side panel over view2/Q3 on wide viewports', async () => {
    media = stubMatchMedia(true);
    resetTo('/q/Q3?task=xyz&from=quadrant');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;

    const task = container.querySelector<HTMLElement>('[data-view="task"]');
    expect(task).not.toBeNull();
    expect(task!.dataset['taskId']).toBe('xyz');

    // Surface is the side panel (no scrim) on wide viewports; the
    // focused quadrant stays fully visible to the left.
    const panel = container.querySelector<HTMLElement>('.emt-side-panel');
    expect(panel).not.toBeNull();
    expect(container.querySelector('.emt-sheet')).toBeNull();
    expect(container.querySelector('[data-emt-scrim]')).toBeNull();

    const quadrant = container.querySelector<HTMLElement>('[data-view="quadrant"]');
    expect(quadrant?.dataset['quadrant']).toBe('Q3');
  });

  it('renders nothing for view3 when no `?task=` is set', async () => {
    media = stubMatchMedia(false);
    resetTo('/');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;

    expect(container.querySelector('[data-view="task"]')).toBeNull();
    expect(container.querySelector('.emt-sheet')).toBeNull();
    expect(container.querySelector('.emt-side-panel')).toBeNull();
  });

  it('Escape closes the dialog and drops `?task=` from the URL', async () => {
    media = stubMatchMedia(false);
    resetTo('/q/Q2?task=abc&from=quadrant');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;

    expect(container.querySelector('[data-view="task"]')).not.toBeNull();

    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    const state = useViewStateStore.getState().state;
    expect(state.focusedTaskId).toBeUndefined();
    // The underlying zoom level is preserved — close returns the user
    // to the quadrant view they opened the task from. (8.9 will keep
    // the same invariant via `openedFromZoom` after the underlying
    // view can change while view3 is open.)
    expect(state.zoom).toBe('quadrant');
    expect(state.focusedQuadrant).toBe('Q2');
    expect(window.location.pathname).toBe('/q/Q2');
    expect(window.location.search).toBe('');

    expect(container.querySelector('[data-view="task"]')).toBeNull();
  });
});
