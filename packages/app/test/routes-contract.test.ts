import type { Quadrant, TaskId } from '@emt/backend-core';
import { describe, expect, it } from 'vitest';

import {
  defaultViewState,
  parseUrl,
  serializeUrl,
  type ViewState,
  type Zoom,
} from '../src/routes/contract.ts';

const QUADRANTS: Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];
const ZOOMS: Zoom[] = ['matrix', 'quadrant'];

function rand<T>(arr: readonly T[]): T {
  const i = Math.floor(Math.random() * arr.length);
  // Element guaranteed since arr.length > 0 in our usages.
  return arr[i] as T;
}

function randomState(): ViewState {
  const zoom = rand(ZOOMS);
  const includeTask = Math.random() < 0.5;
  const out: { -readonly [K in keyof ViewState]: ViewState[K] } = { zoom };
  if (zoom === 'quadrant') {
    out.focusedQuadrant = rand(QUADRANTS);
  }
  if (includeTask) {
    out.focusedTaskId = `t-${Math.floor(Math.random() * 1_000_000)}` as TaskId;
    out.openedFromZoom = zoom;
  }
  return out;
}

describe('routes contract — parseUrl / serializeUrl', () => {
  it('round-trips 20 randomized states', () => {
    for (let i = 0; i < 20; i++) {
      const state = randomState();
      const url = serializeUrl(state);
      const parsed = parseUrl(url);
      expect(parsed).toEqual(state);
    }
  });

  it('parses the matrix root', () => {
    expect(parseUrl('/')).toEqual({ zoom: 'matrix' });
    expect(parseUrl('')).toEqual({ zoom: 'matrix' });
  });

  it('parses a quadrant route', () => {
    expect(parseUrl('/q/Q2')).toEqual({ zoom: 'quadrant', focusedQuadrant: 'Q2' });
  });

  it('parses task overlay over matrix', () => {
    expect(parseUrl('/?task=abc&from=matrix')).toEqual({
      zoom: 'matrix',
      focusedTaskId: 'abc',
      openedFromZoom: 'matrix',
    });
  });

  it('parses task overlay over quadrant', () => {
    expect(parseUrl('/q/Q3?task=xyz&from=quadrant')).toEqual({
      zoom: 'quadrant',
      focusedQuadrant: 'Q3',
      focusedTaskId: 'xyz',
      openedFromZoom: 'quadrant',
    });
  });

  it('infers from when missing on a quadrant route with task', () => {
    expect(parseUrl('/q/Q3?task=xyz')).toEqual({
      zoom: 'quadrant',
      focusedQuadrant: 'Q3',
      focusedTaskId: 'xyz',
      openedFromZoom: 'quadrant',
    });
  });

  it('infers from on the matrix when missing', () => {
    expect(parseUrl('/?task=xyz')).toEqual({
      zoom: 'matrix',
      focusedTaskId: 'xyz',
      openedFromZoom: 'matrix',
    });
  });

  it('degrades gracefully on unknown quadrant', () => {
    expect(parseUrl('/q/Q9')).toEqual(defaultViewState);
    expect(parseUrl('/q/foo')).toEqual(defaultViewState);
  });

  it('degrades gracefully on unhandled path (e.g. /options/*)', () => {
    expect(parseUrl('/options/backends')).toEqual(defaultViewState);
    expect(parseUrl('/totally/unknown')).toEqual(defaultViewState);
  });

  it('serializes the matrix default to /', () => {
    expect(serializeUrl({ zoom: 'matrix' })).toBe('/');
  });

  it('serializes a quadrant view to /q/<Q>', () => {
    expect(serializeUrl({ zoom: 'quadrant', focusedQuadrant: 'Q4' })).toBe('/q/Q4');
  });

  it('serializes a task overlay with from', () => {
    expect(
      serializeUrl({
        zoom: 'quadrant',
        focusedQuadrant: 'Q2',
        focusedTaskId: 'abc' as TaskId,
        openedFromZoom: 'quadrant',
      }),
    ).toBe('/q/Q2?task=abc&from=quadrant');
  });

  it('omits from when no task is set', () => {
    expect(serializeUrl({ zoom: 'matrix', openedFromZoom: 'matrix' })).toBe('/');
  });
});
