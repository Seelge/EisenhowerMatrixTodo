/**
 * useReducedMotion — both branches covered (matches=true and =false),
 * plus the live-flip path when the OS setting changes mid-session.
 *
 * Stubs `window.matchMedia` per test with a controllable `matches` flag
 * and a listener registry, so we can drive a `change` event into the
 * hook's subscription without relying on happy-dom's matchMedia stub
 * (which always reports `matches: false` and ignores listeners).
 */
import { act, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useReducedMotion } from '../src/useReducedMotion.ts';

import { renderToContainer } from './render.ts';

function Probe({ capture }: { capture: (value: boolean) => void }): ReactNode {
  const value = useReducedMotion();
  capture(value);
  return null;
}

describe('useReducedMotion', () => {
  let teardown: (() => void) | undefined;
  let listeners: Set<(e: MediaQueryListEvent) => void>;
  let currentMatches: boolean;
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    listeners = new Set();
    currentMatches = false;
    originalMatchMedia = window.matchMedia;
    window.matchMedia = ((query: string) =>
      ({
        matches: currentMatches,
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
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    window.matchMedia = originalMatchMedia;
  });

  it('returns false when the user has no reduced-motion preference', async () => {
    currentMatches = false;
    const observed: boolean[] = [];
    const { unmount } = await renderToContainer(<Probe capture={(v) => observed.push(v)} />);
    teardown = unmount;
    expect(observed.at(-1)).toBe(false);
  });

  it('returns true when prefers-reduced-motion: reduce matches', async () => {
    currentMatches = true;
    const observed: boolean[] = [];
    const { unmount } = await renderToContainer(<Probe capture={(v) => observed.push(v)} />);
    teardown = unmount;
    expect(observed.at(-1)).toBe(true);
  });

  it('flips live when the OS setting changes mid-session', async () => {
    currentMatches = false;
    const observed: boolean[] = [];
    const { unmount } = await renderToContainer(<Probe capture={(v) => observed.push(v)} />);
    teardown = unmount;
    expect(observed.at(-1)).toBe(false);

    // Simulate the user enabling Reduce Motion in OS settings: flip the
    // matchMedia state and fire a `change` event for each subscribed
    // listener (useSyncExternalStore registers exactly one).
    currentMatches = true;
    await act(async () => {
      listeners.forEach((listener) =>
        listener({
          matches: true,
          media: '(prefers-reduced-motion: reduce)',
        } as MediaQueryListEvent),
      );
    });
    expect(observed.at(-1)).toBe(true);
  });

  it('unsubscribes from matchMedia on unmount', async () => {
    currentMatches = false;
    const { unmount } = await renderToContainer(<Probe capture={() => {}} />);
    expect(listeners.size).toBe(1);
    unmount();
    expect(listeners.size).toBe(0);
  });
});
