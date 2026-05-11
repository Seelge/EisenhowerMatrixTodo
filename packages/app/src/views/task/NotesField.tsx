/**
 * NotesField — view3 notes editor (Step 8.2).
 *
 * Multi-line `<textarea>` for Markdown-formatted notes. v1 is a plain
 * textarea (no preview toggle yet); a richer Markdown editor can land
 * in a later phase without changing the field's contract. Writes are
 * debounced via `useDebouncedCommit` for the same reason as
 * `TitleField`: fast typing coalesces to a single adapter write.
 */
import type { Task } from '@emt/backend-core';
import { useCallback, useId, type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useUpdateTask } from '../../queries/tasks.js';

import { useDebouncedCommit } from './use-debounced-commit.js';

export interface NotesFieldProps {
  task: Task;
}

export function NotesField({ task }: NotesFieldProps): ReactNode {
  const t = useT();
  const inputId = useId();
  const updateTask = useUpdateTask();

  const commit = useCallback(
    (next: string) => {
      updateTask.mutate({
        backendId: task.backendId,
        id: task.id,
        patch: { notes: next },
      });
    },
    [updateTask, task.backendId, task.id],
  );

  const { value, setValue, flush } = useDebouncedCommit(task.notes, commit);

  const onChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
    setValue(e.currentTarget.value);
  };

  return (
    <div className="emt-task-view__field">
      <label htmlFor={inputId} className="emt-task-view__label">
        {t('app.task.fields.notes')}
      </label>
      <textarea
        id={inputId}
        className="emt-task-view__textarea"
        data-field="notes"
        value={value}
        onChange={onChange}
        onBlur={flush}
        placeholder={t('app.task.fields.notesPlaceholder')}
        rows={5}
      />
    </div>
  );
}
