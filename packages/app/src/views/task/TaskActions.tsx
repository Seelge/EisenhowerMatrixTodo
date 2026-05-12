/**
 * TaskActions — view3 header actions (Step 8.8).
 *
 * Today this is just the trash icon — `complete` is the
 * `StatusToggle` from Step 8.2 inside the body. Clicking the trash
 * does NOT delete immediately; instead it closes view3 (so the task
 * appears gone to the user) and queues a `useDeleteTask` mutation
 * behind the design-system undo snackbar:
 *
 *  - **Undo within the 5 s window:** the snackbar fires `onUndo`,
 *    the deletion never runs, and view3 re-opens over the original
 *    task via `useViewStateStore.replace()`.
 *  - **Timer expires (commit):** `useDeleteTask.mutate` runs against
 *    the task's original `backendId`. The cache invalidation on
 *    success removes the task from the matrix views.
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
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useDeleteTask } from '../../queries/tasks.js';
import type { ViewState } from '../../routes/contract.js';
import { useViewStateStore } from '../../state/view-state.js';

export interface TaskActionsProps {
  task: Task;
  /** Override the snackbar duration. Tests pass a short value; production omits. */
  snackbarDuration?: number;
}

function withoutFocusedTask(state: ViewState): ViewState {
  const next: { -readonly [K in keyof ViewState]: ViewState[K] } = { zoom: state.zoom };
  if (state.focusedQuadrant !== undefined) next.focusedQuadrant = state.focusedQuadrant;
  return next;
}

export function TaskActions({ task, snackbarDuration }: TaskActionsProps): ReactNode {
  const t = useT();
  const snackbar = useSnackbar();
  const deleteTask = useDeleteTask();

  const onDelete = (): void => {
    const prev = useViewStateStore.getState().state;
    const taskId = task.id;
    const backendId = task.backendId;

    useViewStateStore.getState().replace(withoutFocusedTask(prev));

    snackbar.show({
      message: t('app.task.delete.snackbar'),
      undoLabel: t('app.task.delete.undo'),
      ...(snackbarDuration !== undefined ? { duration: snackbarDuration } : {}),
      onCommit: () => {
        deleteTask.mutate({ id: taskId, backendId });
      },
      onUndo: () => {
        // Re-open view3 over the still-extant task.
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
        {/* Trash glyph — keep inline so the surface stays SVG-free for now. */}
        <span aria-hidden="true">🗑</span>
      </IconButton>
    </div>
  );
}
