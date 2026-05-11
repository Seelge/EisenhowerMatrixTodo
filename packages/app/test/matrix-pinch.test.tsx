/**
 * Step 7.2 "Done when":
 *   - Pinch-in (synthetic pointer events) on view1 navigates into the
 *     quadrant under the gesture-start midpoint, for each of the four
 *     midpoints.
 *   - Pinch-out on view2 navigates back to the matrix and lights a
 *     600 ms highlight on the previously-focused quadrant; the
 *     highlight then decays.
 *
 * Two layers of coverage:
 *
 *   1. Pure unit tests on `pinch.ts` — direction classification under
 *      the ratio thresholds and the four-way midpoint→quadrant
 *      mapping. Cheap and exhaustive; no DOM.
 *
 *   2. Integration tests that mount `<MatrixView>` / `<QuadrantView>`
 *      and dispatch real `pointerdown` / `pointerup` events at the
 *      matrix root. Happy-dom doesn't compute layout, so the host
 *      element's `getBoundingClientRect` is stubbed to a known 400×400
 *      box rooted at (0, 0) — that lets the midpoint→quadrant lookup
 *      resolve deterministically without depending on real layout.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import { MatrixView } from '../src/views/matrix/MatrixView.tsx';
import { QuadrantView } from '../src/views/quadrant/QuadrantView.tsx';
import { PINCH_HIGHLIGHT_MS, usePinchHighlightStore } from '../src/views/zoom/highlight.ts';
import {
  DEFAULT_PINCH_OPTIONS,
  distance,
  midpoint,
  quadrantAtPoint,
  resolvePinchDirection,
} from '../src/views/zoom/pinch.ts';

import { renderWithQueryClient } from './query-render.tsx';

interface PointerEventInit {
  clientX: number;
  clientY: number;
  pointerId: number;
  isPrimary?: boolean;
  pointerType?: 'touch' | 'mouse' | 'pen';
}

function dispatchPointer(
  target: EventTarget,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  init: PointerEventInit,
): void {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, {
    pointerId: init.pointerId,
    isPrimary: init.isPrimary ?? init.pointerId === 1,
    clientX: init.clientX,
    clientY: init.clientY,
    pointerType: init.pointerType ?? 'touch',
  });
  target.dispatchEvent(event);
}

function stubRect(
  element: HTMLElement,
  rect: { x: number; y: number; w: number; h: number },
): void {
  const value = (): DOMRect =>
    ({
      x: rect.x,
      y: rect.y,
      left: rect.x,
      top: rect.y,
      right: rect.x + rect.w,
      bottom: rect.y + rect.h,
      width: rect.w,
      height: rect.h,
      toJSON() {
        return this;
      },
    }) as DOMRect;
  Object.defineProperty(element, 'getBoundingClientRect', { value, configurable: true });
}

function resetTo(internalPath: string): void {
  window.history.replaceState(null, '', internalPath);
  useViewStateStore.getState().syncFromUrl();
}

/**
 * Drive a complete two-finger pinch at the host: both fingers down at
 * `(start1, start2)`, both fingers up at `(end1, end2)`. Mirrors the
 * shape of a real touch pinch — second finger goes down after the
 * first, both lift roughly together with the second finger lifting
 * first (so the snapshot is finalized while one pointer remains).
 */
function pinchAt(
  host: HTMLElement,
  start1: { x: number; y: number },
  start2: { x: number; y: number },
  end1: { x: number; y: number },
  end2: { x: number; y: number },
): void {
  dispatchPointer(host, 'pointerdown', { pointerId: 1, clientX: start1.x, clientY: start1.y });
  dispatchPointer(host, 'pointerdown', { pointerId: 2, clientX: start2.x, clientY: start2.y });
  dispatchPointer(host, 'pointermove', { pointerId: 1, clientX: end1.x, clientY: end1.y });
  dispatchPointer(host, 'pointermove', { pointerId: 2, clientX: end2.x, clientY: end2.y });
  dispatchPointer(host, 'pointerup', { pointerId: 2, clientX: end2.x, clientY: end2.y });
  dispatchPointer(host, 'pointerup', { pointerId: 1, clientX: end1.x, clientY: end1.y });
}

describe('pinch.ts — pure resolution', () => {
  it('classifies pinch-in once the ratio crosses the threshold', () => {
    expect(resolvePinchDirection(100, 130)).toBe('in');
    expect(resolvePinchDirection(100, 200)).toBe('in');
  });

  it('classifies pinch-out once the ratio crosses the threshold', () => {
    expect(resolvePinchDirection(200, 100)).toBe('out');
    expect(resolvePinchDirection(100, 60)).toBe('out');
  });

  it('returns undefined inside the deadzone', () => {
    expect(resolvePinchDirection(100, 110)).toBeUndefined();
    expect(resolvePinchDirection(100, 90)).toBeUndefined();
  });

  it('rejects gestures whose initial separation is too small to trust', () => {
    expect(
      resolvePinchDirection(DEFAULT_PINCH_OPTIONS.minInitialDistance - 1, 1000),
    ).toBeUndefined();
  });

  it('distance/midpoint helpers use Euclidean math and arithmetic mean', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    expect(midpoint({ x: 0, y: 0 }, { x: 100, y: 200 })).toEqual({ x: 50, y: 100 });
  });

  it('maps each midpoint to the canonical quadrant layout', () => {
    const rect = { left: 0, top: 0, width: 400, height: 400 };
    expect(quadrantAtPoint({ x: 100, y: 100 }, rect)).toBe('Q2');
    expect(quadrantAtPoint({ x: 300, y: 100 }, rect)).toBe('Q1');
    expect(quadrantAtPoint({ x: 100, y: 300 }, rect)).toBe('Q4');
    expect(quadrantAtPoint({ x: 300, y: 300 }, rect)).toBe('Q3');
  });

  it('resolves the rect-center tie to Q3 (deterministic, arbitrary)', () => {
    const rect = { left: 0, top: 0, width: 400, height: 400 };
    expect(quadrantAtPoint({ x: 200, y: 200 }, rect)).toBe('Q3');
  });
});

describe('MatrixView — Step 7.2 pinch-in integration', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    usePinchHighlightStore.getState().clear();
    resetTo('/');
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    usePinchHighlightStore.getState().clear();
    resetTo('/');
  });

  // Per-quadrant midpoint table for a 400×400 matrix:
  //   Q2 top-left   → midpoint near (100, 100)
  //   Q1 top-right  → midpoint near (300, 100)
  //   Q4 bottom-left → midpoint near (100, 300)
  //   Q3 bottom-right → midpoint near (300, 300)
  const cases: ReadonlyArray<{ q: 'Q1' | 'Q2' | 'Q3' | 'Q4'; cx: number; cy: number }> = [
    { q: 'Q2', cx: 100, cy: 100 },
    { q: 'Q1', cx: 300, cy: 100 },
    { q: 'Q4', cx: 100, cy: 300 },
    { q: 'Q3', cx: 300, cy: 300 },
  ];

  for (const { q, cx, cy } of cases) {
    it(`pinch-in centred on ${q}'s midpoint navigates to /q/${q}`, async () => {
      const { container, unmount } = await renderWithQueryClient(
        <I18nProvider>
          <MatrixView />
        </I18nProvider>,
      );
      teardown = unmount;
      const main = container.querySelector<HTMLElement>('[data-view="matrix"]')!;
      stubRect(main, { x: 0, y: 0, w: 400, h: 400 });

      // Fingers start 50 px apart (just above min-initial-distance of
      // 40), spread to 200 px apart — ratio 4× clears the in threshold.
      pinchAt(
        main,
        { x: cx - 25, y: cy },
        { x: cx + 25, y: cy },
        { x: cx - 100, y: cy },
        { x: cx + 100, y: cy },
      );

      expect(useViewStateStore.getState().state.zoom).toBe('quadrant');
      expect(useViewStateStore.getState().state.focusedQuadrant).toBe(q);
      expect(window.location.pathname).toBe(`/q/${q}`);
    });
  }

  it('does not navigate when the pinch ratio stays inside the deadzone', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
      </I18nProvider>,
    );
    teardown = unmount;
    const main = container.querySelector<HTMLElement>('[data-view="matrix"]')!;
    stubRect(main, { x: 0, y: 0, w: 400, h: 400 });

    // 50 px → 55 px is a ratio of 1.1, well below the 1.3 in-threshold.
    pinchAt(main, { x: 75, y: 100 }, { x: 125, y: 100 }, { x: 72, y: 100 }, { x: 127, y: 100 });

    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
  });
});

describe('QuadrantView — Step 7.2 pinch-out integration', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    usePinchHighlightStore.getState().clear();
    resetTo('/q/Q3');
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
    usePinchHighlightStore.getState().clear();
    resetTo('/');
  });

  it('pinch-out from Q3 returns to view1 and highlights Q3 transiently', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q3" />
      </I18nProvider>,
    );
    teardown = unmount;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;
    stubRect(main, { x: 0, y: 0, w: 400, h: 400 });

    // 200 px → 50 px is a ratio of 0.25, well below the 0.77 out-threshold.
    pinchAt(main, { x: 100, y: 200 }, { x: 300, y: 200 }, { x: 175, y: 200 }, { x: 225, y: 200 });

    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
    expect(useViewStateStore.getState().state.focusedQuadrant).toBeUndefined();
    expect(window.location.pathname).toBe('/');
    expect(usePinchHighlightStore.getState().active).toBe('Q3');

    // The highlight decays after the configured TTL.
    await act(async () => {
      await new Promise((r) => setTimeout(r, PINCH_HIGHLIGHT_MS + 30));
    });
    expect(usePinchHighlightStore.getState().active).toBeUndefined();
  });

  it('pinch-in from view2 is a no-op (only out navigates back)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q3" />
      </I18nProvider>,
    );
    teardown = unmount;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;
    stubRect(main, { x: 0, y: 0, w: 400, h: 400 });

    pinchAt(main, { x: 175, y: 200 }, { x: 225, y: 200 }, { x: 50, y: 200 }, { x: 350, y: 200 });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q3');
    expect(usePinchHighlightStore.getState().active).toBeUndefined();
  });

  it('a pinch gesture suppresses the swipe handler on the same touch', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q3" />
      </I18nProvider>,
    );
    teardown = unmount;
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;
    stubRect(main, { x: 0, y: 0, w: 400, h: 400 });

    // Finger 1 lands, then finger 2; finger 1 then drifts a long way
    // horizontally before lifting (a swipe would normally fire here).
    // Because the gesture went multi-pointer, the swipe is suppressed
    // and the pinch ratio resolves to neither in nor out — total no-op.
    dispatchPointer(main, 'pointerdown', { pointerId: 1, clientX: 200, clientY: 200 });
    dispatchPointer(main, 'pointerdown', { pointerId: 2, clientX: 260, clientY: 200 });
    dispatchPointer(main, 'pointermove', { pointerId: 1, clientX: 60, clientY: 200 });
    dispatchPointer(main, 'pointerup', { pointerId: 2, clientX: 260, clientY: 200 });
    dispatchPointer(main, 'pointerup', { pointerId: 1, clientX: 60, clientY: 200 });

    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q3');
  });
});
