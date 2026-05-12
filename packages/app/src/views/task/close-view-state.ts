/**
 * Close-behavior helper for view3 (Step 8.9).
 *
 * Returns the `ViewState` to navigate to when the task surface closes.
 * The target zoom is `openedFromZoom` (i.e., whichever view was visible
 * when view3 was opened) and falls back to the current `zoom` if the
 * opener wasn't recorded — which only happens for ad-hoc constructed
 * states; the URL parser always populates `openedFromZoom` when the
 * `?task=` parameter is present.
 *
 * Quadrant focus is preserved when the target zoom is `quadrant` so
 * the user lands back on the same cell they came from; for a matrix
 * landing the focused-quadrant hint is dropped because view1 has no
 * concept of a focused cell.
 *
 * Used both by the surface's own Esc/scrim close and by `TaskActions`'
 * delete-commit so a deleted task and a manually-closed task share
 * the same "return to opener" semantics.
 */
import type { ViewState } from '../../routes/contract.js';

export function closeViewState(state: ViewState): ViewState {
  const targetZoom = state.openedFromZoom ?? state.zoom;
  const next: { -readonly [K in keyof ViewState]: ViewState[K] } = { zoom: targetZoom };
  if (targetZoom === 'quadrant' && state.focusedQuadrant !== undefined) {
    next.focusedQuadrant = state.focusedQuadrant;
  }
  return next;
}
