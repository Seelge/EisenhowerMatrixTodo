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
import { EmptyNote, ErrorBanner, Fab, Glow, Skeleton, type GlowColor } from '@emt/design-system';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useSetTaskRank, useTaskOrder } from '../../queries/task-order.js';
import { useTasks, useUpdateTask } from '../../queries/tasks.js';
import type { ViewState } from '../../routes/contract.js';
import { type TaskOrderMap } from '../../state/task-order.js';
import { useViewStateStore } from '../../state/view-state.js';
import { createDragEndHandler } from '../matrix/dnd.js';
import { QuickComposer } from '../matrix/QuickComposer.js';
import { sortTasks } from '../matrix/sort.js';
import { TaskCard } from '../matrix/TaskCard.js';
import { usePinchHighlightStore } from '../zoom/highlight.js';
import { usePinchGesture } from '../zoom/usePinchGesture.js';
import { quadrantLayoutId } from '../zoom/ZoomController.js';

import { NEIGHBORS, NeighborEdge } from './NeighborEdge.js';
import { DEFAULT_SWIPE_OPTIONS, resolveSwipeDirection, resolveSwipeTarget } from './swipe.js';

import './quadrant.css';

/**
 * CSS selector for elements whose pointer events should NOT be treated
 * as swipes:
 *   - `.emt-task-card` — dnd-kit owns drags that start on a card.
 *   - `.emt-quadrant__list` — vertical scrolling inside a populated
 *     quadrant easily clears the swipe distance threshold and would
 *     otherwise hijack scroll. The header / frame padding / strips
 *     give the user enough room to swipe outside the list. The strips
 *     themselves use `pointer-events: none`, so a swipe across one
 *     bubbles to the underlying frame and resolves correctly.
 */
const SWIPE_EXCLUDE_SELECTOR = '.emt-task-card, .emt-quadrant__list';

interface PendingGesture {
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
}

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

  // Step 6.3 — touch swipe to change focus.
  //
  // The route flip is the entire "animation" — there's no morph here
  // (Phase 7 owns that), so the snap is instant by construction and
  // satisfies `prefers-reduced-motion: reduce` without a guard. Phase
  // 7's zoom controller will gate its own animation on
  // `useReducedMotion`; this handler stays input-only.
  const pendingGesture = useRef<PendingGesture | null>(null);
  const lastSwipeAt = useRef<number>(0);

  // Step 7.2 — pinch-out returns to view1 and starts a 600 ms
  // highlight on the previously-focused quadrant. The pinch hook
  // also exposes `hasMultiPointer()` so the swipe handler below
  // can suppress itself while a two-finger gesture is in flight
  // (otherwise lifting the second finger would leave the first
  // pointer's down/up looking like a swipe).
  const pinch = usePinchGesture(
    useCallback(
      (e) => {
        if (e.direction !== 'out') return;
        const previous = quadrant;
        const { state, navigate } = useViewStateStore.getState();
        // Drop `focusedQuadrant` cleanly — `exactOptionalPropertyTypes`
        // forbids passing it as `undefined`, so build a fresh object
        // and only forward the fields that are still meaningful in
        // matrix view (task overlay + provenance).
        const next: ViewState = { zoom: 'matrix' };
        const withTask: ViewState =
          state.focusedTaskId !== undefined
            ? state.openedFromZoom !== undefined
              ? {
                  ...next,
                  focusedTaskId: state.focusedTaskId,
                  openedFromZoom: state.openedFromZoom,
                }
              : { ...next, focusedTaskId: state.focusedTaskId }
            : next;
        navigate(withTask);
        usePinchHighlightStore.getState().highlight(previous);
      },
      [quadrant],
    ),
  );

  const onPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      pinch.onPointerDown(e);
      if (pinch.hasMultiPointer()) {
        // A pinch is being tracked — drop any pending swipe so it
        // doesn't fire when the first finger lifts.
        pendingGesture.current = null;
        return;
      }
      if (!e.isPrimary) return;
      const target = e.target;
      if (target instanceof Element && target.closest(SWIPE_EXCLUDE_SELECTOR) !== null) {
        pendingGesture.current = null;
        return;
      }
      pendingGesture.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        startTime: performance.now(),
      };
    },
    [pinch],
  );

  const onPointerUp = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      const wasMulti = pinch.hasMultiPointer();
      pinch.onPointerUp(e);
      if (wasMulti) {
        // The lifted pointer was part of a pinch — never resolve a
        // swipe from the same gesture.
        pendingGesture.current = null;
        return;
      }
      const g = pendingGesture.current;
      if (g === null || g.pointerId !== e.pointerId) return;
      pendingGesture.current = null;
      const t = performance.now();
      if (t - lastSwipeAt.current < DEFAULT_SWIPE_OPTIONS.cooldown) return;
      const dx = e.clientX - g.startX;
      const dy = e.clientY - g.startY;
      const direction = resolveSwipeDirection(dx, dy, t - g.startTime);
      if (direction === undefined) return;
      const target = resolveSwipeTarget(quadrant, direction);
      if (target === undefined) return;
      lastSwipeAt.current = t;
      const { state, navigate } = useViewStateStore.getState();
      navigate({ ...state, zoom: 'quadrant', focusedQuadrant: target });
    },
    [pinch, quadrant],
  );

  const onPointerCancel = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      pinch.onPointerCancel(e);
      pendingGesture.current = null;
    },
    [pinch],
  );

  // Step 6.5 — FAB in view2.
  //
  // Reuses Step 5.8's `QuickComposer` with `showQuadrantPicker={false}`
  // so the new task lands in the focused quadrant by construction —
  // there's no picker to fight the implied target. The FAB anchors to
  // the frame's bottom-right with the same safe-area-aware offset rule
  // as `.emt-matrix__fab`.
  const [composerOpen, setComposerOpen] = useState(false);
  const openComposer = useCallback(() => setComposerOpen(true), []);
  const closeComposer = useCallback(() => setComposerOpen(false), []);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <main
        data-view="quadrant"
        data-quadrant={quadrant}
        className="emt-quadrant"
        aria-label={label}
        onPointerDown={onPointerDown}
        onPointerMove={pinch.onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
      >
        <motion.div
          className="emt-zoom__quadrant-frame"
          data-zoom-quadrant={quadrant}
          layoutId={quadrantLayoutId(quadrant)}
        >
          <Glow
            color={GLOW_COLOR[quadrant]}
            className="emt-quadrant__frame"
            data-quadrant={quadrant}
          >
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
              {tasks !== undefined && tasks.length === 0 && (
                <EmptyNote className="emt-quadrant__empty">{t('app.quadrant.empty')}</EmptyNote>
              )}
              {tasks?.map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </div>
            {neighbors.map((n) => (
              <NeighborEdge key={n.edge} edge={n.edge} neighbor={n.quadrant} />
            ))}
          </Glow>
        </motion.div>
        <Fab
          className="emt-quadrant__fab"
          aria-label={t('app.matrix.fab.add')}
          aria-haspopup="dialog"
          aria-expanded={composerOpen}
          onClick={openComposer}
        >
          +
        </Fab>
        <QuickComposer
          open={composerOpen}
          onClose={closeComposer}
          defaultQuadrant={quadrant}
          showQuadrantPicker={false}
        />
      </main>
    </DndContext>
  );
}
