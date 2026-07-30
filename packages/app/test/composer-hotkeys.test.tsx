/**
 * Phase 17 — `n` opens QuickComposer when not typing.
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useViewStateStore } from '../src/state/view-state.ts';
import { useComposerStore } from '../src/views/matrix/composer-store.ts';
import { ComposerHotkeys } from '../src/views/matrix/ComposerHotkeys.tsx';
import { useSearchStore } from '../src/views/search/search-store.ts';

import { renderWithQueryClient } from './query-render.tsx';

function reset(): void {
  window.history.replaceState(null, '', '/');
  useViewStateStore.getState().syncFromUrl();
  useComposerStore.setState({ open: false });
  useSearchStore.getState().closeSearch();
}

describe('ComposerHotkeys — Phase 17', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    reset();
  });
  afterEach(() => {
    teardown?.();
    teardown = undefined;
    reset();
  });

  it('opens the composer on n', async () => {
    const { unmount } = await renderWithQueryClient(<ComposerHotkeys />);
    teardown = unmount;
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    });
    expect(useComposerStore.getState().open).toBe(true);
  });

  it('ignores n while typing in an input', async () => {
    const { unmount } = await renderWithQueryClient(
      <>
        <ComposerHotkeys />
        <input data-testid="title" />
      </>,
    );
    teardown = unmount;
    const input = document.querySelector('input')!;
    input.focus();
    await act(async () => {
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    });
    expect(useComposerStore.getState().open).toBe(false);
  });

  it('ignores n while search is open', async () => {
    const { unmount } = await renderWithQueryClient(<ComposerHotkeys />);
    teardown = unmount;
    useSearchStore.getState().openSearch();
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    });
    expect(useComposerStore.getState().open).toBe(false);
  });

  it('ignores n while a task sheet is focused', async () => {
    window.history.replaceState(null, '', '/?task=abc&from=matrix');
    useViewStateStore.getState().syncFromUrl();
    const { unmount } = await renderWithQueryClient(<ComposerHotkeys />);
    teardown = unmount;
    await act(async () => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    });
    expect(useComposerStore.getState().open).toBe(false);
  });
});
