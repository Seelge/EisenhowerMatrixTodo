/**
 * StatusToggle — view3 status checkbox (Step 8.2).
 *
 * A discrete toggle, not a typed-into field: the user either marks
 * complete or reopens, so writes go through `useUpdateTask` immediately
 * (no debounce). When transitioning open → done, `completedAt` is
 * stamped with the current ISO timestamp; reopening clears it via
 * `completedAt: null` so export/import do not show a stale complete time.
 */
import type { Task, TaskPatch, TaskStatus } from '@emt/backend-core';
import { useId, type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useUpdateTask } from '../../queries/tasks.js';

export interface StatusToggleProps {
  task: Task;
}

export function StatusToggle({ task }: StatusToggleProps): ReactNode {
  const t = useT();
  const inputId = useId();
  const updateTask = useUpdateTask();

  const checked = task.status === 'done';

  const onChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const nextStatus: TaskStatus = e.currentTarget.checked ? 'done' : 'open';
    const patch: TaskPatch =
      nextStatus === 'done'
        ? { status: nextStatus, completedAt: new Date().toISOString() }
        : { status: nextStatus, completedAt: null };
    updateTask.mutate({ backendId: task.backendId, id: task.id, patch });
  };

  return (
    <div className="emt-task-view__field emt-task-view__field--inline">
      <input
        id={inputId}
        type="checkbox"
        className="emt-task-view__checkbox"
        data-field="status"
        checked={checked}
        onChange={onChange}
      />
      <label htmlFor={inputId} className="emt-task-view__label emt-task-view__label--inline">
        {t('app.task.fields.status')}
      </label>
    </div>
  );
}
