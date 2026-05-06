/**
 * Snackbar — visual primitive. The provider/hook (`SnackbarProvider`,
 * `useSnackbar`) own queue and timer state; this component just renders
 * the active notification.
 *
 * `role="status"` + `aria-live="polite"` so screen readers announce the
 * message without interrupting the user. The Undo button (when present)
 * is rendered as a `Button variant="text"` so it inherits the accent
 * color and hover state from the existing button stylesheet.
 */
import type { ReactNode } from 'react';

import { Button } from './Button.js';

export interface SnackbarProps {
  message: string;
  /** When provided, an "Undo" CTA is rendered. */
  onUndo?: (() => void) | undefined;
  /** Override the default "Undo" label (e.g., for i18n). */
  undoLabel?: string | undefined;
}

export function Snackbar({ message, onUndo, undoLabel = 'Undo' }: SnackbarProps): ReactNode {
  return (
    <div role="status" aria-live="polite" className="emt-snackbar">
      <span className="emt-snackbar__message">{message}</span>
      {onUndo && (
        <Button variant="text" onClick={onUndo}>
          {undoLabel}
        </Button>
      )}
    </div>
  );
}
