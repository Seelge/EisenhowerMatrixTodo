/**
 * TitleField — view3 title editor (Step 8.2).
 *
 * Single-line `<input>` mirroring the task title. Each keystroke
 * updates local state instantly; the backend write is debounced via
 * `useDebouncedCommit` so fast typing produces one adapter write
 * rather than N. Blur flushes the pending value before the field
 * loses focus.
 */
import type { Task } from '@emt/backend-core';
import { useCallback, useId, type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useUpdateTask } from '../../queries/tasks.js';

import { useDebouncedCommit } from './use-debounced-commit.js';

export interface TitleFieldProps {
  task: Task;
}

export function TitleField({ task }: TitleFieldProps): ReactNode {
  const t = useT();
  const inputId = useId();
  const updateTask = useUpdateTask();

  const commit = useCallback(
    (next: string) => {
      updateTask.mutate({
        backendId: task.backendId,
        id: task.id,
        patch: { title: next },
      });
    },
    [updateTask, task.backendId, task.id],
  );

  const { value, setValue, flush } = useDebouncedCommit(task.title, commit);

  const onChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setValue(e.currentTarget.value);
  };

  return (
    <div className="emt-task-view__field">
      <label htmlFor={inputId} className="emt-task-view__label">
        {t('app.task.fields.title')}
      </label>
      <input
        id={inputId}
        type="text"
        className="emt-task-view__input"
        data-field="title"
        value={value}
        onChange={onChange}
        onBlur={flush}
        placeholder={t('app.task.fields.titlePlaceholder')}
        autoComplete="off"
      />
    </div>
  );
}
