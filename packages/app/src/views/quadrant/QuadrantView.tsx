/**
 * view2 — single focused quadrant.
 *
 * Renders the focused quadrant fullscreen with its colored glow border
 * (Step 3.2 `Glow`) and a 24 px strip along each shared edge of the
 * matrix in the neighbor's color (`NeighborEdge`). The strips are the
 * visual anchor for Step 6.2's drop-on-edge move and Step 6.3's swipe
 * navigation; both are wired in subsequent steps.
 *
 * Task rendering reuses the same query + sort pipeline as `MatrixCell`
 * so a card has the same identity in view1 and view2 — same `task.id`,
 * same manual rank from the `taskOrder` IDB store, same due-date
 * fallback. That keeps Phase 7's zoom morph (shared `layoutId`)
 * straightforward: cards don't change shape across views.
 *
 * No `DndContext` here yet — the matrix's context lives on `MatrixView`,
 * and Phase 7's `ZoomController` will hoist a single shared context
 * over both views. Until then `TaskCard`'s `useDraggable` degrades to a
 * no-op when no context is mounted, which is the same fallback already
 * exercised by `matrix-cell.test.tsx`.
 */
import type { Quadrant } from '@emt/backend-core';
import { ErrorBanner, Glow, Skeleton, type GlowColor } from '@emt/design-system';
import { useMemo, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useTaskOrder } from '../../queries/task-order.js';
import { useTasks } from '../../queries/tasks.js';
import { type TaskOrderMap } from '../../state/task-order.js';
import { sortTasks } from '../matrix/sort.js';
import { TaskCard } from '../matrix/TaskCard.js';

import { NEIGHBORS, NeighborEdge } from './NeighborEdge.js';

import './quadrant.css';

const EMPTY_RANKS: TaskOrderMap = new Map();

const GLOW_COLOR: Record<Quadrant, GlowColor> = {
  Q1: 'q1',
  Q2: 'q2',
  Q3: 'q3',
  Q4: 'q4',
};

const LABEL_KEY: Record<Quadrant, StringKey> = {
  Q1: 'app.matrix.cell.q1.label',
  Q2: 'app.matrix.cell.q2.label',
  Q3: 'app.matrix.cell.q3.label',
  Q4: 'app.matrix.cell.q4.label',
};

export interface QuadrantViewProps {
  quadrant: Quadrant;
}

export function QuadrantView({ quadrant }: QuadrantViewProps): ReactNode {
  const t = useT();
  const label = t(LABEL_KEY[quadrant]);
  const query = useTasks(quadrant);
  const orderQuery = useTaskOrder();
  const ranks = orderQuery.data ?? EMPTY_RANKS;
  const tasks = useMemo(
    () => (query.data ? sortTasks(query.data, ranks) : undefined),
    [query.data, ranks],
  );

  const neighbors = NEIGHBORS[quadrant];

  return (
    <main data-view="quadrant" data-quadrant={quadrant} className="emt-quadrant" aria-label={label}>
      <Glow color={GLOW_COLOR[quadrant]} className="emt-quadrant__frame" data-quadrant={quadrant}>
        <header className="emt-quadrant__header">
          <h1 className="emt-quadrant__title">{label}</h1>
        </header>
        <div className="emt-quadrant__list" data-task-count={tasks?.length ?? 0}>
          {query.isPending && (
            <>
              <Skeleton className="emt-quadrant__skeleton" height={48} />
              <Skeleton className="emt-quadrant__skeleton" height={48} />
              <Skeleton className="emt-quadrant__skeleton" height={48} />
            </>
          )}
          {query.isError && (
            <ErrorBanner
              message={query.error.message}
              onRetry={() => {
                void query.refetch();
              }}
            />
          )}
          {tasks?.map((task) => (
            <TaskCard key={task.id} task={task} />
          ))}
        </div>
        {neighbors.map((n) => (
          <NeighborEdge key={n.edge} edge={n.edge} neighbor={n.quadrant} />
        ))}
      </Glow>
    </main>
  );
}
