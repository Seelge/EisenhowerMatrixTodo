/**
 * view1 — Eisenhower matrix shell.
 *
 * Renders the 2 × 2 quadrant grid (Step 5.1) and the per-cell task
 * lists (Step 5.3). Step 5.5 wraps the layout in a dnd-kit
 * `<DndContext>` so cards can drag between cells:
 *
 *   - `PointerSensor` covers mouse and touch — its `distance: 5`
 *     activation constraint keeps single taps as clicks (which open
 *     view3) and only enters drag mode once the pointer has moved 5px.
 *   - `KeyboardSensor` lets keyboard users start a drag by pressing
 *     Space on a focused card and move it with arrow keys, satisfying
 *     the project's a11y commitment for the drag interaction (the
 *     dedicated "Move to" menu lands separately in Step 5.6).
 *
 * On drop we apply an optimistic cache mutation (`applyOptimisticMove`
 * in `dnd.ts`) so the card lands in the destination cell before the
 * adapter write resolves, then call `useUpdateTask` with a rollback on
 * error. After the mutation settles, the existing query invalidation
 * inside `useUpdateTask` corrects any drift.
 */
import { DndContext, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { Fab } from '@emt/design-system';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useSetTaskRank } from '../../queries/task-order.js';
import { useTasks, useUpdateTask } from '../../queries/tasks.js';
import { useBusyStore } from '../../state/busy.js';
import { useNewTaskQuadrant } from '../../state/defaults.js';
import { useViewStateStore } from '../../state/view-state.js';
import { SettingsButton } from '../options/SettingsButton.js';
import { SearchButton } from '../search/SearchButton.js';
import { SyncStatusChip } from '../sync/SyncStatusChip.js';
import { TagFilterBar } from '../tags/TagFilterBar.js';
import { quadrantAtPoint } from '../zoom/pinch.js';
import { usePinchGesture } from '../zoom/usePinchGesture.js';

import './matrix.css';
import { useComposerOpen, useComposerStore } from './composer-store.js';
import { createDragEndHandler } from './dnd.js';
import { MatrixCell } from './MatrixCell.js';
import { QuickComposer } from './QuickComposer.js';

export function MatrixView(): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const updateTask = useUpdateTask();
  const setRank = useSetTaskRank();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const dragEnd = useMemo(
    () =>
      createDragEndHandler({
        queryClient,
        mutate: updateTask.mutate,
        setRank: setRank.mutate,
      }),
    [queryClient, updateTask.mutate, setRank.mutate],
  );
  const handleDragStart = useCallback(() => {
    useBusyStore.getState().setDragging(true);
  }, []);
  const handleDragEnd = useCallback(
    (event: Parameters<typeof dragEnd>[0]) => {
      try {
        dragEnd(event);
      } finally {
        useBusyStore.getState().setDragging(false);
      }
    },
    [dragEnd],
  );
  const handleDragCancel = useCallback(() => {
    useBusyStore.getState().setDragging(false);
  }, []);

  const composerOpen = useComposerOpen();
  const openComposer = useCallback(() => useComposerStore.getState().openComposer(), []);
  const closeComposer = useCallback(() => useComposerStore.getState().closeComposer(), []);
  const newTaskQuadrant = useNewTaskQuadrant();
  // All tasks feed the filter bar so chips reflect the whole matrix,
  // not just one cell. Filtering itself still happens per-cell.
  const allTasks = useTasks();

  // Step 7.2 — pinch-in zooms into the quadrant under the midpoint.
  // The midpoint is captured at gesture start (when the second finger
  // lands) so the destination doesn't shift while the user spreads.
  const pinch = usePinchGesture(
    useCallback((e) => {
      if (e.direction !== 'in') return;
      const target = quadrantAtPoint(e.midpoint, e.rect);
      const { state, navigate } = useViewStateStore.getState();
      navigate({ ...state, zoom: 'quadrant', focusedQuadrant: target });
    }, []),
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <main
        data-view="matrix"
        className="emt-matrix"
        aria-label={t('app.matrix.heading')}
        onPointerDown={pinch.onPointerDown}
        onPointerMove={pinch.onPointerMove}
        onPointerUp={pinch.onPointerUp}
        onPointerCancel={pinch.onPointerCancel}
      >
        <TagFilterBar tasks={allTasks.data} className="emt-matrix__tag-filter" />
        <div className="emt-matrix__grid">
          <MatrixCell quadrant="Q2" />
          <MatrixCell quadrant="Q1" />
          <MatrixCell quadrant="Q4" />
          <MatrixCell quadrant="Q3" />
        </div>
        <SyncStatusChip className="emt-matrix__sync" />
        <SearchButton className="emt-matrix__search" />
        <SettingsButton className="emt-matrix__settings" />
        <Fab
          className="emt-matrix__fab"
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
          defaultQuadrant={newTaskQuadrant}
        />
      </main>
    </DndContext>
  );
}
