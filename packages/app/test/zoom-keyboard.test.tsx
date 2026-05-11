/**
 * Step 7.4 "Done when":
 *   - Keyboard-only flow: navigate to Q2 → Enter → land in view2/Q2;
 *     Esc returns to view1. (Playwright e2e covers the full URL flow;
 *     this file's integration suite mirrors it under happy-dom.)
 *
 * Two layers of coverage:
 *
 *   1. Pure unit tests on `keyboard.ts` — `resolveArrowQuadrant` for
 *      every cell × every arrow direction; the input-target guard.
 *
 *   2. Integration tests that mount `<Routes>` and dispatch synthetic
 *      `keydown` events on the document. Asserts focus moves between
 *      cells, Enter zooms in, Esc zooms out, and `+` / `-` toggle.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { Routes } from '../src/routes/Routes.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import {
  isTextEditingTarget,
  isZoomInKey,
  isZoomOutKey,
  resolveArrowQuadrant,
} from '../src/views/zoom/keyboard.ts';

import { renderWithQueryClient } from './query-render.tsx';

interface KeyInit {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
}

function dispatchKey(target: EventTarget, init: KeyInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    key: init.key,
    bubbles: true,
    cancelable: true,
    ctrlKey: init.ctrlKey ?? false,
    metaKey: init.metaKey ?? false,
    altKey: init.altKey ?? false,
  });
  target.dispatchEvent(event);
  return event;
}

function resetTo(internalPath: string): void {
  window.history.replaceState(null, '', internalPath);
  useViewStateStore.getState().syncFromUrl();
}

describe('keyboard.ts — pure resolution', () => {
  it('maps the 2 × 2 visual grid: orthogonal neighbors only, no wrap', () => {
    expect(resolveArrowQuadrant('Q2', 'ArrowRight')).toBe('Q1');
    expect(resolveArrowQuadrant('Q2', 'ArrowDown')).toBe('Q4');
    expect(resolveArrowQuadrant('Q2', 'ArrowLeft')).toBeUndefined();
    expect(resolveArrowQuadrant('Q2', 'ArrowUp')).toBeUndefined();

    expect(resolveArrowQuadrant('Q1', 'ArrowLeft')).toBe('Q2');
    expect(resolveArrowQuadrant('Q1', 'ArrowDown')).toBe('Q3');
    expect(resolveArrowQuadrant('Q1', 'ArrowRight')).toBeUndefined();
    expect(resolveArrowQuadrant('Q1', 'ArrowUp')).toBeUndefined();

    expect(resolveArrowQuadrant('Q4', 'ArrowRight')).toBe('Q3');
    expect(resolveArrowQuadrant('Q4', 'ArrowUp')).toBe('Q2');
    expect(resolveArrowQuadrant('Q4', 'ArrowLeft')).toBeUndefined();
    expect(resolveArrowQuadrant('Q4', 'ArrowDown')).toBeUndefined();

    expect(resolveArrowQuadrant('Q3', 'ArrowLeft')).toBe('Q4');
    expect(resolveArrowQuadrant('Q3', 'ArrowUp')).toBe('Q1');
    expect(resolveArrowQuadrant('Q3', 'ArrowRight')).toBeUndefined();
    expect(resolveArrowQuadrant('Q3', 'ArrowDown')).toBeUndefined();
  });

  it('recognises both shifted and unshifted zoom keys', () => {
    expect(isZoomInKey('+')).toBe(true);
    expect(isZoomInKey('=')).toBe(true);
    expect(isZoomOutKey('-')).toBe(true);
    expect(isZoomOutKey('_')).toBe(true);
    expect(isZoomInKey('a')).toBe(false);
    expect(isZoomOutKey('a')).toBe(false);
  });

  it('treats text-editing targets as opt-out', () => {
    const input = document.createElement('input');
    const textarea = document.createElement('textarea');
    const div = document.createElement('div');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    const button = document.createElement('button');

    expect(isTextEditingTarget(input)).toBe(true);
    expect(isTextEditingTarget(textarea)).toBe(true);
    expect(isTextEditingTarget(editable)).toBe(true);
    expect(isTextEditingTarget(div)).toBe(false);
    expect(isTextEditingTarget(button)).toBe(false);
    expect(isTextEditingTarget(null)).toBe(false);
  });
});

describe('ZoomController — Step 7.4 keyboard integration', () => {
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

  function cell(container: HTMLElement, quadrant: 'Q1' | 'Q2' | 'Q3' | 'Q4'): HTMLElement {
    const node = container.querySelector<HTMLElement>(
      `.emt-matrix__cell[data-quadrant="${quadrant}"]`,
    );
    if (!node) throw new Error(`cell ${quadrant} not found`);
    return node;
  }

  it('matrix cells are keyboard-focusable', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const q2 = cell(container, 'Q2');
    expect(q2.tabIndex).toBe(0);
  });

  it('Enter on a focused cell zooms into that quadrant', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const q2 = cell(container, 'Q2');
    await act(async () => {
      q2.focus();
    });
    const event = dispatchKey(q2, { key: 'Enter' });
    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.zoom).toBe('quadrant');
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q2');
    expect(window.location.pathname).toBe('/q/Q2');
  });

  it('Escape on view2 returns to view1', async () => {
    resetTo('/q/Q2');
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const event = dispatchKey(document.body, { key: 'Escape' });
    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
    expect(useViewStateStore.getState().state.focusedQuadrant).toBeUndefined();
    expect(window.location.pathname).toBe('/');
  });

  it('Escape on view1 (already at matrix) is a no-op', async () => {
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const event = dispatchKey(document.body, { key: 'Escape' });
    expect(event.defaultPrevented).toBe(false);
    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
  });

  it('arrow keys move focus between cells in the visual layout', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const q2 = cell(container, 'Q2');
    const q1 = cell(container, 'Q1');
    const q3 = cell(container, 'Q3');

    await act(async () => {
      q2.focus();
    });
    // Q2 → Right → Q1
    let event = dispatchKey(q2, { key: 'ArrowRight' });
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(q1);

    // Q1 → Down → Q3
    event = dispatchKey(q1, { key: 'ArrowDown' });
    expect(event.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(q3);

    // Q3 → Right → no-op (right edge of grid)
    const before = document.activeElement;
    event = dispatchKey(q3, { key: 'ArrowRight' });
    expect(event.defaultPrevented).toBe(false);
    expect(document.activeElement).toBe(before);
  });

  it('+ on view1 zooms into the focused cell (or Q1 by default)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const q4 = cell(container, 'Q4');
    await act(async () => {
      q4.focus();
    });
    const event = dispatchKey(q4, { key: '+' });
    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.zoom).toBe('quadrant');
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q4');
  });

  it('+ on view1 with no focused cell defaults to Q1', async () => {
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const event = dispatchKey(document.body, { key: '+' });
    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q1');
  });

  it('- on view2 returns to view1', async () => {
    resetTo('/q/Q3');
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const event = dispatchKey(document.body, { key: '-' });
    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
  });

  it('does not intercept keys when focus is in a text input', async () => {
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const input = document.createElement('input');
    document.body.append(input);
    try {
      input.focus();
      const event = dispatchKey(input, { key: '+' });
      expect(event.defaultPrevented).toBe(false);
      expect(useViewStateStore.getState().state.zoom).toBe('matrix');
    } finally {
      input.remove();
    }
  });

  it('ignores Ctrl-modified keys (reserved for wheel binding / OS shortcuts)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const q2 = cell(container, 'Q2');
    await act(async () => {
      q2.focus();
    });
    const event = dispatchKey(q2, { key: 'Enter', ctrlKey: true });
    expect(event.defaultPrevented).toBe(false);
    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
  });
});
