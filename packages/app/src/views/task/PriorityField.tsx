/**
 * PriorityField — view3 priority segmented control (Step 8.4).
 *
 * Four-way radio group across `none / low / normal / high`. Implements
 * the WAI-ARIA radio-group pattern: only the checked option is in the
 * tab order via roving `tabIndex`; ArrowLeft/Right and ArrowUp/Down move
 * focus AND selection between adjacent options; Home/End jump to the
 * ends; movement clamps at the boundaries (a four-item segmented
 * control reads more naturally with clamp-on-edge than with wrap, the
 * same reasoning as `QuadrantPicker`).
 *
 * Writes are discrete — one click or arrow press fires a single
 * `useUpdateTask` mutation, no debounce.
 */
import type { Priority, Task } from '@emt/backend-core';
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useUpdateTask } from '../../queries/tasks.js';

export interface PriorityFieldProps {
  task: Task;
}

const ORDER: readonly Priority[] = ['none', 'low', 'normal', 'high'];

type NavKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End';

function isNavKey(key: string): key is NavKey {
  return (
    key === 'ArrowLeft' ||
    key === 'ArrowRight' ||
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'Home' ||
    key === 'End'
  );
}

function nextIndex(current: number, key: NavKey): number {
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      return Math.max(0, current - 1);
    case 'ArrowRight':
    case 'ArrowDown':
      return Math.min(ORDER.length - 1, current + 1);
    case 'Home':
      return 0;
    case 'End':
      return ORDER.length - 1;
  }
}

export function PriorityField({ task }: PriorityFieldProps): ReactNode {
  const t = useT();
  const updateTask = useUpdateTask();
  const buttonRefs = useRef<Record<Priority, HTMLButtonElement | null>>({
    none: null,
    low: null,
    normal: null,
    high: null,
  });

  const value = task.priority;

  const commit = (next: Priority): void => {
    if (next === value) return;
    updateTask.mutate({ backendId: task.backendId, id: task.id, patch: { priority: next } });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!isNavKey(e.key)) return;
    e.preventDefault();
    const currentIndex = ORDER.indexOf(value);
    const targetIndex = nextIndex(currentIndex, e.key);
    const target = ORDER[targetIndex];
    if (target === undefined || target === value) return;
    commit(target);
    queueMicrotask(() => buttonRefs.current[target]?.focus());
  };

  return (
    // Radio-group pattern: focus lives on the checked radio via roving
    // tabindex (no tabIndex on the group itself), and keydown bubbles
    // up here so a single handler resolves the navigation. jsx-a11y's
    // interactive-supports-focus does not model this pattern.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      className="emt-task-view__field"
      data-field-group="priority"
      role="radiogroup"
      aria-label={t('app.task.fields.priority')}
      onKeyDown={onKeyDown}
    >
      <span className="emt-task-view__label" aria-hidden>
        {t('app.task.fields.priority')}
      </span>
      <div className="emt-priority-field">
        {ORDER.map((p) => {
          const checked = p === value;
          return (
            <button
              key={p}
              ref={(el) => {
                buttonRefs.current[p] = el;
              }}
              type="button"
              role="radio"
              aria-checked={checked}
              tabIndex={checked ? 0 : -1}
              data-field="priority"
              data-priority={p}
              className="emt-priority-field__option"
              onClick={() => commit(p)}
            >
              {t(`app.task.fields.priority.${p}`)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
