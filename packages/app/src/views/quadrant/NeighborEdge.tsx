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
 *
 * Step 12.2 — corner precedence. The focused quadrant's two orthogonal
 * neighbor strips meet at exactly one corner; before 12.2 each strip
 * spanned the full edge, so they overlapped in a 24×24 square and a
 * drop there resolved non-deterministically (and the diagonal quadrant
 * was unreachable without two zoom-flips). Now that shared corner is
 * carved out as a dedicated drop zone for the *diagonal* neighbor
 * ({@link DiagonalCorner}), and each edge strip is inset 24 px at its
 * corner-facing end (`data-inset`) so the three regions never overlap.
 * Drops therefore resolve purely by region: corner square → diagonal,
 * the rest of each strip → its own orthogonal neighbor.
 */
import { useDroppable } from '@dnd-kit/core';
import type { Quadrant } from '@emt/backend-core';
import type { GlowColor } from '@emt/design-system';
import { useMemo, type ReactNode } from 'react';

import type { DroppableEdgeData } from '../matrix/dnd.js';

export type Edge = 'top' | 'right' | 'bottom' | 'left';

/** The corner at which a focused quadrant's two neighbor strips meet. */
export type Corner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

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
 * so on. Diagonals (e.g. Q1 ↔ Q4) are not edge-adjacent — Step 12.2
 * gives them the {@link DiagonalCorner} drop zone instead of a strip.
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

/**
 * The diagonal neighbor per focused quadrant, plus the corner the two
 * orthogonal strips share — which is geometrically the direction of
 * that diagonal quadrant (e.g. Q1's strips meet at bottom-left, and
 * down-and-left of Q1 in the matrix is Q4). Each pairing is its own
 * inverse, matching the matrix diagonals Q1↔Q4 and Q2↔Q3.
 */
export interface DiagonalSpec {
  readonly corner: Corner;
  readonly quadrant: Quadrant;
}

export const DIAGONALS: Readonly<Record<Quadrant, DiagonalSpec>> = {
  Q1: { corner: 'bottom-left', quadrant: 'Q4' },
  Q2: { corner: 'bottom-right', quadrant: 'Q3' },
  Q3: { corner: 'top-left', quadrant: 'Q2' },
  Q4: { corner: 'top-right', quadrant: 'Q1' },
};

const NEIGHBOR_COLOR: Record<Quadrant, GlowColor> = {
  Q1: 'q1',
  Q2: 'q2',
  Q3: 'q3',
  Q4: 'q4',
};

/**
 * Which end of a strip to inset by 24 px so it doesn't reach into the
 * shared corner. A vertical strip (`left` / `right`) clips at its
 * top or bottom — whichever the corner names; a horizontal strip
 * (`top` / `bottom`) clips at its left or right end.
 */
function insetEnd(edge: Edge, corner: Corner): Edge {
  const [vertical, horizontal] = corner.split('-') as [Edge, Edge];
  return edge === 'left' || edge === 'right' ? vertical : horizontal;
}

export interface NeighborEdgeProps {
  edge: Edge;
  neighbor: Quadrant;
  /**
   * The focused quadrant's shared corner. The strip is inset 24 px at
   * its corner-facing end so it never overlaps the sibling strip or
   * the {@link DiagonalCorner} drop zone.
   */
  corner: Corner;
}

export function NeighborEdge({ edge, neighbor, corner }: NeighborEdgeProps): ReactNode {
  const data: DroppableEdgeData = useMemo(() => ({ kind: 'edge', quadrant: neighbor }), [neighbor]);
  const { setNodeRef, isOver } = useDroppable({ id: `edge-${neighbor}`, data });
  return (
    <div
      ref={setNodeRef}
      className="emt-quadrant__edge"
      data-edge={edge}
      data-inset={insetEnd(edge, corner)}
      data-neighbor={neighbor}
      data-emt-edge-color={NEIGHBOR_COLOR[neighbor]}
      data-drop-active={isOver ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
}

export interface DiagonalCornerProps {
  /** The corner the two neighbor strips share — where this zone sits. */
  corner: Corner;
  /** The diagonal quadrant a drop here routes the task to. */
  diagonal: Quadrant;
}

/**
 * The shared-corner drop zone for the diagonal neighbor (Step 12.2).
 *
 * Reuses {@link DroppableEdgeData} so `createDragEndHandler` routes a
 * drop here exactly like an edge-strip drop — the diagonal quadrant is
 * never one of the two orthogonal neighbors, so the `edge-<quadrant>`
 * droppable id stays unique across the view. The hit area is the full
 * 24×24 corner square (dnd-kit collides on rects); `quadrant.css`
 * clips the *visual* to a corner triangle pointing at the diagonal.
 */
export function DiagonalCorner({ corner, diagonal }: DiagonalCornerProps): ReactNode {
  const data: DroppableEdgeData = useMemo(() => ({ kind: 'edge', quadrant: diagonal }), [diagonal]);
  const { setNodeRef, isOver } = useDroppable({ id: `edge-${diagonal}`, data });
  return (
    <div
      ref={setNodeRef}
      className="emt-quadrant__corner"
      data-corner={corner}
      data-neighbor={diagonal}
      data-emt-edge-color={NEIGHBOR_COLOR[diagonal]}
      data-drop-active={isOver ? 'true' : 'false'}
      aria-hidden="true"
    />
  );
}
