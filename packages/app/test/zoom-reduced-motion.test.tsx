/**
 * Step 7.5 "Done when":
 *   "Test in both modes covers the same state transitions; only the
 *   animation duration differs."
 *
 * Two layers:
 *   1. Pure unit on `selectZoomTransition` — picks 0 duration under
 *      reduced motion, 220 ms otherwise.
 *   2. Integration over `<Routes>` with `matchMedia` stubbed both
 *      ways. Asserts (a) the scene exposes the right
 *      `data-reduced-motion` flag, (b) zooming in via the same
 *      keyboard action lands at the same URL / view-state in both
 *      modes. Animation timing isn't asserted under happy-dom (no
 *      layout), but the framer-motion `transition` value the
 *      controller passes is what gates the morph.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { Routes } from '../src/routes/Routes.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import {
  INSTANT_TRANSITION,
  selectZoomTransition,
  ZOOM_TRANSITION,
} from '../src/views/zoom/zoom-transition.ts';

import { renderWithQueryClient } from './query-render.tsx';

function resetTo(internalPath: string): void {
  window.history.replaceState(null, '', internalPath);
  useViewStateStore.getState().syncFromUrl();
}

interface MatchMediaStub {
  setMatches: (next: boolean) => void;
  restore: () => void;
}

function stubMatchMedia(initial: boolean): MatchMediaStub {
  const listeners = new Set<(e: MediaQueryListEvent) => void>();
  let currentMatches = initial;
  const original = window.matchMedia;
  window.matchMedia = ((query: string) =>
    ({
      get matches(): boolean {
        return currentMatches;
      },
      media: query,
      onchange: null,
      addEventListener: (_t: string, listener: (e: MediaQueryListEvent) => void) =>
        listeners.add(listener),
      removeEventListener: (_t: string, listener: (e: MediaQueryListEvent) => void) =>
        listeners.delete(listener),
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList) as typeof window.matchMedia;
  return {
    setMatches: (next) => {
      currentMatches = next;
      listeners.forEach((l) =>
        l({
          matches: next,
          media: '(prefers-reduced-motion: reduce)',
        } as MediaQueryListEvent),
      );
    },
    restore: () => {
      window.matchMedia = original;
    },
  };
}

function dispatchKey(target: EventTarget, key: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
  target.dispatchEvent(event);
  return event;
}

describe('zoom-transition.ts — pure selection', () => {
  it('uses INSTANT_TRANSITION under reduced motion, ZOOM_TRANSITION otherwise', () => {
    expect(selectZoomTransition(true)).toBe(INSTANT_TRANSITION);
    expect(selectZoomTransition(false)).toBe(ZOOM_TRANSITION);
    expect(INSTANT_TRANSITION.duration).toBe(0);
    expect(ZOOM_TRANSITION.duration).toBeGreaterThan(0);
  });
});

describe('ZoomController — Step 7.5 reduced-motion path', () => {
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

  it('renders data-reduced-motion="false" and animates by default', async () => {
    media = stubMatchMedia(false);
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
    expect(scene.dataset['reducedMotion']).toBe('false');
  });

  it('renders data-reduced-motion="true" when the user prefers reduced motion', async () => {
    media = stubMatchMedia(true);
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <Routes />
      </I18nProvider>,
    );
    teardown = unmount;
    const scene = container.querySelector<HTMLElement>('.emt-zoom__scene')!;
    expect(scene.dataset['reducedMotion']).toBe('true');
  });

  // Both-modes invariant: the same input sequence lands at the same
  // view-state regardless of the reduced-motion preference. This is
  // the actual "Done when" guarantee — animation duration is the only
  // observable difference.
  for (const reduced of [false, true]) {
    it(`Enter on Q2 zooms to /q/Q2 with reduced-motion=${reduced}`, async () => {
      media = stubMatchMedia(reduced);
      const { container, unmount } = await renderWithQueryClient(
        <I18nProvider>
          <Routes />
        </I18nProvider>,
      );
      teardown = unmount;

      const q2 = container.querySelector<HTMLElement>('.emt-matrix__cell[data-quadrant="Q2"]')!;
      q2.focus();
      dispatchKey(q2, 'Enter');

      expect(useViewStateStore.getState().state.zoom).toBe('quadrant');
      expect(useViewStateStore.getState().state.focusedQuadrant).toBe('Q2');
      expect(window.location.pathname).toBe('/q/Q2');
    });
  }
});
