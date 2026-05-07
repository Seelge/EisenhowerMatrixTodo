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

import { DebugPage } from '../debug/DebugPage.js';
import { useT } from '../i18n/provider.js';
import { ConnectBanner } from '../onboarding/ConnectBanner.js';
import { useInternalPath, useViewState } from '../state/view-state.js';

// Vite substitutes `import.meta.env.DEV` with the literal `true` in dev
// and `false` in production. Using the canonical form (no optional
// chaining) is what makes the substitution and downstream rollup
// constant-folding fire — the dev-only DebugPage import then becomes
// unreferenced and tree-shakes out of the production bundle.
const DEBUG_ENABLED: boolean = import.meta.env.DEV;

export function Routes(): ReactNode {
  const state = useViewState();
  const internalPath = useInternalPath();

  // Out-of-band routes that bypass the normal `ViewState` projection.
  // The debug page is dev-only; Vite substitutes `import.meta.env.DEV`
  // with the literal `false` in production builds, after which the
  // branch is unreachable and rollup tree-shakes the component (and
  // its import) out of the bundle.
  if (DEBUG_ENABLED && stripQuery(internalPath) === '/__debug') {
    return <DebugPage />;
  }

  return (
    <>
      <ConnectBanner />
      {state.zoom === 'matrix' && <MatrixPlaceholder />}
      {state.zoom === 'quadrant' && state.focusedQuadrant !== undefined && (
        <QuadrantPlaceholder quadrant={state.focusedQuadrant} />
      )}
      {state.focusedTaskId !== undefined && <TaskFocusPlaceholder taskId={state.focusedTaskId} />}
    </>
  );
}

function stripQuery(path: string): string {
  const i = path.indexOf('?');
  return i === -1 ? path : path.slice(0, i);
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
