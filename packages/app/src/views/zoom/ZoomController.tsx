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
import type { Quadrant } from '@emt/backend-core';
import { useReducedMotion } from '@emt/design-system';
import { AnimatePresence, LayoutGroup, MotionConfig, motion } from 'framer-motion';
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type WheelEvent as ReactWheelEvent,
} from 'react';

import type { ViewState } from '../../routes/contract.js';
import { useViewStateStore } from '../../state/view-state.js';

import {
  isArrowKey,
  isTextEditingTarget,
  isZoomInKey,
  isZoomOutKey,
  resolveArrowQuadrant,
} from './keyboard.js';
import { quadrantAtPoint } from './pinch.js';
import { resolveWheelDirection, WHEEL_COOLDOWN_MS } from './wheel.js';
import { selectZoomTransition } from './zoom-transition.js';

import './zoom.css';

const QUADRANTS: readonly Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];

function isQuadrant(value: string | null | undefined): value is Quadrant {
  return value !== null && value !== undefined && (QUADRANTS as readonly string[]).includes(value);
}

/**
 * Build a `ViewState` that drops the optional fields tied to a
 * currently-focused quadrant or open task view. Used by Esc /
 * wheel-down / `-` paths that return to the matrix.
 *
 * Carrying `focusedTaskId` / `openedFromZoom` through is intentional:
 * pressing `-` while a task is open should not close the task too —
 * that's a separate gesture (Esc on view3, or its own close button).
 * `exactOptionalPropertyTypes` forbids passing `undefined` for absent
 * optional fields, so the object is assembled conditionally.
 */
function toMatrixState(state: ViewState): ViewState {
  const next: ViewState = { zoom: 'matrix' };
  if (state.focusedTaskId !== undefined) {
    return state.openedFromZoom !== undefined
      ? {
          ...next,
          focusedTaskId: state.focusedTaskId,
          openedFromZoom: state.openedFromZoom,
        }
      : { ...next, focusedTaskId: state.focusedTaskId };
  }
  return next;
}

/** Build a `ViewState` that closes view3 (drops `focusedTaskId` + `openedFromZoom`). */
function withoutFocusedTask(state: ViewState): ViewState {
  const next: { -readonly [K in keyof ViewState]: ViewState[K] } = { zoom: state.zoom };
  if (state.focusedQuadrant !== undefined) next.focusedQuadrant = state.focusedQuadrant;
  return next;
}

export interface ZoomControllerProps {
  state: ViewState;
  children: ReactNode;
}

export function ZoomController({ state, children }: ZoomControllerProps): ReactNode {
  const surfaceKey =
    state.zoom === 'quadrant' && state.focusedQuadrant !== undefined
      ? `quadrant-${state.focusedQuadrant}`
      : 'matrix';

  // Step 7.5 — `prefers-reduced-motion: reduce` collapses the morph
  // to an instant cut. The chosen transition is applied to the scene
  // `motion.div` *and* propagated to every descendant motion via
  // `<MotionConfig transition>` below — that way the shared `layoutId`
  // morph on matrix cells, the focused quadrant frame, and task cards
  // all snap as one piece. State transitions still complete identically
  // in both modes (URL, view-state, focus); only duration differs.
  const prefersReducedMotion = useReducedMotion();
  const transition = selectZoomTransition(prefersReducedMotion);

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
        navigate(toMatrixState(state));
        lastWheelAt.current = now;
      }
    },
    [state],
  );

  // Step 7.4 — global keyboard bindings: Esc / +/- always; Enter /
  // arrows are only meaningful when a `[data-quadrant]` cell has
  // focus. Lives at the same shell that owns the morph so the
  // keybinding sits next to its visual effect (mirrors the wheel
  // handler above). Listener is on `document` so the binding works
  // even when focus is on `<body>`.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.defaultPrevented) return;
      // Modifier-combinations are reserved for the wheel binding
      // (Ctrl+wheel) and for browser / OS shortcuts.
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTextEditingTarget(e.target)) return;

      const { state, navigate } = useViewStateStore.getState();
      const target = e.target instanceof HTMLElement ? e.target : null;
      // Restrict to the matrix cell — other elements (TaskCardMenu items,
      // QuadrantView frame) also carry `data-quadrant`, but only the cell
      // is a valid keyboard zoom-in target.
      const rawCellQuadrant = target?.closest<HTMLElement>('.emt-matrix__cell[data-quadrant]')
        ?.dataset['quadrant'];
      const focusedCell: Quadrant | undefined =
        state.zoom === 'matrix' && isQuadrant(rawCellQuadrant) ? rawCellQuadrant : undefined;

      if (e.key === 'Escape') {
        if (state.focusedTaskId !== undefined) {
          e.preventDefault();
          navigate(withoutFocusedTask(state));
          return;
        }
        if (state.zoom === 'quadrant') {
          e.preventDefault();
          navigate(toMatrixState(state));
        }
        return;
      }

      if (e.key === 'Enter' && focusedCell !== undefined) {
        e.preventDefault();
        navigate({ ...state, zoom: 'quadrant', focusedQuadrant: focusedCell });
        return;
      }

      if (isArrowKey(e.key) && focusedCell !== undefined) {
        const next = resolveArrowQuadrant(focusedCell, e.key);
        if (next === undefined) return;
        const nextEl = document.querySelector<HTMLElement>(
          `.emt-matrix__cell[data-quadrant="${next}"]`,
        );
        if (nextEl) {
          e.preventDefault();
          nextEl.focus();
        }
        return;
      }

      if (isZoomInKey(e.key)) {
        if (state.zoom !== 'matrix') return;
        // Prefer the focused cell; otherwise default to Q1 (urgent +
        // important) — the canonical "do first" quadrant.
        const focusQuadrant: Quadrant = focusedCell ?? 'Q1';
        e.preventDefault();
        navigate({ ...state, zoom: 'quadrant', focusedQuadrant: focusQuadrant });
        return;
      }

      if (isZoomOutKey(e.key)) {
        if (state.zoom !== 'quadrant') return;
        e.preventDefault();
        navigate(toMatrixState(state));
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <MotionConfig transition={transition}>
      <LayoutGroup id="emt-zoom">
        <AnimatePresence initial={false} mode="popLayout">
          <motion.div
            key={surfaceKey}
            className="emt-zoom__scene"
            data-zoom={state.zoom}
            data-focused-quadrant={state.focusedQuadrant}
            data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
            layout
            transition={transition}
            onWheel={onWheel}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </LayoutGroup>
    </MotionConfig>
  );
}

export function quadrantLayoutId(quadrant: string): string {
  return `emt-quadrant-${quadrant}`;
}

export function taskLayoutId(backendId: string, taskId: string): string {
  return `emt-task-${backendId}-${taskId}`;
}
