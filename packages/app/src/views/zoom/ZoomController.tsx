/**
 * ZoomController — shared Framer Motion shell for view1 ↔ view2.
 *
 * The active route still decides whether the matrix or focused quadrant
 * is rendered. This component provides the one animated wrapper around
 * that route surface and a `LayoutGroup` so matching quadrant frames
 * and task cards can morph between their matrix and focused positions.
 */
import { AnimatePresence, LayoutGroup, motion } from 'framer-motion';
import type { ReactNode } from 'react';

import type { ViewState } from '../../routes/contract.js';

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
