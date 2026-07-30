/**
 * TagsField — view3 tag editor (Phase 14 / TODO 5).
 *
 * Chip row of current tags (each removable) plus a text input that
 * commits on Enter or comma. Writes go through `useUpdateTask` with a
 * full `tags` array replace — discrete, no debounce needed.
 */
import type { Task } from '@emt/backend-core';
import {
  useCallback,
  useId,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { useT } from '../../i18n/provider.js';
import { useUpdateTask } from '../../queries/tasks.js';
import { MAX_TAGS_PER_TASK, mergeTags, parseTagInput, removeTag } from '../tags/tag-helpers.js';
import '../tags/tags.css';

export interface TagsFieldProps {
  task: Task;
}

export function TagsField({ task }: TagsFieldProps): ReactNode {
  const t = useT();
  const inputId = useId();
  const updateTask = useUpdateTask();
  const [draft, setDraft] = useState('');

  const commitTags = useCallback(
    (next: readonly string[]) => {
      if (arraysEqual(task.tags, next)) return;
      updateTask.mutate({
        backendId: task.backendId,
        id: task.id,
        patch: { tags: [...next] },
      });
    },
    [updateTask, task.backendId, task.id, task.tags],
  );

  const addFromDraft = (): void => {
    const additions = parseTagInput(draft);
    if (additions.length === 0) return;
    commitTags(mergeTags(task.tags, additions));
    setDraft('');
  };

  const onSubmit = (e: FormEvent): void => {
    e.preventDefault();
    addFromDraft();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Backspace' && draft === '' && task.tags.length > 0) {
      const last = task.tags[task.tags.length - 1];
      if (last !== undefined) commitTags(removeTag(task.tags, last));
    }
  };

  const atCap = task.tags.length >= MAX_TAGS_PER_TASK;

  return (
    <div className="emt-task-view__field" data-field-group="tags">
      <label htmlFor={inputId} className="emt-task-view__label">
        {t('app.task.fields.tags')}
      </label>
      <div className="emt-tags-field">
        <ul className="emt-tags-field__chips" aria-label={t('app.task.fields.tags')}>
          {task.tags.map((tag) => (
            <li key={tag.toLowerCase()} className="emt-tags-field__chip">
              <span className="emt-tags-field__chip-label">{tag}</span>
              <button
                type="button"
                className="emt-tags-field__chip-remove"
                aria-label={t('app.task.fields.tags.remove').replace('{tag}', tag)}
                data-tag={tag}
                onClick={() => commitTags(removeTag(task.tags, tag))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
        <form className="emt-tags-field__form" onSubmit={onSubmit}>
          <input
            id={inputId}
            className="emt-task-view__input emt-tags-field__input"
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={onKeyDown}
            onBlur={addFromDraft}
            placeholder={
              atCap ? t('app.task.fields.tags.cap') : t('app.task.fields.tagsPlaceholder')
            }
            disabled={atCap}
            autoComplete="off"
            data-field="tags"
          />
        </form>
      </div>
    </div>
  );
}

function arraysEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}
