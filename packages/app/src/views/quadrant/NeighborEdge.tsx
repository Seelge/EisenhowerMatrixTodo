/**
 * Neighbor edge — a colored strip rendered along one side of the
 * focused quadrant in view2.
 *
 * The Eisenhower matrix is a 2 × 2 grid, so each quadrant has exactly
 * two orthogonal neighbors: one across the urgency axis (left/right
 * edge) and one across the importance axis (top/bottom edge). The
 * remaining two sides of the focused quadrant face the outside of the
 * matrix and have no neighbor — those edges intentionally render no
 * strip.
 *
 * Step 6.1 ships the strips as decorative (`aria-hidden`) markers
 * whose only state is "present in the right color on the right edge".
 * Step 6.2 turns each strip into a `useDroppable` so dragging a card
 * onto it moves the task to that quadrant; the brightening on
 * drag-over uses the existing Glow primitive.
 */
import type { Quadrant } from '@emt/backend-core';
import type { GlowColor } from '@emt/design-system';
import type { ReactNode } from 'react';

export type Edge = 'top' | 'right' | 'bottom' | 'left';

export interface NeighborSpec {
  readonly edge: Edge;
  readonly quadrant: Quadrant;
}

/**
 * Geometric neighbors per focused quadrant, keyed by the side of the
 * focused quadrant the neighbor is adjacent to.
 *
 * Layout reference (from `MatrixView`):
 *   +----+----+
 *   | Q2 | Q1 |    top row    = important
 *   +----+----+
 *   | Q4 | Q3 |    bottom row = not important
 *   +----+----+
 *      left col = not urgent · right col = urgent
 *
 * So Q1's left edge is shared with Q2 and its bottom edge with Q3, and
 * so on. Diagonals (e.g. Q1 ↔ Q4) are not edge-adjacent and intentionally
 * have no strip — matches `design-input.md`'s "shared edge" wording and
 * the swipe contract from Step 6.3 which only handles axis flips.
 */
export const NEIGHBORS: Readonly<Record<Quadrant, readonly NeighborSpec[]>> = {
  Q1: [
    { edge: 'left', quadrant: 'Q2' },
    { edge: 'bottom', quadrant: 'Q3' },
  ],
  Q2: [
    { edge: 'right', quadrant: 'Q1' },
    { edge: 'bottom', quadrant: 'Q4' },
  ],
  Q3: [
    { edge: 'top', quadrant: 'Q1' },
    { edge: 'left', quadrant: 'Q4' },
  ],
  Q4: [
    { edge: 'top', quadrant: 'Q2' },
    { edge: 'right', quadrant: 'Q3' },
  ],
};

const NEIGHBOR_COLOR: Record<Quadrant, GlowColor> = {
  Q1: 'q1',
  Q2: 'q2',
  Q3: 'q3',
  Q4: 'q4',
};

export interface NeighborEdgeProps {
  edge: Edge;
  neighbor: Quadrant;
}

export function NeighborEdge({ edge, neighbor }: NeighborEdgeProps): ReactNode {
  return (
    <div
      className="emt-quadrant__edge"
      data-edge={edge}
      data-neighbor={neighbor}
      data-emt-edge-color={NEIGHBOR_COLOR[neighbor]}
      aria-hidden="true"
    />
  );
}
