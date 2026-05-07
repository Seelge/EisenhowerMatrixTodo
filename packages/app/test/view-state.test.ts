/**
 * Unit tests for the view-state store. Each test resets `window.location`
 * via `history.replaceState` and resyncs so the store reflects the
 * intended starting URL — the store is a module singleton and persists
 * across tests.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { defaultViewState } from '../src/routes/contract.ts';
import { useViewStateStore } from '../src/state/view-state.ts';

function resetTo(internalPath: string): void {
  window.history.replaceState(null, '', internalPath);
  useViewStateStore.getState().syncFromUrl();
}

describe('view-state store', () => {
  beforeEach(() => {
    resetTo('/');
  });

  afterEach(() => {
    resetTo('/');
  });

  it('syncFromUrl projects the matrix root', () => {
    resetTo('/');
    expect(useViewStateStore.getState().state).toEqual({ zoom: 'matrix' });
  });

  it('syncFromUrl projects a quadrant route', () => {
    resetTo('/q/Q2');
    expect(useViewStateStore.getState().state).toEqual({
      zoom: 'quadrant',
      focusedQuadrant: 'Q2',
    });
  });

  it('syncFromUrl projects a deep-linked task overlay', () => {
    resetTo('/q/Q2?task=abc&from=quadrant');
    expect(useViewStateStore.getState().state).toEqual({
      zoom: 'quadrant',
      focusedQuadrant: 'Q2',
      focusedTaskId: 'abc',
      openedFromZoom: 'quadrant',
    });
  });

  it('navigate pushes a history entry and updates the store', () => {
    const before = window.history.length;
    useViewStateStore.getState().navigate({ zoom: 'quadrant', focusedQuadrant: 'Q3' });
    expect(window.location.pathname + window.location.search).toBe('/q/Q3');
    expect(useViewStateStore.getState().state).toEqual({
      zoom: 'quadrant',
      focusedQuadrant: 'Q3',
    });
    expect(window.history.length).toBeGreaterThanOrEqual(before + 1);
  });

  it('replace swaps the history entry without growing the stack', () => {
    useViewStateStore.getState().navigate({ zoom: 'matrix' });
    const before = window.history.length;
    useViewStateStore.getState().replace({ zoom: 'quadrant', focusedQuadrant: 'Q1' });
    expect(window.location.pathname + window.location.search).toBe('/q/Q1');
    expect(window.history.length).toBe(before);
  });

  it('degrades unknown paths to the default state', () => {
    resetTo('/totally/unknown');
    expect(useViewStateStore.getState().state).toEqual(defaultViewState);
  });

  it('exposes internalPath alongside the projected state', () => {
    resetTo('/q/Q2?task=abc&from=quadrant');
    expect(useViewStateStore.getState().internalPath).toBe('/q/Q2?task=abc&from=quadrant');

    useViewStateStore.getState().navigate({ zoom: 'matrix' });
    expect(useViewStateStore.getState().internalPath).toBe('/');

    useViewStateStore.getState().replace({ zoom: 'quadrant', focusedQuadrant: 'Q4' });
    expect(useViewStateStore.getState().internalPath).toBe('/q/Q4');
  });
});
