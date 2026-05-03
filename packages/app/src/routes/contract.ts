/**
 * Route + view-state contract.
 *
 * The URL is the source of truth for the matrix / quadrant / task-focus
 * navigation flow. The router projects `ViewState` from the URL on
 * navigation; user actions update the URL, which the projection
 * notices.
 *
 * Routes handled by this contract:
 *  - `/`              → view1 (matrix)
 *  - `/q/:quadrant`   → view2 (single quadrant; quadrant ∈ Q1..Q4)
 *  - `?task=:taskId`  → view3 overlay over either route
 *  - `?from=matrix|quadrant` → records the underlying view that was
 *                              visible when view3 was opened, so closing
 *                              view3 can return there even after a hard
 *                              reload (per plan step 8.9).
 *
 * Routes NOT handled here:
 *  - `/options/*` — owned by view4's own router; parseUrl returns
 *                   { zoom: 'matrix' } by default for paths it doesn't
 *                   recognize. The app shell dispatches to options
 *                   independently.
 */

import type { Quadrant, TaskId } from '@emt/backend-core';

/** Zoom level of the matrix / quadrant flow. */
export type Zoom = 'matrix' | 'quadrant';

/**
 * Projection of the matrix / quadrant / task-focus state from the URL.
 *
 * - `zoom`: which view is showing underneath any open overlay.
 * - `focusedQuadrant`: required when `zoom === 'quadrant'`; absent otherwise.
 * - `focusedTaskId`: when set, view3 is open over the underlying view.
 * - `openedFromZoom`: when view3 is open, the zoom level visible when
 *   it was opened. Used by view3's close action to navigate back even
 *   on hard reload. Absent when view3 is not open.
 */
export interface ViewState {
  readonly zoom: Zoom;
  readonly focusedQuadrant?: Quadrant;
  readonly focusedTaskId?: TaskId;
  readonly openedFromZoom?: Zoom;
}

/** Default state for unrecognized or malformed URLs. */
export const defaultViewState: ViewState = { zoom: 'matrix' };

const QUADRANTS = new Set<Quadrant>(['Q1', 'Q2', 'Q3', 'Q4']);

function asQuadrant(s: string | undefined | null): Quadrant | undefined {
  if (s && QUADRANTS.has(s as Quadrant)) return s as Quadrant;
  return undefined;
}

function asZoom(s: string | undefined | null): Zoom | undefined {
  if (s === 'matrix' || s === 'quadrant') return s;
  return undefined;
}

/**
 * Project a `ViewState` from the URL. Always returns a state — never
 * throws. Unknown paths and malformed query params degrade to the
 * default (matrix view).
 *
 * @param url Either an absolute URL, or a path with query
 *            (e.g. `/q/Q2?task=abc&from=matrix`).
 */
export function parseUrl(url: string): ViewState {
  let pathname: string;
  let search: string;
  try {
    const parsed = new URL(url, 'http://_');
    pathname = parsed.pathname;
    search = parsed.search;
  } catch {
    return defaultViewState;
  }

  const params = new URLSearchParams(search);
  const taskParam = params.get('task');
  const fromParam = asZoom(params.get('from'));

  // /q/:quadrant
  const quadrantMatch = /^\/q\/([^/]+)\/?$/.exec(pathname);
  if (quadrantMatch) {
    const q = asQuadrant(quadrantMatch[1]);
    if (q) {
      return build({
        zoom: 'quadrant',
        focusedQuadrant: q,
        focusedTaskId: taskParam ?? undefined,
        openedFromZoom: taskParam ? (fromParam ?? 'quadrant') : undefined,
      });
    }
    return defaultViewState;
  }

  // /
  if (pathname === '/' || pathname === '') {
    return build({
      zoom: 'matrix',
      focusedTaskId: taskParam ?? undefined,
      openedFromZoom: taskParam ? (fromParam ?? 'matrix') : undefined,
    });
  }

  return defaultViewState;
}

/**
 * Serialize a `ViewState` into a path + query.
 *
 * Round-trip property: for every well-formed `ViewState`,
 * `parseUrl(serializeUrl(state))` deep-equals `state`.
 */
export function serializeUrl(state: ViewState): string {
  const params = new URLSearchParams();
  if (state.focusedTaskId !== undefined) {
    params.set('task', state.focusedTaskId);
    if (state.openedFromZoom !== undefined) {
      params.set('from', state.openedFromZoom);
    }
  }
  const query = params.toString();
  const queryStr = query ? `?${query}` : '';

  if (state.zoom === 'quadrant' && state.focusedQuadrant) {
    return `/q/${state.focusedQuadrant}${queryStr}`;
  }
  return `/${queryStr}`;
}

/**
 * Build a `ViewState` while honoring `exactOptionalPropertyTypes`:
 * skip optional fields whose value is undefined rather than emitting
 * an explicit `undefined`.
 */
function build(input: {
  zoom: Zoom;
  focusedQuadrant?: Quadrant | undefined;
  focusedTaskId?: string | undefined;
  openedFromZoom?: Zoom | undefined;
}): ViewState {
  const out: { -readonly [K in keyof ViewState]: ViewState[K] } = { zoom: input.zoom };
  if (input.focusedQuadrant !== undefined) out.focusedQuadrant = input.focusedQuadrant;
  if (input.focusedTaskId !== undefined) out.focusedTaskId = input.focusedTaskId as TaskId;
  if (input.openedFromZoom !== undefined) out.openedFromZoom = input.openedFromZoom;
  return out;
}
