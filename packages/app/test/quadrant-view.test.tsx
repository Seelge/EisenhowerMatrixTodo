/**
 * Step 6.1 "Done when": visual test for each focused quadrant; neighbor
 * strips are present on the correct edges per focused quadrant.
 *
 * For each Q1..Q4 we mount `<QuadrantView>` and assert:
 *   - the `<main>` carries the route data attributes used by the
 *     router tests (`data-view="quadrant"`, `data-quadrant`).
 *   - the inner frame is the design-system `Glow` in the matching
 *     per-quadrant color.
 *   - exactly the expected neighbor strips are rendered, on the
 *     expected edges, in the expected neighbor color. The non-shared
 *     edges (the two facing the matrix outside) carry no strip.
 *   - the heading reuses the verb label from the matrix cells, so the
 *     label space is consistent across views (zoom in/out shouldn't
 *     change what the quadrant is called).
 */
import 'fake-indexeddb/auto';
import type { Quadrant, TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { strings } from '../src/i18n/strings.en.ts';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { QuadrantView } from '../src/views/quadrant/QuadrantView.tsx';

import { renderWithQueryClient } from './query-render.tsx';

async function waitFor(check: () => boolean | Promise<boolean>, timeoutMs = 1500): Promise<void> {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

type Edge = 'top' | 'right' | 'bottom' | 'left';

interface QuadrantExpectation {
  quadrant: Quadrant;
  glow: 'q1' | 'q2' | 'q3' | 'q4';
  label: string;
  neighbors: ReadonlyArray<{ edge: Edge; quadrant: Quadrant; color: 'q1' | 'q2' | 'q3' | 'q4' }>;
  /** Edges that face the matrix outside — no strip. */
  outsideEdges: ReadonlyArray<Edge>;
}

// Geometry reference (top row important, right col urgent):
//   +----+----+
//   | Q2 | Q1 |
//   +----+----+
//   | Q4 | Q3 |
//   +----+----+
const QUADRANTS: readonly QuadrantExpectation[] = [
  {
    quadrant: 'Q1',
    glow: 'q1',
    label: strings['app.matrix.cell.q1.label'],
    neighbors: [
      { edge: 'left', quadrant: 'Q2', color: 'q2' },
      { edge: 'bottom', quadrant: 'Q3', color: 'q3' },
    ],
    outsideEdges: ['top', 'right'],
  },
  {
    quadrant: 'Q2',
    glow: 'q2',
    label: strings['app.matrix.cell.q2.label'],
    neighbors: [
      { edge: 'right', quadrant: 'Q1', color: 'q1' },
      { edge: 'bottom', quadrant: 'Q4', color: 'q4' },
    ],
    outsideEdges: ['top', 'left'],
  },
  {
    quadrant: 'Q3',
    glow: 'q3',
    label: strings['app.matrix.cell.q3.label'],
    neighbors: [
      { edge: 'top', quadrant: 'Q1', color: 'q1' },
      { edge: 'left', quadrant: 'Q4', color: 'q4' },
    ],
    outsideEdges: ['right', 'bottom'],
  },
  {
    quadrant: 'Q4',
    glow: 'q4',
    label: strings['app.matrix.cell.q4.label'],
    neighbors: [
      { edge: 'top', quadrant: 'Q2', color: 'q2' },
      { edge: 'right', quadrant: 'Q3', color: 'q3' },
    ],
    outsideEdges: ['bottom', 'left'],
  },
];

describe('QuadrantView — Step 6.1 layout & neighbor edges', () => {
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

  for (const expected of QUADRANTS) {
    it(`renders ${expected.quadrant} fullscreen with its glow border and the right neighbor strips`, async () => {
      const { container, unmount } = await renderWithQueryClient(
        <I18nProvider>
          <QuadrantView quadrant={expected.quadrant} />
        </I18nProvider>,
      );
      teardown = unmount;

      const main = container.querySelector<HTMLElement>('[data-view="quadrant"]');
      expect(main).not.toBeNull();
      expect(main!.dataset['quadrant']).toBe(expected.quadrant);
      expect(main!.getAttribute('aria-label')).toBe(expected.label);

      // Frame: design-system Glow with the focused quadrant's color.
      const frame = main!.querySelector<HTMLElement>('.emt-quadrant__frame');
      expect(frame, 'frame must exist').not.toBeNull();
      expect(frame!.dataset['emtGlow']).toBe(expected.glow);

      // Heading reuses the matrix cell's verb label.
      const heading = main!.querySelector('h1');
      expect(heading?.textContent).toBe(expected.label);

      // Neighbor strips: exactly the expected count, on the expected edges,
      // in the expected colors.
      const edges = Array.from(main!.querySelectorAll<HTMLElement>('.emt-quadrant__edge'));
      expect(edges.length).toBe(expected.neighbors.length);

      for (const n of expected.neighbors) {
        const strip = main!.querySelector<HTMLElement>(
          `.emt-quadrant__edge[data-edge="${n.edge}"]`,
        );
        expect(
          strip,
          `${expected.quadrant} should have a strip on its ${n.edge} edge`,
        ).not.toBeNull();
        expect(strip!.dataset['neighbor']).toBe(n.quadrant);
        expect(strip!.dataset['emtEdgeColor']).toBe(n.color);
        expect(strip!.getAttribute('aria-hidden')).toBe('true');
      }

      // The two outside-facing edges must NOT render a strip.
      for (const edge of expected.outsideEdges) {
        expect(
          main!.querySelector(`.emt-quadrant__edge[data-edge="${edge}"]`),
          `${expected.quadrant} must not render a strip on its ${edge} edge`,
        ).toBeNull();
      }
    });
  }
});

describe('QuadrantView — Step 6.6 empty state', () => {
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

  const DRAFT: TaskDraft = {
    title: 'visible',
    notes: '',
    priority: 'normal',
    quadrant: 'Q1',
    status: 'open',
    tags: [],
  };

  it('renders the muted-grey empty note when the focused quadrant has no tasks', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q3" />
      </I18nProvider>,
    );
    teardown = unmount;

    // Wait for the loading skeletons to clear — the `data-task-count`
    // attribute is `0` even while pending (because `tasks?.length ?? 0`
    // collapses undefined to 0), so the skeleton sentinel is the
    // accurate signal that the query has resolved to an empty list.
    await waitFor(() => container.querySelector('.emt-quadrant__skeleton') === null);

    const note = container.querySelector<HTMLElement>('.emt-empty-note');
    expect(note, 'empty note should be in the DOM when the list is empty').not.toBeNull();
    expect(note!.textContent).toBe(strings['app.quadrant.empty']);

    // Neighbor strips for Q3 (top → Q1, left → Q4) are still present —
    // the empty state does not strip the frame chrome.
    const stripTop = container.querySelector<HTMLElement>('.emt-quadrant__edge[data-edge="top"]');
    const stripLeft = container.querySelector<HTMLElement>('.emt-quadrant__edge[data-edge="left"]');
    expect(stripTop?.dataset['neighbor']).toBe('Q1');
    expect(stripLeft?.dataset['neighbor']).toBe('Q4');

    // The FAB stays rendered — empty quadrants are still where the user
    // creates the first task.
    expect(container.querySelector('.emt-quadrant__fab')).not.toBeNull();

    // No task cards are rendered alongside the note.
    expect(container.querySelector('.emt-task-card')).toBeNull();
  });

  it('does not render the empty note once the focused quadrant has tasks', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'one', quadrant: 'Q3' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q3" />
      </I18nProvider>,
    );
    teardown = unmount;

    // Wait for the card to land — the empty branch must not have fired.
    await waitFor(() => container.querySelector('.emt-task-card') !== null);

    expect(container.querySelector('.emt-empty-note')).toBeNull();
  });
});

describe('QuadrantView — Step 12.11 Settings entry', () => {
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

  it('renders a top-right Settings button that navigates to /options', async () => {
    const startPath = window.location.pathname;
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;

    const button = container.querySelector<HTMLButtonElement>(
      '[data-action="open-options"]',
    );
    expect(button).not.toBeNull();
    expect(button!.getAttribute('aria-label')).toBe(strings['app.options.open']);
    expect(button!.classList.contains('emt-quadrant__settings')).toBe(true);

    button!.click();
    expect(window.location.pathname).toBe('/options');
    window.history.replaceState(null, '', startPath);
  });
});
