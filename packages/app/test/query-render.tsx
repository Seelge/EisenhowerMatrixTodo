/**
 * Render helper for tests that need a fresh `QueryClientProvider`.
 *
 * Each call constructs a new `QueryClient` so tests don't see stale
 * cache entries from prior tests. Retries are disabled so a failing
 * mutation surfaces synchronously.
 */
import { SnackbarProvider } from '@emt/design-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { useComposerStore } from '../src/views/matrix/composer-store.ts';

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
  // Shared zustand store — reset so parallel files don't leak open state.
  useComposerStore.setState({ open: false });
  const client = createTestQueryClient();
  // Match App shell: Snackbar + I18n (useUpdateTask surfaces save errors).
  const { container, unmount } = await renderToContainer(
    <QueryClientProvider client={client}>
      <SnackbarProvider>
        <I18nProvider>{node}</I18nProvider>
      </SnackbarProvider>
    </QueryClientProvider>,
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
