/**
 * Routes — switch over the projected `ViewState` and render the
 * corresponding view.
 *
 * View3 (task focus) is always rendered *over* whichever underlying
 * view is active — view1 (matrix) when `zoom === 'matrix'`, view2
 * (quadrant) when `zoom === 'quadrant'`. That matches the contract:
 * `focusedTaskId` is an overlay flag, not a separate route. `TaskView`
 * always mounts; it self-gates on `focusedTaskId` via `ResponsiveSurface.open`
 * so the surface and its dialog effect tear down cleanly on close.
 */
import type { ReactNode } from 'react';

import { DebugPage } from '../debug/DebugPage.js';
import { ConnectBanner } from '../onboarding/ConnectBanner.js';
import { useInternalPath, useViewState } from '../state/view-state.js';
import { MatrixView } from '../views/matrix/MatrixView.js';
import { isOptionsPath } from '../views/options/options-routing.js';
import { OptionsView } from '../views/options/OptionsView.js';
import { QuadrantView } from '../views/quadrant/QuadrantView.js';
import { SearchHotkeys, SearchOverlay } from '../views/search/SearchOverlay.js';
import { TaskView } from '../views/task/TaskView.js';
import { ZoomController } from '../views/zoom/ZoomController.js';

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

  if (isOptionsPath(internalPath)) {
    return <OptionsView />;
  }

  return (
    <>
      <ConnectBanner />
      <ZoomController state={state}>
        {state.zoom === 'matrix' && <MatrixView />}
        {state.zoom === 'quadrant' && state.focusedQuadrant !== undefined && (
          <QuadrantView quadrant={state.focusedQuadrant} />
        )}
      </ZoomController>
      <TaskView />
      <SearchHotkeys />
      <SearchOverlay />
    </>
  );
}

function stripQuery(path: string): string {
  const i = path.indexOf('?');
  return i === -1 ? path : path.slice(0, i);
}
