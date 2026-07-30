/**
 * Step 5.1 "Done when": empty matrix renders all four cells with the
 * correct labels and palette.
 *
 * Asserts the structural snapshot — what cells exist, their grid
 * placement, their verb labels, and the per-quadrant glow color
 * (the palette mapping). Layout pixel-tightness is not checked here;
 * Playwright covers that separately.
 */
import 'fake-indexeddb/auto';
import type { Quadrant } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { strings } from '../src/i18n/strings.en.ts';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { MatrixView } from '../src/views/matrix/MatrixView.tsx';

import { renderWithQueryClient } from './query-render.tsx';

interface CellExpectation {
  quadrant: Quadrant;
  glow: 'q1' | 'q2' | 'q3' | 'q4';
  label: string;
  gridArea: 'q1' | 'q2' | 'q3' | 'q4';
}

const CELLS: readonly CellExpectation[] = [
  { quadrant: 'Q1', glow: 'q1', label: strings['app.matrix.cell.q1.label'], gridArea: 'q1' },
  { quadrant: 'Q2', glow: 'q2', label: strings['app.matrix.cell.q2.label'], gridArea: 'q2' },
  { quadrant: 'Q3', glow: 'q3', label: strings['app.matrix.cell.q3.label'], gridArea: 'q3' },
  { quadrant: 'Q4', glow: 'q4', label: strings['app.matrix.cell.q4.label'], gridArea: 'q4' },
];

describe('MatrixView', () => {
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

  it('renders the matrix shell with all four cells, labels, and palette', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
      </I18nProvider>,
    );
    teardown = unmount;

    const matrix = container.querySelector<HTMLElement>('[data-view="matrix"]');
    expect(matrix).not.toBeNull();
    expect(matrix!.getAttribute('aria-label')).toBe(strings['app.matrix.heading']);

    const cells = matrix!.querySelectorAll<HTMLElement>('[data-quadrant]');
    expect(cells.length).toBe(4);

    for (const expected of CELLS) {
      const cell = matrix!.querySelector<HTMLElement>(`[data-quadrant="${expected.quadrant}"]`);
      expect(cell, `cell ${expected.quadrant} should exist`).not.toBeNull();

      // Palette: glow color matches the canonical per-quadrant token.
      expect(cell!.dataset['emtGlow']).toBe(expected.glow);
      expect(cell!.style.borderWidth).toBe('1px');
      expect(cell!.style.borderStyle).toBe('solid');
      expect(cell!.style.borderColor).toBe(`var(--glow-${expected.glow})`);

      // Label: cell carries the verb both as an aria-label and an h2.
      expect(cell!.getAttribute('aria-label')).toBe(expected.label);
      const heading = cell!.querySelector('h2');
      expect(heading?.textContent).toBe(expected.label);

      // Region semantics so each cell is independently navigable.
      expect(cell!.getAttribute('role')).toBe('region');
    }
  });

  it('places cells in the canonical Eisenhower spatial layout', async () => {
    // Document order in the grid container is Q2, Q1, Q4, Q3 — that
    // matches the CSS grid-template-areas ('q2 q1' / 'q4 q3') which
    // puts importance ↑ on the top row and urgency → on the right
    // column, so Q1 (Do, top-right) and Q4 (Delete, bottom-left) end
    // up where users expect them.
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
      </I18nProvider>,
    );
    teardown = unmount;

    const grid = container.querySelector<HTMLElement>('.emt-matrix__grid');
    expect(grid).not.toBeNull();

    const order = Array.from(grid!.querySelectorAll<HTMLElement>('[data-quadrant]')).map(
      (el) => el.dataset['quadrant'],
    );
    expect(order).toEqual(['Q2', 'Q1', 'Q4', 'Q3']);
  });

  it('renders no axis-label strips (Step 12.6)', async () => {
    // Step 12.6 removed the faint "Important ↑" / "Urgent →" strips —
    // the verb-labelled cells already imply the axes, and the strips
    // ate space the cells need on narrow viewports.
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
      </I18nProvider>,
    );
    teardown = unmount;

    expect(container.querySelector('.emt-matrix__axis')).toBeNull();
    expect(container.querySelector('.emt-matrix__axis--important')).toBeNull();
    expect(container.querySelector('.emt-matrix__axis--urgent')).toBeNull();
  });

  it('exposes a top-right Settings button that navigates to /options (Step 12.11)', async () => {
    // Step 12.11 added a gear-icon entry into view4 (Options) on the
    // matrix shell. Asserts the structural contract: the button exists
    // with the canonical `[data-action="open-options"]` hook, carries
    // the localized aria-label, and clicking it pushes `/options` onto
    // the history stack so browser back returns to the matrix.
    const startPath = window.location.pathname;
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
      </I18nProvider>,
    );
    teardown = unmount;

    const button = container.querySelector<HTMLButtonElement>('[data-action="open-options"]');
    expect(button).not.toBeNull();
    expect(button!.getAttribute('aria-label')).toBe(strings['app.options.open']);
    // The positioning class hooks the shell-level top-right anchor.
    expect(button!.classList.contains('emt-matrix__settings')).toBe(true);

    button!.click();
    expect(window.location.pathname).toBe('/options');
    // Restore the URL so sibling tests don't inherit it.
    window.history.replaceState(null, '', startPath);
  });
});
