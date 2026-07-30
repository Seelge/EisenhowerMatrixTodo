/**
 * Root composition. Mounts the provider chain spelled out in plan
 * step 4.1 so views can rely on theme tokens, the query client, the
 * router, an error boundary, and the i18n translator without having
 * to wire any of them themselves.
 *
 * Order rationale:
 *  - ThemeProvider injects the global reset + tokens; everything
 *    rendered below it (including the error fallback) uses the dark
 *    palette.
 *  - QueryClientProvider wraps the router so route-driven query
 *    suspensions are retained across navigations.
 *  - Router projects the URL into ViewState (placeholder until 4.2).
 *  - ErrorBoundary sits inside the router so a thrown render error
 *    leaves the URL intact and the boundary can still navigate.
 *  - I18nProvider is the innermost provider — only views need it; the
 *    fallback uses the default translator from the context default.
 */
import { SnackbarProvider, ThemeProvider } from '@emt/design-system';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, type ReactNode } from 'react';

import { ErrorBoundary } from './ErrorBoundary.js';
import { I18nProvider } from './i18n/provider.js';
import { FirstRun } from './onboarding/FirstRun.js';
import { Router } from './routes/Router.js';
import { Routes } from './routes/Routes.js';
import { useAppearanceOverrides, useAppearanceStore, useColorScheme } from './state/appearance.js';
import { useDefaultsStore } from './state/defaults.js';
import { ConflictResolverHost } from './views/conflict/ConflictResolverHost.js';

export function App(): ReactNode {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: false, refetchOnWindowFocus: false },
        },
      }),
  );
  const overrides = useAppearanceOverrides();
  const colorScheme = useColorScheme();
  useEffect(() => {
    void useAppearanceStore.getState().load();
    void useDefaultsStore.getState().load();
  }, []);
  return (
    <ThemeProvider colorScheme={colorScheme} colorOverrides={overrides}>
      <QueryClientProvider client={queryClient}>
        <SnackbarProvider>
          <FirstRun />
          <Router>
            <ErrorBoundary>
              <I18nProvider>
                <Routes />
                <ConflictResolverHost />
              </I18nProvider>
            </ErrorBoundary>
          </Router>
        </SnackbarProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
