/**
 * DefaultsPanel — view4 / Defaults group (Step 9.5 + Phase 16).
 *
 * Settings:
 *  - **Default quadrant for new tasks**: where view1's FAB lands a
 *    new card when the user doesn't manually pick a cell. Reads the
 *    same `useDefaultsStore` that `MatrixView` feeds into
 *    `QuickComposer.defaultQuadrant`.
 *  - **Default secondary sort**: which key `sortTasks` uses when a
 *    task has no manual rank — `dueDate` (the historical default),
 *    `createdAt`, or `title`. Both matrix cells and view2 read this
 *    via `useSortBy()`.
 *  - **Hide completed**: when on (default), matrix / view2 omit done
 *    tasks. Search still finds them.
 *
 * Values persist to the shared meta IDB store; reload picks them up
 * via `useDefaultsStore.load()` from `App.tsx`.
 */
import type { Quadrant } from '@emt/backend-core';
import { type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useDefaultsStore, type SortKey } from '../../state/defaults.js';

const QUADRANTS: readonly Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const QUADRANT_LABEL: Record<Quadrant, StringKey> = {
  Q1: 'app.matrix.cell.q1.label',
  Q2: 'app.matrix.cell.q2.label',
  Q3: 'app.matrix.cell.q3.label',
  Q4: 'app.matrix.cell.q4.label',
};

const SORT_KEYS: readonly SortKey[] = ['dueDate', 'createdAt', 'title'];

const SORT_LABEL: Record<SortKey, StringKey> = {
  dueDate: 'app.options.defaults.sort.dueDate',
  createdAt: 'app.options.defaults.sort.createdAt',
  title: 'app.options.defaults.sort.title',
};

export function DefaultsPanel(): ReactNode {
  const t = useT();
  const newTaskQuadrant = useDefaultsStore((s) => s.newTaskQuadrant);
  const sortBy = useDefaultsStore((s) => s.sortBy);
  const hideCompleted = useDefaultsStore((s) => s.hideCompleted);
  const setNewTaskQuadrant = useDefaultsStore((s) => s.setNewTaskQuadrant);
  const setSortBy = useDefaultsStore((s) => s.setSortBy);
  const setHideCompleted = useDefaultsStore((s) => s.setHideCompleted);

  const onQuadrantChange = (e: ChangeEvent<HTMLInputElement>): void => {
    void setNewTaskQuadrant(e.currentTarget.value as Quadrant);
  };

  const onSortChange = (e: ChangeEvent<HTMLInputElement>): void => {
    void setSortBy(e.currentTarget.value as SortKey);
  };

  const onHideCompletedChange = (e: ChangeEvent<HTMLInputElement>): void => {
    void setHideCompleted(e.currentTarget.checked);
  };

  return (
    <div className="emt-defaults-panel" data-options-panel="defaults" data-options-group="defaults">
      <fieldset className="emt-defaults-panel__section" data-section="new-task-quadrant">
        <legend className="emt-defaults-panel__legend">
          {t('app.options.defaults.newTaskQuadrant')}
        </legend>
        {QUADRANTS.map((q) => (
          <label key={q} className="emt-defaults-panel__option" data-quadrant={q}>
            <input
              type="radio"
              name="default-quadrant"
              value={q}
              checked={newTaskQuadrant === q}
              onChange={onQuadrantChange}
              data-field="default-quadrant"
            />
            <span>{t(QUADRANT_LABEL[q])}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="emt-defaults-panel__section" data-section="sort-by">
        <legend className="emt-defaults-panel__legend">{t('app.options.defaults.sortBy')}</legend>
        {SORT_KEYS.map((s) => (
          <label key={s} className="emt-defaults-panel__option" data-sort={s}>
            <input
              type="radio"
              name="default-sort"
              value={s}
              checked={sortBy === s}
              onChange={onSortChange}
              data-field="default-sort"
            />
            <span>{t(SORT_LABEL[s])}</span>
          </label>
        ))}
      </fieldset>
      <fieldset className="emt-defaults-panel__section" data-section="hide-completed">
        <legend className="emt-defaults-panel__legend">
          {t('app.options.defaults.hideCompleted')}
        </legend>
        <label className="emt-defaults-panel__option" data-field-wrap="hide-completed">
          <input
            type="checkbox"
            checked={hideCompleted}
            onChange={onHideCompletedChange}
            data-field="hide-completed"
          />
          <span>{t('app.options.defaults.hideCompleted.hint')}</span>
        </label>
      </fieldset>
    </div>
  );
}
