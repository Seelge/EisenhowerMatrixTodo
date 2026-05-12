/**
 * Step 8.9 — view3 close behavior.
 *
 * "Done when":
 *  - opening from view1 → close → land on view1 (`zoom === 'matrix'`,
 *    no `focusedQuadrant`).
 *  - opening from view2/Q3 → close → land on view2/Q3 (`zoom ===
 *    'quadrant'`, `focusedQuadrant === 'Q3'`).
 *
 * The helper `closeViewState` is the single source of truth for both
 * the surface's Esc/scrim close and the delete-commit landing zone,
 * so this is a pure-function test — no rendering needed.
 */
import type { Quadrant, TaskId } from '@emt/backend-core';
import { describe, expect, it } from 'vitest';

import type { ViewState } from '../src/routes/contract.js';
import { closeViewState } from '../src/views/task/close-view-state.js';

function asTaskId(s: string): TaskId {
  return s as TaskId;
}

describe('closeViewState — Step 8.9', () => {
  it('opening from view1 (matrix) returns to matrix on close', () => {
    const open: ViewState = {
      zoom: 'matrix',
      focusedTaskId: asTaskId('t1'),
      openedFromZoom: 'matrix',
    };
    expect(closeViewState(open)).toEqual({ zoom: 'matrix' });
  });

  it('opening from view2/Q3 returns to view2/Q3 on close', () => {
    const open: ViewState = {
      zoom: 'quadrant',
      focusedQuadrant: 'Q3' as Quadrant,
      focusedTaskId: asTaskId('t2'),
      openedFromZoom: 'quadrant',
    };
    expect(closeViewState(open)).toEqual({ zoom: 'quadrant', focusedQuadrant: 'Q3' });
  });

  it('opening from view1 over an underlying quadrant (mixed state) still returns to matrix', () => {
    // Edge case: state currently shows zoom=quadrant while
    // openedFromZoom=matrix — opener intent wins.
    const open: ViewState = {
      zoom: 'quadrant',
      focusedQuadrant: 'Q2' as Quadrant,
      focusedTaskId: asTaskId('t3'),
      openedFromZoom: 'matrix',
    };
    // focusedQuadrant is dropped when landing on matrix.
    expect(closeViewState(open)).toEqual({ zoom: 'matrix' });
  });

  it('falls back to current zoom when openedFromZoom is missing', () => {
    // Ad-hoc state without the opener hint — preserve current zoom
    // and focused quadrant.
    const open: ViewState = {
      zoom: 'quadrant',
      focusedQuadrant: 'Q1' as Quadrant,
      focusedTaskId: asTaskId('t4'),
    };
    expect(closeViewState(open)).toEqual({ zoom: 'quadrant', focusedQuadrant: 'Q1' });
  });
});
