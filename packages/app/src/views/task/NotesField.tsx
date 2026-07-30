/**
 * NotesField — view3 notes editor (Step 8.2 / Phase 28).
 *
 * Multi-line textarea for Markdown notes plus an Edit/Preview toggle.
 * Preview uses a dependency-free subset renderer (`renderMarkdownPreview`).
 * Writes are debounced via `useDebouncedCommit`.
 */
import type { Task } from '@emt/backend-core';
import { useCallback, useId, useState, type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useUpdateTask } from '../../queries/tasks.js';

import { renderMarkdownPreview } from './markdown-preview.js';
import { useDebouncedCommit } from './use-debounced-commit.js';

export interface NotesFieldProps {
  task: Task;
}

type NotesMode = 'edit' | 'preview';

export function NotesField({ task }: NotesFieldProps): ReactNode {
  const t = useT();
  const inputId = useId();
  const updateTask = useUpdateTask();
  const [mode, setMode] = useState<NotesMode>('edit');

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

  const showPreview = (): void => {
    flush();
    setMode('preview');
  };

  const html = mode === 'preview' ? renderMarkdownPreview(value) : '';

  return (
    <div className="emt-task-view__field" data-field-group="notes">
      <div className="emt-task-view__notes-head">
        <label htmlFor={inputId} className="emt-task-view__label">
          {t('app.task.fields.notes')}
        </label>
        <div
          className="emt-task-view__notes-modes"
          role="group"
          aria-label={t('app.task.fields.notes.mode')}
        >
          <button
            type="button"
            className="emt-task-view__notes-mode"
            data-active={mode === 'edit' ? 'true' : undefined}
            data-action="notes-edit"
            aria-pressed={mode === 'edit'}
            onClick={() => setMode('edit')}
          >
            {t('app.task.fields.notes.edit')}
          </button>
          <button
            type="button"
            className="emt-task-view__notes-mode"
            data-active={mode === 'preview' ? 'true' : undefined}
            data-action="notes-preview"
            aria-pressed={mode === 'preview'}
            onClick={showPreview}
          >
            {t('app.task.fields.notes.preview')}
          </button>
        </div>
      </div>
      {mode === 'edit' ? (
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
      ) : html === '' ? (
        <div className="emt-task-view__notes-preview" data-field="notes-preview">
          <p className="emt-task-view__notes-empty">{t('app.task.fields.notes.emptyPreview')}</p>
        </div>
      ) : (
        <div
          className="emt-task-view__notes-preview"
          data-field="notes-preview"
          // Safe: renderMarkdownPreview escapes all source text first.
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}
    </div>
  );
}
