/**
 * Routes — switch over the projected `ViewState` and render the
 * corresponding view. Phase 5+ replaces these placeholders with the
 * real Matrix / Quadrant / TaskFocus views; for 4.2 the placeholders
 * are enough to verify deep-linking and back/forward navigation.
 *
 * View3 (task focus) is always rendered *over* whichever underlying
 * view is active — view1 (matrix) when `zoom === 'matrix'`, view2
 * (quadrant) when `zoom === 'quadrant'`. That matches the contract:
 * `focusedTaskId` is an overlay flag, not a separate route.
 */
import type { Quadrant, TaskId } from '@emt/backend-core';
import type { ReactNode } from 'react';

import { useT } from '../i18n/provider.js';
import { useViewState } from '../state/view-state.js';

export function Routes(): ReactNode {
  const state = useViewState();
  return (
    <>
      {state.zoom === 'matrix' && <MatrixPlaceholder />}
      {state.zoom === 'quadrant' && state.focusedQuadrant !== undefined && (
        <QuadrantPlaceholder quadrant={state.focusedQuadrant} />
      )}
      {state.focusedTaskId !== undefined && <TaskFocusPlaceholder taskId={state.focusedTaskId} />}
    </>
  );
}

function MatrixPlaceholder(): ReactNode {
  const t = useT();
  return (
    <main data-view="matrix">
      <h1>{t('app.matrix.heading')}</h1>
      <p>{t('app.matrix.placeholder')}</p>
    </main>
  );
}

function QuadrantPlaceholder({ quadrant }: { quadrant: Quadrant }): ReactNode {
  const t = useT();
  return (
    <main data-view="quadrant" data-quadrant={quadrant}>
      <h1>
        {t('app.quadrant.heading')} {quadrant}
      </h1>
      <p>{t('app.quadrant.placeholder')}</p>
    </main>
  );
}

function TaskFocusPlaceholder({ taskId }: { taskId: TaskId }): ReactNode {
  const t = useT();
  return (
    <aside data-view="task" data-task-id={taskId} role="dialog" aria-label={t('app.task.heading')}>
      <h2>
        {t('app.task.heading')} {taskId}
      </h2>
      <p>{t('app.task.placeholder')}</p>
    </aside>
  );
}
