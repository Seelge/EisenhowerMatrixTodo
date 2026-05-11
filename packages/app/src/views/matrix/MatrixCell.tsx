/**
 * Single-quadrant cell rendered inside `MatrixView`'s 2 × 2 grid.
 *
 * The frame is the design-system `Glow` primitive in the matching
 * quadrant color (Step 3.2). The Glow's `data-emt-glow` attribute is
 * what tests assert against to verify the palette is correctly mapped.
 *
 * Step 5.3 fills the cell with its task list, fetched via
 * `useTasks(quadrant)`.
 *
 * Step 5.7 sorts the list with `sortTasks`: manual ranks (from the
 * `taskOrder` IDB store, surfaced through `useTaskOrder`) ascend at the
 * top; tasks without a rank fall back to due-date asc / nulls last,
 * then `createdAt`. The "Reset" header button clears every rank for
 * tasks currently in this cell — the cards then collapse back to the
 * due-date / createdAt fallback.
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
import type { Quadrant } from '@emt/backend-core';
import { ErrorBanner, Glow, Skeleton, type GlowColor } from '@emt/design-system';
import { motion } from 'framer-motion';
import { useCallback, useMemo, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useClearTaskRanks, useTaskOrder } from '../../queries/task-order.js';
import { useTasks } from '../../queries/tasks.js';
import { taskOrderKey, type TaskOrderMap } from '../../state/task-order.js';
import { usePinchHighlight } from '../zoom/highlight.js';
import { quadrantLayoutId } from '../zoom/ZoomController.js';

import type { DroppableCellData } from './dnd.js';
import { refsForReset, sortTasks } from './sort.js';
import { TaskCard } from './TaskCard.js';

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

export interface MatrixCellProps {
  quadrant: Quadrant;
}

export function MatrixCell({ quadrant }: MatrixCellProps): ReactNode {
  const t = useT();
  const label = t(LABEL_KEY[quadrant]);
  const query = useTasks(quadrant);
  const orderQuery = useTaskOrder();
  const clearRanks = useClearTaskRanks();

  const ranks = orderQuery.data ?? EMPTY_RANKS;
  const tasks = useMemo(
    () => (query.data ? sortTasks(query.data, ranks) : undefined),
    [query.data, ranks],
  );

  // "Reset" is only meaningful when at least one task in the cell has
  // a manual rank — otherwise the cards already use the secondary order.
  const hasManualRank = useMemo(
    () => tasks?.some((task) => ranks.has(taskOrderKey(task.backendId, task.id))) ?? false,
    [tasks, ranks],
  );

  const onReset = useCallback(() => {
    if (!tasks) return;
    clearRanks.mutate({ refs: refsForReset(tasks) });
  }, [tasks, clearRanks]);

  const data: DroppableCellData = useMemo(() => ({ kind: 'cell', quadrant }), [quadrant]);
  const { setNodeRef, isOver } = useDroppable({ id: `cell-${quadrant}`, data });

  // Step 7.2 — brief glow on the cell the user just pinched out from.
  const pinchHighlight = usePinchHighlight(quadrant);

  return (
    <motion.div
      className="emt-zoom__quadrant-frame"
      data-zoom-quadrant={quadrant}
      layoutId={quadrantLayoutId(quadrant)}
      transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
    >
      <Glow
        ref={setNodeRef}
        color={GLOW_COLOR[quadrant]}
        className="emt-matrix__cell"
        data-quadrant={quadrant}
        data-drop-active={isOver ? 'true' : 'false'}
        data-pinch-highlight={pinchHighlight ? 'true' : 'false'}
        role="region"
        aria-label={label}
      >
        <header className="emt-matrix__cell-header">
          <h2 className="emt-matrix__cell-title">{label}</h2>
          {hasManualRank && (
            <button
              type="button"
              className="emt-matrix__cell-reset"
              onClick={onReset}
              disabled={clearRanks.isPending}
            >
              {t('app.matrix.cell.reset')}
            </button>
          )}
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
    </motion.div>
  );
}
