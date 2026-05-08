/**
 * Step 5.4 "Done when": each cell has its own vertical scroll viewport
 * and the matrix container itself does not scroll.
 *
 * happy-dom doesn't run a layout engine — there's no real reflow, no
 * scrollHeight grown by overflowing children. What it *does* compute
 * correctly is `getComputedStyle()` against rules attached via a real
 * `<style>` element. So this test reads the actual `matrix.css` from
 * disk, drops it into a `<style>` tag, renders a `MatrixCell` (with
 * the surrounding `.emt-matrix` container so its rule applies too),
 * and asserts the relevant CSS properties resolve correctly:
 *
 *   - `.emt-matrix` is `overflow: hidden` so the matrix never scrolls
 *     itself
 *   - `.emt-matrix__cell-list` is `overflow-y: auto` so cells do
 *   - the scrollbar is themed (Firefox `scrollbar-*` properties)
 *
 * Cross-engine WebKit pseudo-element rules (`::-webkit-scrollbar*`)
 * are asserted by reading them from the CSS file content directly —
 * happy-dom doesn't expose pseudo-element styles via getComputedStyle.
 */
import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { MatrixCell } from '../src/views/matrix/MatrixCell.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const MATRIX_CSS = readFileSync(resolve(__dirname, '../src/views/matrix/matrix.css'), 'utf8');

let injected: HTMLStyleElement | undefined;

function injectMatrixCss(): void {
  injected = document.createElement('style');
  injected.textContent = MATRIX_CSS;
  document.head.append(injected);
}

function removeMatrixCss(): void {
  injected?.remove();
  injected = undefined;
}

describe('Matrix scroll containment (Step 5.4)', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    injectMatrixCss();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    removeMatrixCss();
    __resetBackendsCacheForTesting();
  });

  it('each cell list scrolls independently while the matrix does not', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        {/* The cell expects an `.emt-matrix` ancestor so the container's
            overflow rule actually applies in the assertion below. */}
        <main className="emt-matrix">
          <div className="emt-matrix__grid">
            <MatrixCell quadrant="Q2" />
          </div>
        </main>
      </I18nProvider>,
    );
    teardown = unmount;

    const matrix = container.querySelector<HTMLElement>('.emt-matrix')!;
    const list = container.querySelector<HTMLElement>('.emt-matrix__cell-list')!;
    expect(matrix).not.toBeNull();
    expect(list).not.toBeNull();

    expect(getComputedStyle(matrix).overflow).toBe('hidden');
    expect(getComputedStyle(list).overflowY).toBe('auto');
  });

  it('themes the scrollbar via tokens, not hard-coded colors', () => {
    // happy-dom doesn't surface scrollbar-* properties or pseudo-element
    // styles through getComputedStyle, so we verify them at the source.
    // The dark-theme contract is: Firefox uses `scrollbar-width: thin`
    // + `scrollbar-color`; WebKit uses `::-webkit-scrollbar*` pseudo
    // rules; both reference theme tokens so re-skinning (Step 9.4) is a
    // token edit rather than a code change.
    expect(MATRIX_CSS).toMatch(/\.emt-matrix__cell-list\s*{[^}]*scrollbar-width:\s*thin/s);
    expect(MATRIX_CSS).toMatch(/\.emt-matrix__cell-list\s*{[^}]*scrollbar-color:\s*var\(--color-/s);
    expect(MATRIX_CSS).toContain('::-webkit-scrollbar {');
    expect(MATRIX_CSS).toContain('::-webkit-scrollbar-thumb');
    expect(MATRIX_CSS).toMatch(/::-webkit-scrollbar-thumb\s*{[^}]*background:\s*var\(--color-/);
  });
});
