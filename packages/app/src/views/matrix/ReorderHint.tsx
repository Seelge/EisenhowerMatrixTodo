/**
 * One-shot "drag to reorder" nudge (design-input-new TODO 13).
 *
 * Shown the first time a cell/quadrant has more than one task and no
 * manual ranks yet — once the user has reordered (or dismissed), the
 * sessionStorage flag stays set for the rest of the tab lifetime so the
 * hint never reappears mid-session.
 */
import { useCallback, useState, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';

const STORAGE_KEY = 'emt:reorder-hint-dismissed';

function isDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

function markDismissed(): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1');
  } catch {
    // Private mode / quota — treat as dismissed for this mount.
  }
}

export interface ReorderHintProps {
  /** Whether the parent list currently has ≥ 2 tasks. */
  visible: boolean;
}

export function ReorderHint({ visible }: ReorderHintProps): ReactNode {
  const t = useT();
  const [dismissed, setDismissed] = useState(isDismissed);

  const onDismiss = useCallback(() => {
    markDismissed();
    setDismissed(true);
  }, []);

  if (!visible || dismissed) return null;

  return (
    <div className="emt-reorder-hint" data-reorder-hint role="status">
      <span className="emt-reorder-hint__text">{t('app.matrix.reorderHint')}</span>
      <button
        type="button"
        className="emt-reorder-hint__dismiss"
        onClick={onDismiss}
        aria-label={t('app.matrix.reorderHint.dismiss')}
      >
        ×
      </button>
    </div>
  );
}

/** Test / session reset seam. */
export function __resetReorderHintForTesting(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
