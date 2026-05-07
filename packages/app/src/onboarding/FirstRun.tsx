/**
 * `<FirstRun />` — invisible mount that triggers the first-run seed
 * after the QueryClient is available, then invalidates the tasks cache
 * if anything was seeded so the next `useTasks()` re-fetch picks up
 * the new rows.
 *
 * Renders nothing. Mount it as a child of `<QueryClientProvider>` —
 * the placement decides scope, not output.
 */
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, type ReactNode } from 'react';

import { runFirstRunSeed } from './first-run.js';

export function FirstRun(): ReactNode {
  const queryClient = useQueryClient();
  useEffect(() => {
    let cancelled = false;
    void runFirstRunSeed().then(({ seeded }) => {
      if (cancelled || !seeded) return;
      void queryClient.invalidateQueries({ queryKey: ['tasks'] });
    });
    return () => {
      cancelled = true;
    };
  }, [queryClient]);
  return null;
}
