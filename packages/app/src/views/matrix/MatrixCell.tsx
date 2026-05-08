/**
 * Single-quadrant cell rendered inside `MatrixView`'s 2 × 2 grid.
 *
 * The frame is the design-system `Glow` primitive in the matching
 * quadrant color (Step 3.2). The Glow's `data-emt-glow` attribute is
 * what tests assert against to verify the palette is correctly mapped.
 *
 * Step 5.3 fills the cell with its task list, fetched via
 * `useTasks(quadrant)`. The list is sorted by `createdAt` ascending —
 * this is the temporary fallback the plan calls for; Step 5.7 replaces
 * it with manual order + due-date secondary.
 *
 * Step 5.5 makes the cell a drop target via dnd-kit's `useDroppable`.
 * The droppable ref is attached to the `Glow` (which now forwards its
 * ref); `data-drop-active` toggles when a draggable is currently over
 * the cell so CSS can show the "you can drop here" highlight. The
 * data payload (`kind: 'cell'`, `quadrant`) is what `MatrixView`'s
 * `onDragEnd` reads to compute the destination quadrant — see
 * `dnd.ts` for the type guards.
 */
import { useDroppable } from '@dnd-kit/core';
import type { Quadrant, Task } from '@emt/backend-core';
import { ErrorBanner, Glow, Skeleton, type GlowColor } from '@emt/design-system';
import { useMemo, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useTasks } from '../../queries/tasks.js';

import type { DroppableCellData } from './dnd.js';
import { TaskCard } from './TaskCard.js';

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

function sortByCreatedAtAsc(tasks: readonly Task[]): readonly Task[] {
  return [...tasks].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export interface MatrixCellProps {
  quadrant: Quadrant;
}

export function MatrixCell({ quadrant }: MatrixCellProps): ReactNode {
  const t = useT();
  const label = t(LABEL_KEY[quadrant]);
  const query = useTasks(quadrant);
  const tasks = useMemo(
    () => (query.data ? sortByCreatedAtAsc(query.data) : undefined),
    [query.data],
  );

  const data: DroppableCellData = useMemo(() => ({ kind: 'cell', quadrant }), [quadrant]);
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${quadrant}`, data });

  return (
    <Glow
      ref={setNodeRef}
      color={GLOW_COLOR[quadrant]}
      className="emt-matrix__cell"
      data-quadrant={quadrant}
      data-drop-active={isOver ? 'true' : 'false'}
      role="region"
      aria-label={label}
    >
      <header className="emt-matrix__cell-header">
        <h2 className="emt-matrix__cell-title">{label}</h2>
      </header>
      <div className="emt-matrix__cell-list" data-task-count={tasks?.length ?? 0}>
        {query.isPending && (
          <>
            <Skeleton className="emt-matrix__cell-skeleton" height={44} />
            <Skeleton className="emt-matrix__cell-skeleton" height={44} />
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
    </Glow>
  );
}
