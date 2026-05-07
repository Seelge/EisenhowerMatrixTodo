/**
 * Router — owns the URL ↔ store synchronization lifecycle.
 *
 * The view-state store is hydrated eagerly from `window.location` at
 * module load (see `state/view-state.ts`), so the first render already
 * reflects deep-links. This component then attaches a `popstate`
 * listener so browser back/forward (and any other navigation that
 * mutates history without our `navigate()` API) re-syncs the store.
 *
 * It also re-syncs on mount in case the URL changed between module
 * load and mount — relevant for tests that swap `window.location`
 * before rendering.
 */
import { useEffect, type ReactNode } from 'react';

import { useViewStateStore } from '../state/view-state.js';

export interface RouterProps {
  children?: ReactNode;
}

export function Router({ children }: RouterProps): ReactNode {
  useEffect(() => {
    useViewStateStore.getState().syncFromUrl();
    const onPopState = (): void => {
      useViewStateStore.getState().syncFromUrl();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);
  return <>{children}</>;
}
