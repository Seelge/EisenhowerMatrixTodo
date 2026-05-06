/**
 * ErrorBanner — surfaces a recoverable error to the user.
 *
 * `role="alert"` so the message is announced by assistive tech the
 * moment it appears. When `onRetry` is provided, a tonal Retry button
 * is rendered alongside; the label is overridable via `retryLabel` for
 * i18n. Background is the error color tinted into the underlying
 * surface so it doesn't feel destructive.
 */
import type { ReactNode } from 'react';

import { Button } from './Button.js';

export interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorBanner({
  message,
  onRetry,
  retryLabel = 'Retry',
}: ErrorBannerProps): ReactNode {
  return (
    <div role="alert" className="emt-error-banner">
      <span className="emt-error-banner__message">{message}</span>
      {onRetry && (
        <Button variant="tonal" onClick={onRetry}>
          {retryLabel}
        </Button>
      )}
    </div>
  );
}
