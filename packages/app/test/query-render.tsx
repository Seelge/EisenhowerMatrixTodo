/**
 * Render helper for tests that need a fresh `QueryClientProvider`.
 *
 * Each call constructs a new `QueryClient` so tests don't see stale
 * cache entries from prior tests. Retries are disabled so a failing
 * mutation surfaces synchronously.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { renderToContainer, type RenderHandle } from './render.ts';

export interface QueryRenderHandle extends RenderHandle {
  client: QueryClient;
}

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, refetchOnWindowFocus: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

export async function renderWithQueryClient(node: ReactNode): Promise<QueryRenderHandle> {
  const client = createTestQueryClient();
  const { container, unmount } = await renderToContainer(
    <QueryClientProvider client={client}>{node}</QueryClientProvider>,
  );
  return {
    container,
    client,
    unmount: () => {
      unmount();
      client.clear();
    },
  };
}
