/**
 * TaskActions — view3 header actions (Step 8.8).
 *
 * Today this is just the trash icon — `complete` is the
 * `StatusToggle` from Step 8.2 inside the body. Clicking the trash
 * does NOT delete immediately; instead it closes view3, optimistically
 * removes the card from every cached tasks query (Step 12.1, via
 * `applyOptimisticDelete` — so the matrix updates synchronously rather
 * than lagging until some later refetch), and queues a `useDeleteTask`
 * mutation behind the design-system undo snackbar:
 *
 *  - **Undo within the 5 s window:** the snackbar fires `onUndo`,
 *    the deletion never runs, the optimistic cache removal is rolled
 *    back, and view3 re-opens over the original task via
 *    `useViewStateStore.replace()`.
 *  - **Timer expires (commit):** `useDeleteTask.mutate` runs against
 *    the task's original `backendId`. The cache invalidation on
 *    success reconciles the matrix views with storage.
 *
 * `replace()` (not `navigate()`) is intentional in both directions —
 * the snackbar dance shouldn't stack two history entries for one
 * "delete-then-maybe-undo" action.
 *
 * A `duration` prop is provided primarily for tests; production uses
 * the snackbar default (5 s).
 */
import type { Task } from '@emt/backend-core';
import { IconButton, useSnackbar } from '@emt/design-system';
import { useQueryClient } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useDeleteTask } from '../../queries/tasks.js';
import { useViewStateStore } from '../../state/view-state.js';
import { applyOptimisticDelete } from '../matrix/dnd.js';

import { closeViewState } from './close-view-state.js';

export interface TaskActionsProps {
  task: Task;
  /** Override the snackbar duration. Tests pass a short value; production omits. */
  snackbarDuration?: number;
}

export function TaskActions({ task, snackbarDuration }: TaskActionsProps): ReactNode {
  const t = useT();
  const snackbar = useSnackbar();
  const deleteTask = useDeleteTask();
  const queryClient = useQueryClient();

  const onDelete = (): void => {
    const prev = useViewStateStore.getState().state;
    const taskId = task.id;
    const backendId = task.backendId;

    useViewStateStore.getState().replace(closeViewState(prev));

    // Step 12.1 — drop the card from the matrix synchronously instead of
    // waiting out the snackbar window. The real adapter delete still
    // runs only on commit; `onUndo` rolls the cache back.
    const rollbackDelete = applyOptimisticDelete(queryClient, task);

    snackbar.show({
      message: t('app.task.delete.snackbar'),
      undoLabel: t('app.task.delete.undo'),
      ...(snackbarDuration !== undefined ? { duration: snackbarDuration } : {}),
      onCommit: () => {
        deleteTask.mutate(
          { id: taskId, backendId },
          {
            onError: () => {
              rollbackDelete();
              snackbar.show({ message: t('app.task.delete.failed') });
            },
          },
        );
      },
      onUndo: () => {
        // Restore the card and re-open view3 over the still-extant task.
        rollbackDelete();
        useViewStateStore.getState().replace(prev);
      },
    });
  };

  return (
    <div className="emt-task-view__actions" data-field-group="actions">
      <IconButton
        type="button"
        aria-label={t('app.task.delete.label')}
        className="emt-task-view__delete"
        data-field="delete"
        onClick={onDelete}
      >
        <TrashIcon />
      </IconButton>
    </div>
  );
}

function TrashIcon(): ReactNode {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" />
    </svg>
  );
}
