/**
 * Step 7.3 "Done when":
 *   - Plain-wheel scrolling inside a cell is unaffected (no nav, no
 *     `preventDefault`).
 *   - `Ctrl + wheel-up` on view1 zooms into the cell under the cursor,
 *     for each of the four cells.
 *   - `Ctrl + wheel-down` on view2 returns to view1.
 *
 * Two layers of coverage:
 *
 *   1. Pure unit tests on `wheel.ts` — direction classifier under the
 *      deadzone threshold.
 *
 *   2. Integration tests that mount a real `<ZoomController>` over
 *      `<MatrixView>` / `<QuadrantView>` and dispatch synthetic
 *      `WheelEvent`s with `ctrlKey` toggled. Happy-dom doesn't compute
 *      layout, so the scene element's `getBoundingClientRect` is
 *      stubbed to a known 400×400 box for the cursor→quadrant
 *      resolution.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { Routes } from '../src/routes/Routes.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import { resolveWheelDirection, WHEEL_DEADZONE } from '../src/views/zoom/wheel.ts';

import { renderWithQueryClient } from './query-render.tsx';

interface WheelInit {
  deltaY: number;
  ctrlKey?: boolean;
  clientX?: number;
  clientY?: number;
}

function dispatchWheel(target: EventTarget, init: WheelInit): Event {
  const event = new Event('wheel', { bubbles: true, cancelable: true });
  Object.assign(event, {
    deltaY: init.deltaY,
    deltaX: 0,
    deltaZ: 0,
    ctrlKey: init.ctrlKey ?? false,
    clientX: init.clientX ?? 0,
    clientY: init.clientY ?? 0,
  });
  target.dispatchEvent(event);
  return event;
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

describe('wheel.ts — pure resolution', () => {
  it('classifies wheel-up below zero', () => {
    expect(resolveWheelDirection(-50)).toBe('up');
  });

  it('classifies wheel-down above zero', () => {
    expect(resolveWheelDirection(50)).toBe('down');
  });

  it('returns undefined inside the deadzone', () => {
    expect(resolveWheelDirection(WHEEL_DEADZONE - 1)).toBeUndefined();
    expect(resolveWheelDirection(-(WHEEL_DEADZONE - 1))).toBeUndefined();
    expect(resolveWheelDirection(0)).toBeUndefined();
  });
});

describe('ZoomController — Step 7.3 wheel integration', () => {
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

  // Per-quadrant cursor positions for a 400×400 scene rect:
  //   Q2 top-left   → (100, 100)
  //   Q1 top-right  → (300, 100)
  //   Q4 bottom-left → (100, 300)
  //   Q3 bottom-right → (300, 300)
  const cases: ReadonlyArray<{ q: 'Q1' | 'Q2' | 'Q3' | 'Q4'; cx: number; cy: number }> = [
    { q: 'Q2', cx: 100, cy: 100 },
    { q: 'Q1', cx: 300, cy: 100 },
    { q: 'Q4', cx: 100, cy: 300 },
    { q: 'Q3', cx: 300, cy: 300 },
  ];

  for (const { q, cx, cy } of cases) {
    it(`Ctrl + wheel-up over ${q} navigates to /q/${q}`, async () => {
      const { container, unmount } = await renderWithQueryClient(
        <I18nProvider>
          <Routes />
        </I18nProvider>,
      );
      teardown = unmount;
      const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
      stubRect(scene, { x: 0, y: 0, w: 400, h: 400 });

      const event = dispatchWheel(scene, {
        deltaY: -100,
        ctrlKey: true,
        clientX: cx,
        clientY: cy,
      });

      expect(event.defaultPrevented).toBe(true);
      expect(useViewStateStore.getState().state.zoom).toBe('quadrant');
      expect(useViewStateStore.getState().state.focusedQuadrant).toBe(q);
      expect(window.location.pathname).toBe(`/q/${q}`);
    });
  }

  it('Ctrl + wheel-down on view2 returns to /', async () => {
    resetTo('/q/Q3');
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
    stubRect(scene, { x: 0, y: 0, w: 400, h: 400 });

    const event = dispatchWheel(scene, { deltaY: 100, ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
    expect(useViewStateStore.getState().state.focusedQuadrant).toBeUndefined();
    expect(window.location.pathname).toBe('/');
  });

  it('plain wheel (no ctrlKey) is left alone — no nav, no preventDefault', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
    stubRect(scene, { x: 0, y: 0, w: 400, h: 400 });

    const event = dispatchWheel(scene, {
      deltaY: -100,
      ctrlKey: false,
      clientX: 100,
      clientY: 100,
    });

    expect(event.defaultPrevented).toBe(false);
    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
  });

  it('Ctrl + wheel-down on view1 is a no-op (already at minimum zoom)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
    stubRect(scene, { x: 0, y: 0, w: 400, h: 400 });

    const event = dispatchWheel(scene, {
      deltaY: 100,
      ctrlKey: true,
      clientX: 100,
      clientY: 100,
    });

    // We still preventDefault to suppress browser page-zoom, but no nav.
    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.zoom).toBe('matrix');
  });

  it('Ctrl + wheel-up on view2 is a no-op (already at maximum zoom)', async () => {
    resetTo('/q/Q1');
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
    stubRect(scene, { x: 0, y: 0, w: 400, h: 400 });

    const event = dispatchWheel(scene, { deltaY: -100, ctrlKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q1');
  });

  it('binds the wheel listener as non-passive on window (Step 12.9)', async () => {
    // React's synthetic `onWheel` is registered passive, so a
    // `preventDefault()` inside it is ignored and the browser still
    // runs its native Ctrl+wheel page-zoom. The fix binds the listener
    // ourselves with `{ passive: false }` on `window`.
    const addSpy = vi.spyOn(window, 'addEventListener');
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;

    const wheelCall = addSpy.mock.calls.find((call) => call[0] === 'wheel');
    expect(wheelCall).toBeDefined();
    expect(wheelCall![2]).toMatchObject({ passive: false });
    addSpy.mockRestore();
  });

  it('Ctrl + wheel dispatched directly on window still drives our zoom (Step 12.9)', async () => {
    // The listener is global, not scoped to the scene element — a wheel
    // event that never bubbles through the scene still resolves.
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
    stubRect(scene, { x: 0, y: 0, w: 400, h: 400 });

    const event = dispatchWheel(window, {
      deltaY: -100,
      ctrlKey: true,
      clientX: 300,
      clientY: 300,
    });

    expect(event.defaultPrevented).toBe(true);
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q3');
  });

  it('rapid second wheel-up does not double-fire (cooldown)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
    stubRect(scene, { x: 0, y: 0, w: 400, h: 400 });

    // First spin → Q3.
    dispatchWheel(scene, { deltaY: -100, ctrlKey: true, clientX: 300, clientY: 300 });
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q3');

    // Immediately a second wheel event arrives that *would* otherwise
    // resolve to Q1 — the cooldown swallows it. The first scene is
    // still mounted in this test (the parent didn't re-render), so the
    // assertion is "the focused quadrant is still Q3, not Q1".
    dispatchWheel(scene, { deltaY: -100, ctrlKey: true, clientX: 300, clientY: 100 });
    expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q3');
  });
});
