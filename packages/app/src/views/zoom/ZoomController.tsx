/**
 * ZoomController — shared Framer Motion shell for view1 ↔ view2.
 *
 * The active route still decides whether the matrix or focused quadrant
 * is rendered. This component provides the one animated wrapper around
 * that route surface and a `LayoutGroup` so matching quadrant frames
 * and task cards can morph between their matrix and focused positions.
 *
 * Step 7.3 — `Ctrl + wheel` toggles zoom at the same shell, so the
 * binding lives next to the morph it triggers. Plain wheel is left
 * alone so per-cell scroll keeps working. `Ctrl + wheel-up` on the
 * matrix zooms into the cell the cursor is over (resolved
 * geometrically against the scene rect via `quadrantAtPoint`); `Ctrl
 * + wheel-down` on a focused quadrant returns to the matrix. A short
 * cooldown collapses the dozens of wheel events real OSes emit per
 * spin into one nav.
 */
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import { useCallback, useRef, type ReactNode, type WheelEvent as ReactWheelEvent } from 'react';

import type { ViewState } from '../../routes/contract.js';
import { useViewStateStore } from '../../state/view-state.js';

import { quadrantAtPoint } from './pinch.js';
import { resolveWheelDirection, WHEEL_COOLDOWN_MS } from './wheel.js';

import './zoom.css';

const ZOOM_TRANSITION = {
  duration: 0.22,
  ease: [0.2, 0, 0, 1],
} as const;

export interface ZoomControllerProps {
  state: ViewState;
  children: ReactNode;
}

export function ZoomController({ state, children }: ZoomControllerProps): ReactNode {
  const surfaceKey =
    state.zoom === 'quadrant' && state.focusedQuadrant !== undefined
      ? `quadrant-${state.focusedQuadrant}`
      : 'matrix';

  const lastWheelAt = useRef<number>(0);

  const onWheel = useCallback(
    (e: ReactWheelEvent<HTMLDivElement>) => {
      // Plain wheel is the per-cell / per-quadrant scroll affordance —
      // never intercept it. Only `Ctrl + wheel` is our zoom binding.
      // (macOS trackpad pinch synthesizes `ctrlKey: true` on wheel
      // events too, so the same handler covers trackpad pinch on
      // desktop browsers without extra plumbing.)
      if (!e.ctrlKey) return;
      // Always swallow the browser's built-in `Ctrl + wheel` page-zoom,
      // even when we end up not navigating (cooldown, deadzone) — the
      // user clearly meant to zoom *us*, not the entire page.
      e.preventDefault();
      const now = performance.now();
      if (now - lastWheelAt.current < WHEEL_COOLDOWN_MS) return;
      const direction = resolveWheelDirection(e.deltaY);
      if (direction === undefined) return;
      const { navigate } = useViewStateStore.getState();
      if (state.zoom === 'matrix' && direction === 'up') {
        const rect = e.currentTarget.getBoundingClientRect();
        const target = quadrantAtPoint({ x: e.clientX, y: e.clientY }, rect);
        navigate({ ...state, zoom: 'quadrant', focusedQuadrant: target });
        lastWheelAt.current = now;
        return;
      }
      if (state.zoom === 'quadrant' && direction === 'down') {
        // Drop `focusedQuadrant` cleanly — `exactOptionalPropertyTypes`
        // forbids passing it as `undefined`, so build a fresh object
        // and only forward fields still meaningful in matrix view.
        const next: ViewState = { zoom: 'matrix' };
        const withTask: ViewState =
          state.focusedTaskId !== undefined
            ? state.openedFromZoom !== undefined
              ? {
                  ...next,
                  focusedTaskId: state.focusedTaskId,
                  openedFromZoom: state.openedFromZoom,
                }
              : { ...next, focusedTaskId: state.focusedTaskId }
            : next;
        navigate(withTask);
        lastWheelAt.current = now;
      }
    },
    [state],
  );

  return (
    <LayoutGroup id="emt-zoom">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div
          key={surfaceKey}
          className="emt-zoom__scene"
          data-zoom={state.zoom}
          data-focused-quadrant={state.focusedQuadrant}
          layout
          transition={ZOOM_TRANSITION}
          onWheel={onWheel}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </LayoutGroup>
  );
}

export function quadrantLayoutId(quadrant: string): string {
  return `emt-quadrant-${quadrant}`;
}

export function taskLayoutId(backendId: string, taskId: string): string {
  return `emt-task-${backendId}-${taskId}`;
}
