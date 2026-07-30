/**
 * TagsPanel — Options → Tags (Phase 14 / TODO 5).
 *
 * Lists every tag the user has used with occurrence counts. Tapping a
 * row activates that tag as the matrix filter and returns to the matrix
 * so the user sees the filtered workspace immediately.
 */
import { EmptyNote } from '@emt/design-system';
import { useMemo, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useTasks } from '../../queries/tasks.js';
import { useViewStateStore } from '../../state/view-state.js';
import { useTagFilterStore } from '../tags/tag-filter-store.js';
import { collectTagCounts } from '../tags/tag-helpers.js';
import '../tags/tags.css';

export function TagsPanel(): ReactNode {
  const t = useT();
  const query = useTasks();
  const counts = useMemo(() => (query.data ? collectTagCounts(query.data) : []), [query.data]);

  const onSelect = (tag: string): void => {
    useTagFilterStore.getState().setActiveTag(tag);
    useViewStateStore.getState().navigateRaw('/');
  };

  if (query.isPending) {
    return (
      <div className="emt-tags-panel" data-options-group="tags">
        <p className="emt-tags-panel__intro">{t('app.options.tags.loading')}</p>
      </div>
    );
  }

  return (
    <div className="emt-tags-panel" data-options-group="tags">
      <p className="emt-tags-panel__intro">{t('app.options.tags.intro')}</p>
      {counts.length === 0 ? (
        <EmptyNote className="emt-tags-panel__empty">{t('app.options.tags.empty')}</EmptyNote>
      ) : (
        <ul className="emt-tags-panel__list">
          {counts.map(({ tag, count }) => (
            <li key={tag.toLowerCase()}>
              <button
                type="button"
                className="emt-tags-panel__row"
                data-tag={tag}
                onClick={() => onSelect(tag)}
              >
                <span className="emt-tags-panel__name">{tag}</span>
                <span className="emt-tags-panel__count">
                  {count === 1
                    ? t('app.options.tags.countOne')
                    : t('app.options.tags.countMany').replace('{count}', String(count))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
