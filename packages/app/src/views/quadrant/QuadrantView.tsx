/**
 * view2 — single focused quadrant.
 *
 * Renders the focused quadrant fullscreen with its colored glow border
 * (Step 3.2 `Glow`) and a 24 px strip along each shared edge of the
 * matrix in the neighbor's color (`NeighborEdge`).
 *
 * Step 6.2 wires drop-on-edge: a `<DndContext>` is hoisted here with
 * the same `PointerSensor` (distance: 5) + `KeyboardSensor` config as
 * `MatrixView`, and each `NeighborEdge` registers as a `useDroppable`.
 * `createDragEndHandler` (shared with view1) accepts both cell and
 * edge drop targets uniformly via the widened `DroppableTargetData`
 * discriminator, so dropping a card onto a strip applies the same
 * optimistic cache mutation + adapter write as cross-cell drag in
 * view1. The focused quadrant view stays put after drop — the route
 * isn't changed, and `applyOptimisticMove` removes the moved task
 * from the now-source bucket so the card disappears from view as the
 * adapter write resolves.
 *
 * Task rendering reuses the same query + sort pipeline as `MatrixCell`
 * so a card has the same identity in view1 and view2 — same `task.id`,
 * same manual rank from the `taskOrder` IDB store, same due-date
 * fallback. That keeps Phase 7's zoom morph (shared `layoutId`)
 * straightforward: cards don't change shape across views. Phase 7
 * will replace this local context with a single shared one hoisted
 * by `ZoomController` over both views.
 */
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { Quadrant } from '@emt/backend-core';
import { ErrorBanner, Glow, Skeleton, type GlowColor } from '@emt/design-system';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useSetTaskRank, useTaskOrder } from '../../queries/task-order.js';
import { useTasks, useUpdateTask } from '../../queries/tasks.js';
import { type TaskOrderMap } from '../../state/task-order.js';
import { createDragEndHandler } from '../matrix/dnd.js';
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

  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const setRank = useSetTaskRank();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );
  const handleDragEnd = useMemo(
    () =>
      createDragEndHandler({
        queryClient,
        mutate: updateTask.mutate,
        setRank: setRank.mutate,
      }),
    [queryClient, updateTask.mutate, setRank.mutate],
  );

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <main
        data-view="quadrant"
        data-quadrant={quadrant}
        className="emt-quadrant"
        aria-label={label}
      >
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
    </DndContext>
  );
}
