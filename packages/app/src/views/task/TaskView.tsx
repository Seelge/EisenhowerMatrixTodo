/**
 * view3 — task focus surface (Step 8.1 + 8.2).
 *
 * Mounts inside `ResponsiveSurface`: a bottom sheet on narrow viewports
 * (the matrix shows through a dimmed scrim) and a ~480 px right side
 * panel on desktop (the matrix or focused quadrant stays fully visible
 * alongside). Both branches share the same dialog plumbing — initial
 * focus, focus trap, restore-on-close, Escape-to-close — supplied by
 * `useDialogBehavior` inside the design-system surface. The desktop
 * side panel additionally dismisses on a click outside it (Step 12.4):
 * it has no scrim, so without that, mouse users had to reach for
 * Escape. Either way `onClose` here routes the dismissal through
 * `closeViewState`.
 *
 * Step 8.2 wires the first three field editors: title, notes, status.
 * The surface loads the focused task via `useTask` and re-mounts the
 * editor subtree under `key={task.id}` so each field starts with a
 * clean local-state slate when the user navigates between tasks.
 *
 * Backend selector (8.6) and the proper "close returns to the view
 * that opened me" behavior keyed off `openedFromZoom` (8.9) land in
 * later steps. For now, close drops `focusedTaskId` and keeps the
 * underlying view as-is — sufficient because the underlying view
 * cannot change while view3 is open at this point in the build.
 *
 * The Escape handler in `ZoomController` deliberately ignores the
 * `focusedTaskId !== undefined` case: the dialog owns its own Escape
 * binding, and routing both through `document` would push two history
 * entries for one keystroke.
 */
import type { Task } from '@emt/backend-core';
import { EmptyNote, ErrorBanner, ResponsiveSurface, Skeleton } from '@emt/design-system';
import type { UseQueryResult } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useTask } from '../../queries/tasks.js';
import { useViewState, useViewStateStore } from '../../state/view-state.js';

import { BackendField } from './BackendField.js';
import { closeViewState } from './close-view-state.js';
import { DueField } from './DueField.js';
import { NotesField } from './NotesField.js';
import { PriorityField } from './PriorityField.js';
import { QuadrantField } from './QuadrantField.js';
import { StatusToggle } from './StatusToggle.js';
import { TagsField } from './TagsField.js';
import { TaskActions } from './TaskActions.js';
import { TitleField } from './TitleField.js';
import './task-view.css';

export function TaskView(): ReactNode {
  const state = useViewState();
  const t = useT();
  const open = state.focusedTaskId !== undefined;
  const taskQuery = useTask(state.focusedTaskId);

  const close = (): void => {
    const current = useViewStateStore.getState().state;
    if (current.focusedTaskId === undefined) return;
    useViewStateStore.getState().navigate(closeViewState(current));
  };

  return (
    <ResponsiveSurface open={open} onClose={close} aria-label={t('app.task.heading')}>
      {state.focusedTaskId !== undefined && (
        <section className="emt-task-view" data-view="task" data-task-id={state.focusedTaskId}>
          <header className="emt-task-view__header">
            <h2 className="emt-task-view__heading">{t('app.task.heading')}</h2>
            {taskQuery.data !== undefined && <TaskActions task={taskQuery.data} />}
          </header>
          <TaskViewBody query={taskQuery} />
        </section>
      )}
    </ResponsiveSurface>
  );
}

function TaskViewBody({ query }: { query: UseQueryResult<Task | undefined, Error> }): ReactNode {
  const t = useT();
  if (query.isPending) {
    return (
      <div className="emt-task-view__body" data-state="loading">
        <Skeleton className="emt-task-view__skeleton" height={32} />
        <Skeleton className="emt-task-view__skeleton" height={96} />
        <Skeleton className="emt-task-view__skeleton" height={32} />
        <Skeleton className="emt-task-view__skeleton" height={32} />
      </div>
    );
  }
  if (query.isError) {
    return (
      <ErrorBanner
        message={query.error.message}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }
  const task = query.data;
  if (task === undefined) {
    return <EmptyNote className="emt-task-view__notice">{t('app.task.notFound')}</EmptyNote>;
  }
  return (
    <div className="emt-task-view__body" key={task.id}>
      <TitleField task={task} />
      <NotesField task={task} />
      <TagsField task={task} />
      <DueField task={task} />
      <PriorityField task={task} />
      <QuadrantField task={task} />
      <BackendField task={task} />
      <StatusToggle task={task} />
    </div>
  );
}
