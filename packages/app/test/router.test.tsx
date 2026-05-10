/**
 * Integration tests for `Router` + `Routes`: deep-link rendering,
 * `popstate` re-sync, and `navigate()`-driven re-render.
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

function Tree(): React.ReactNode {
  return (
    <Router>
      <I18nProvider>
        <Routes />
      </I18nProvider>
    </Router>
  );
}

describe('Router + Routes', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    resetTo('/');
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    resetTo('/');
  });

  it('renders the matrix placeholder at /', async () => {
    resetTo('/');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;
    expect(findZoomScene(container, 'matrix')).not.toBeUndefined();
    expect(container.querySelector('[data-view="matrix"]')).not.toBeNull();
    expect(container.querySelector('[data-view="quadrant"]')).toBeNull();
    expect(container.querySelector('[data-view="task"]')).toBeNull();
  });

  it('renders the quadrant placeholder at /q/Q2', async () => {
    resetTo('/q/Q2');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;
    const quadrant = container.querySelector<HTMLElement>('[data-view="quadrant"]');
    const scene = findZoomScene(container, 'quadrant');
    expect(scene).not.toBeUndefined();
    expect(scene?.dataset['focusedQuadrant']).toBe('Q2');
    expect(quadrant).not.toBeNull();
    expect(quadrant!.dataset['quadrant']).toBe('Q2');
    expect(container.querySelector('[data-view="matrix"]')).toBeNull();
  });

  it('deep-links /q/Q2?task=abc into view3 over the quadrant view', async () => {
    resetTo('/q/Q2?task=abc&from=quadrant');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;
    const quadrant = container.querySelector<HTMLElement>('[data-view="quadrant"]');
    const task = container.querySelector<HTMLElement>('[data-view="task"]');
    expect(quadrant?.dataset['quadrant']).toBe('Q2');
    expect(task?.dataset['taskId']).toBe('abc');
    expect(task?.textContent).toContain(strings['app.task.heading']);
  });

  it('navigate() updates the rendered view without a full reload', async () => {
    resetTo('/');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;
    expect(container.querySelector('[data-view="matrix"]')).not.toBeNull();

    await act(async () => {
      useViewStateStore.getState().navigate({ zoom: 'quadrant', focusedQuadrant: 'Q4' });
    });

    const quadrant = container.querySelector<HTMLElement>('[data-view="quadrant"]');
    const scene = findZoomScene(container, 'quadrant');
    expect(scene).not.toBeUndefined();
    expect(scene?.dataset['focusedQuadrant']).toBe('Q4');
    expect(quadrant?.dataset['quadrant']).toBe('Q4');
    expect(window.location.pathname).toBe('/q/Q4');
  });

  it('popstate re-syncs the store after a manual URL change', async () => {
    resetTo('/');
    const { container, unmount } = await renderWithQueryClient(<Tree />);
    teardown = unmount;

    await act(async () => {
      window.history.replaceState(null, '', '/q/Q1');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const quadrant = container.querySelector<HTMLElement>('[data-view="quadrant"]');
    expect(quadrant?.dataset['quadrant']).toBe('Q1');
  });
});

function findZoomScene(
  container: HTMLElement,
  zoom: 'matrix' | 'quadrant',
): HTMLElement | undefined {
  return Array.from(container.querySelectorAll<HTMLElement>('.emt-zoom__scene')).find(
    (scene) => scene.dataset['zoom'] === zoom,
  );
}
