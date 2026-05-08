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
 * Step 6.2 turns each strip into a dnd-kit `useDroppable` whose data
 * payload is `DroppableEdgeData`. `createDragEndHandler` accepts both
 * cell and edge drops uniformly, so dropping a card onto a strip moves
 * the task to that neighbor quadrant via the same optimistic-cache +
 * adapter-write pipeline as view1's cross-cell drag (Step 5.5). The
 * focused quadrant doesn't change after drop — the route stays put,
 * and `applyOptimisticMove` removes the card from the now-source
 * (focused) quadrant's bucket so the user sees it leave immediately.
 *
 * `data-drop-active` flips to `true` when a draggable is over the
 * strip; `quadrant.css` brightens it (full opacity, neighbor-glow
 * outline) so the user sees which neighbor will receive the drop.
 */
import { useDroppable } from '@dnd-kit/core';
import type { Quadrant } from '@emt/backend-core';
import type { GlowColor } from '@emt/design-system';
import { useMemo, type ReactNode } from 'react';

import type { DroppableEdgeData } from '../matrix/dnd.js';

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
  const data: DroppableEdgeData = useMemo(() => ({ kind: 'edge', quadrant: neighbor }), [neighbor]);
  const { setNodeRef, isOver } = useDroppable({ id: `edge-${neighbor}`, data });
  return (
    <div
      ref={setNodeRef}
      className="emt-quadrant__edge"
      data-edge={edge}
      data-neighbor={neighbor}
      data-emt-edge-color={NEIGHBOR_COLOR[neighbor]}
      data-drop-active={isOver ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
}
