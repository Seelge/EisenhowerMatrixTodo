/**
 * TagFilterBar — chip row that toggles the active tag filter (Phase 14).
 *
 * Renders nothing when no tags exist in the current task set. Active
 * filter is held in {@link useTagFilterStore}; lists read it and hide
 * non-matching cards client-side.
 */
import type { Task } from '@emt/backend-core';
import { useMemo, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';

import { useTagFilterStore } from './tag-filter-store.js';
import { collectTagCounts } from './tag-helpers.js';

import './tags.css';

export interface TagFilterBarProps {
  tasks: readonly Task[] | undefined;
  className?: string;
}

export function TagFilterBar({ tasks, className }: TagFilterBarProps): ReactNode {
  const t = useT();
  const activeTag = useTagFilterStore((s) => s.activeTag);
  const toggleTag = useTagFilterStore((s) => s.toggleTag);
  const clear = useTagFilterStore((s) => s.clear);

  const counts = useMemo(() => (tasks ? collectTagCounts(tasks) : []), [tasks]);
  if (counts.length === 0) return null;

  const classes = ['emt-tag-filter', className].filter(Boolean).join(' ');

  return (
    <div
      className={classes}
      role="toolbar"
      aria-label={t('app.tags.filter.label')}
      data-tag-filter=""
    >
      <span className="emt-tag-filter__heading">{t('app.tags.filter.heading')}</span>
      <div className="emt-tag-filter__chips">
        {counts.map(({ tag, count }) => {
          const active = activeTag !== undefined && activeTag.toLowerCase() === tag.toLowerCase();
          return (
            <button
              key={tag.toLowerCase()}
              type="button"
              className="emt-tag-filter__chip"
              data-tag={tag}
              data-active={active ? 'true' : 'false'}
              aria-pressed={active}
              onClick={() => toggleTag(tag)}
            >
              <span className="emt-tag-filter__chip-label">{tag}</span>
              <span className="emt-tag-filter__chip-count">{count}</span>
            </button>
          );
        })}
        {activeTag !== undefined && (
          <button
            type="button"
            className="emt-tag-filter__clear"
            data-action="clear-tag-filter"
            onClick={clear}
          >
            {t('app.tags.filter.clear')}
          </button>
        )}
      </div>
    </div>
  );
}
