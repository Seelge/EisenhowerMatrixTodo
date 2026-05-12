/**
 * DueField — view3 due-date + due-time editor (Step 8.3).
 *
 * Composes the design-system `DueDatePicker` (Step 3.7) for the date
 * side and a native `<input type="time">` for the optional time. The
 * time input is always rendered (so users see what's available) but
 * stays disabled until a date is set — picking the "No date" preset
 * clears the date and the time together. Writes go straight through
 * `useUpdateTask`; both inputs are discrete (button presses / native
 * picker changes), so no debounce is needed here unlike `TitleField`
 * and `NotesField`.
 *
 * Note on the `TaskPatch` cast: under `exactOptionalPropertyTypes`,
 * a `TaskPatch` literal cannot carry `dueDate: undefined` — the
 * optional-field value type excludes `undefined`. Adapters merge via
 * `{ ...existing, ...patch }`, so `undefined` in the patch correctly
 * clears the field at runtime; the cast is a small local concession
 * to the contract's lack of an explicit "clear" mechanism. Widening
 * `TaskPatch` would push type changes through every adapter and is
 * out of scope for this step.
 */
import type { Task, TaskPatch } from '@emt/backend-core';
import { DueDatePicker } from '@emt/design-system';
import { useId, type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useUpdateTask } from '../../queries/tasks.js';

import { UnsupportedHint } from './UnsupportedHint.js';
import { useFieldSupport } from './use-field-support.js';

export interface DueFieldProps {
  task: Task;
}

export function DueField({ task }: DueFieldProps): ReactNode {
  const t = useT();
  const timeId = useId();
  const updateTask = useUpdateTask();

  const onDateChange = (next: string | null): void => {
    const patch: Record<string, unknown> = {};
    if (next === null) {
      patch.dueDate = undefined;
      patch.dueTime = undefined;
    } else {
      patch.dueDate = next;
    }
    updateTask.mutate({ backendId: task.backendId, id: task.id, patch: patch as TaskPatch });
  };

  const onTimeChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const raw = e.currentTarget.value;
    const patch: Record<string, unknown> = { dueTime: raw === '' ? undefined : raw };
    updateTask.mutate({ backendId: task.backendId, id: task.id, patch: patch as TaskPatch });
  };

  const hasDate = task.dueDate !== undefined;
  const dueTimeSupported = useFieldSupport(task.backendId, 'dueTime');

  return (
    <div className="emt-task-view__field" data-field-group="due">
      <span className="emt-task-view__label">{t('app.task.fields.due')}</span>
      <DueDatePicker value={task.dueDate ?? null} onChange={onDateChange} />
      <div className="emt-task-view__time-row">
        <label htmlFor={timeId} className="emt-task-view__label emt-task-view__label--inline">
          {t('app.task.fields.dueTime')}
          {!dueTimeSupported && (
            <UnsupportedHint message={t('app.task.fields.unsupported.dueTime')} />
          )}
        </label>
        <input
          id={timeId}
          type="time"
          className="emt-task-view__time"
          data-field="due-time"
          value={task.dueTime ?? ''}
          onChange={onTimeChange}
          disabled={!hasDate}
        />
      </div>
    </div>
  );
}
