/**
 * Step 6.3 "Done when":
 *   - Swipe left/right/up/down navigates to the geometrically-adjacent
 *     quadrant (left/right swap urgency axis, up/down swap importance).
 *   - Swipe is rate-limited and respects `prefers-reduced-motion`
 *     (instant snap).
 *
 * Step 6.4 "Done when":
 *   - Click-and-drag from the background (not on a card) translates
 *     focus the same way as a swipe. Reuses the same handler — React's
 *     `onPointer*` props fire for mouse / touch / pen alike, so the
 *     regression coverage here is "with `pointerType: 'mouse'` the
 *     existing thresholds still flip the route, and the same exclusion
 *     selector still skips drags that start on a card."
 *
 * Two layers of coverage:
 *
 *   1. Pure unit tests on `swipe.ts` — direction classification under
 *      distance / dominance / duration thresholds, and the per-quadrant
 *      neighbor resolution table. Cheap and exhaustive; no DOM.
 *
 *   2. Integration tests on `<QuadrantView>` — dispatch real
 *      `pointerdown` / `pointerup` events at the matrix root and assert
 *      the URL flips to `/q/<neighbor>` via `useViewStateStore`. The
 *      existing matrix-dnd / quadrant-dnd tests already cover that
 *      dnd-kit doesn't intercept these events; here we additionally
 *      assert that gestures starting on a `.emt-task-card` or inside
 *      the scroll list don't navigate (so dnd and scroll keep working).
 *      The Step 6.4 cases below run the same scenarios with
 *      `pointerType: 'mouse'` to lock in the pointer-type-agnostic
 *      contract.
 *
 * The "instant snap" requirement of the reduced-motion guard is met by
 * construction in this step: there's no animation here — the route
 * change is the entire visual transition. Phase 7 will gate the zoom
 * morph on `useReducedMotion` separately.
 */
import 'fake-indexeddb/auto';
import type { TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import { QuadrantView } from '../src/views/quadrant/QuadrantView.tsx';
import {
  DEFAULT_SWIPE_OPTIONS,
  resolveSwipeDirection,
  resolveSwipeTarget,
  SWIPE_NEIGHBORS,
} from '../src/views/quadrant/swipe.ts';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'card',
  notes: '',
  priority: 'normal',
  quadrant: 'Q1',
  status: 'open',
  tags: [],
};

function resetTo(internalPath: string): void {
  window.history.replaceState(null, '', internalPath);
  useViewStateStore.getState().syncFromUrl();
}

interface PointerEventInit {
  clientX: number;
  clientY: number;
  pointerId?: number;
  isPrimary?: boolean;
  pointerType?: 'touch' | 'mouse' | 'pen';
}

function dispatchPointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointerup' | 'pointercancel',
  init: PointerEventInit,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId: init.pointerId ?? 1,
    isPrimary: init.isPrimary ?? true,
    clientX: init.clientX,
    clientY: init.clientY,
    pointerType: init.pointerType ?? 'touch',
  });
  target.dispatchEvent(event);
}

async function waitFor(check: () => boolean, timeoutMs = 1500): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('swipe.ts — pure resolution', () => {
  it('classifies clean horizontal swipes', () => {
    expect(resolveSwipeDirection(80, 0, 100)).toBe('right');
    expect(resolveSwipeDirection(-80, 5, 100)).toBe('left');
  });

  it('classifies clean vertical swipes', () => {
    expect(resolveSwipeDirection(5, 80, 100)).toBe('down');
    expect(resolveSwipeDirection(0, -80, 100)).toBe('up');
  });

  it('rejects gestures that fall short of the distance threshold', () => {
    expect(resolveSwipeDirection(20, 0, 100)).toBeUndefined();
    expect(resolveSwipeDirection(0, 30, 100)).toBeUndefined();
  });

  it('rejects diagonal gestures that fail the dominance ratio', () => {
    // 80 horizontal, 70 vertical — distance is fine but dominance < 1.5.
    expect(resolveSwipeDirection(80, 70, 100)).toBeUndefined();
  });

  it('rejects gestures slower than the max duration (likely scroll/drag)', () => {
    expect(resolveSwipeDirection(80, 0, DEFAULT_SWIPE_OPTIONS.maxDuration + 1)).toBeUndefined();
  });

  it('resolves geometric neighbors via SWIPE_NEIGHBORS', () => {
    // Spot-check the canonical layout:
    //   +----+----+
    //   | Q2 | Q1 |
    //   +----+----+
    //   | Q4 | Q3 |
    //   +----+----+
    expect(resolveSwipeTarget('Q1', 'left')).toBe('Q2');
    expect(resolveSwipeTarget('Q1', 'down')).toBe('Q3');
    expect(resolveSwipeTarget('Q2', 'right')).toBe('Q1');
    expect(resolveSwipeTarget('Q2', 'down')).toBe('Q4');
    expect(resolveSwipeTarget('Q3', 'up')).toBe('Q1');
    expect(resolveSwipeTarget('Q3', 'left')).toBe('Q4');
    expect(resolveSwipeTarget('Q4', 'up')).toBe('Q2');
    expect(resolveSwipeTarget('Q4', 'right')).toBe('Q3');
  });

  it('returns undefined for swipes that point off the matrix edge', () => {
    expect(resolveSwipeTarget('Q1', 'right')).toBeUndefined();
    expect(resolveSwipeTarget('Q1', 'up')).toBeUndefined();
    expect(resolveSwipeTarget('Q4', 'left')).toBeUndefined();
    expect(resolveSwipeTarget('Q4', 'down')).toBeUndefined();
  });

  it('SWIPE_NEIGHBORS has exactly two entries per quadrant', () => {
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4'] as const) {
      const directions = Object.keys(SWIPE_NEIGHBORS[q]);
      expect(directions.length).toBe(2);
    }
  });
});

describe('QuadrantView — Step 6.3 swipe integration', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    resetTo('/q/Q1');
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    resetTo('/');
  });

  it('navigates to the left neighbor on a left swipe (Q1 → Q2)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;

    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;
    // Swipe left: pointer ends 80 px to the left of where it started.
    dispatchPointer(main, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 120, clientY: 200 });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q2');
    expect(window.location.pathname).toBe('/q/Q2');
  });

  it('navigates down on a down swipe (Q1 → Q3)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;

    dispatchPointer(main, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 200, clientY: 280 });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q3');
  });

  it('does nothing when the swipe direction has no neighbor', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;

    // Q1 → up is off the matrix edge; Q1 → right ditto.
    dispatchPointer(main, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 200, clientY: 120 });
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q1');

    dispatchPointer(main, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 280, clientY: 200 });
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q1');
  });

  it('ignores gestures that start on a task card (dnd owns those)', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'live', quadrant: 'Q1' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(() => container.querySelector('.emt-task-card') !== null);
    const card = container.querySelector<HTMLElement>('.emt-task-card')!;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;

    // Pointerdown on the card; pointerup somewhere else with a left
    // delta. The handler must skip because the gesture started on a
    // draggable.
    dispatchPointer(card, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 120, clientY: 200 });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q1');
  });

  it('allows swipe from a non-scrollable list (TODO 7 — empty/short lists)', async () => {
    // With no overflow the list is free real-estate for swipe nav; the
    // previous blanket exclusion left only the 24 px frame padding as a
    // swipe start target on phones.
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;
    const list = container.querySelector<HTMLElement>('.emt-quadrant__list')!;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;

    // happy-dom reports scrollHeight === clientHeight for empty lists.
    expect(list.scrollHeight).toBeLessThanOrEqual(list.clientHeight + 1);

    dispatchPointer(list, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 200, clientY: 280 });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q3');
  });

  it('ignores gestures that start inside a scrollable list (preserves scrolling)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;
    const list = container.querySelector<HTMLElement>('.emt-quadrant__list')!;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;

    // Force overflow so the list exclusion kicks in.
    Object.defineProperty(list, 'scrollHeight', { configurable: true, get: () => 800 });
    Object.defineProperty(list, 'clientHeight', { configurable: true, get: () => 200 });

    dispatchPointer(list, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 200, clientY: 280 });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q1');
  });

  // Step 6.4 — mouse drag-at-edge to change focus.
  //
  // The handler in QuadrantView is pointer-type-agnostic (React's
  // `onPointer*` fires for touch, mouse, and pen alike), so the
  // production code path is the exact same one exercised above. These
  // regression cases assert that under `pointerType: 'mouse'`:
  //   - a click-and-drag on the background flips focus the same way
  //     as a swipe;
  //   - the same `.emt-task-card` exclusion still applies, so a mouse
  //     drag that originates on a card stays with dnd-kit.
  it('Step 6.4 — mouse drag on the background changes focus (Q1 → Q2)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;

    dispatchPointer(main, 'pointerdown', { clientX: 200, clientY: 200, pointerType: 'mouse' });
    dispatchPointer(main, 'pointerup', { clientX: 120, clientY: 200, pointerType: 'mouse' });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q2');
    expect(window.location.pathname).toBe('/q/Q2');
  });

  it('Step 6.4 — mouse drag starting on a task card is ignored', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'live', quadrant: 'Q1' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(() => container.querySelector('.emt-task-card') !== null);
    const card = container.querySelector<HTMLElement>('.emt-task-card')!;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;

    dispatchPointer(card, 'pointerdown', { clientX: 200, clientY: 200, pointerType: 'mouse' });
    dispatchPointer(main, 'pointerup', { clientX: 120, clientY: 200, pointerType: 'mouse' });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q1');
  });

  it('does not double-fire on an immediately repeated swipe (cooldown)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;

    // First swipe: Q1 → Q2.
    dispatchPointer(main, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 120, clientY: 200 });
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q2');

    // The second swipe arrives within the cooldown — must be ignored.
    // QuadrantView is still mounted with quadrant="Q1" in this test
    // (the prop didn't change because the parent doesn't re-render
    // here), so a successful swipe down would resolve Q1 → Q3 again.
    // The cooldown prevents that second navigation.
    dispatchPointer(main, 'pointerdown', { clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerup', { clientX: 200, clientY: 280 });
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q2');
  });
});
