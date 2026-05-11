/**
 * view3 — task focus surface (Step 8.1).
 *
 * Mounts inside `ResponsiveSurface`: a bottom sheet on narrow viewports
 * (the matrix shows through a dimmed scrim) and a ~480 px right side
 * panel on desktop (the matrix or focused quadrant stays fully visible
 * alongside). Both branches share the same dialog plumbing — initial
 * focus, focus trap, restore-on-close, Escape-to-close — supplied by
 * `useDialogBehavior` inside the design-system surface.
 *
 * Step 8.1 only stands up the container. Field editors (8.2–8.5),
 * backend selector (8.6), and the proper "close returns to the view
 * that opened me" behavior keyed off `openedFromZoom` (8.9) land in
 * later steps. For now, close simply drops `focusedTaskId` and keeps
 * the underlying view as-is — sufficient because the underlying view
 * cannot change while view3 is open at this point in the build.
 *
 * The Escape handler in `ZoomController` deliberately ignores the
 * `focusedTaskId !== undefined` case: the dialog owns its own Escape
 * binding, and routing both through `document` would push two history
 * entries for one keystroke.
 */
import { ResponsiveSurface } from '@emt/design-system';
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { ViewState } from '../../routes/contract.js';
import { useViewState, useViewStateStore } from '../../state/view-state.js';

function withoutFocusedTask(state: ViewState): ViewState {
  const next: { -readonly [K in keyof ViewState]: ViewState[K] } = { zoom: state.zoom };
  if (state.focusedQuadrant !== undefined) next.focusedQuadrant = state.focusedQuadrant;
  return next;
}

export function TaskView(): ReactNode {
  const state = useViewState();
  const t = useT();
  const open = state.focusedTaskId !== undefined;

  const close = (): void => {
    const current = useViewStateStore.getState().state;
    if (current.focusedTaskId === undefined) return;
    useViewStateStore.getState().navigate(withoutFocusedTask(current));
  };

  return (
    <ResponsiveSurface open={open} onClose={close} aria-label={t('app.task.heading')}>
      {state.focusedTaskId !== undefined && (
        <section className="emt-task-view" data-view="task" data-task-id={state.focusedTaskId}>
          <h2 className="emt-task-view__heading">{t('app.task.heading')}</h2>
          <p className="emt-task-view__placeholder">{t('app.task.placeholder')}</p>
        </section>
      )}
    </ResponsiveSurface>
  );
}
