/**
 * Top-level ErrorBoundary. Catches render-time errors anywhere below it
 * and shows the design-system `ErrorBanner` with a Reload action that
 * does a full page reload (the simplest way to reset the entire React
 * tree, query cache, and any module-level state at this stage). Phase 5+
 * may introduce finer-grained boundaries that reset just a subtree.
 */
import { ErrorBanner } from '@emt/design-system';
import { Component, type ErrorInfo, type ReactNode } from 'react';

import { useT } from './i18n/provider.js';

export interface ErrorBoundaryProps {
  children?: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    this.props.onError?.(error, info);
  }

  override render(): ReactNode {
    if (this.state.error !== null) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}

function ErrorFallback(): ReactNode {
  const t = useT();
  return (
    <ErrorBanner
      message={t('app.error.fallback.message')}
      retryLabel={t('app.error.fallback.retry')}
      onRetry={() => {
        if (typeof window !== 'undefined') window.location.reload();
      }}
    />
  );
}
