/**
 * SyncStatusChip — shell indicator for connectivity + pending conflicts
 * (design-input-new TODO 3).
 *
 * v0.1 ships only the local IndexedDB backend, so there is no remote
 * outbox to surface. The chip still earns its keep:
 *   - **Offline** — browser reports `navigator.onLine === false`.
 *   - **N conflicts** — queue depth from the conflict resolver; tap is
 *     a no-op because the modal already auto-opens when the user is idle.
 *   - **Local** — calm default when online with an empty conflict queue.
 *
 * Anchored top-left on view1/view2 via call-site classes.
 */
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useConflictPendingCount } from '../conflict/conflict-status.js';

import { useOnline } from './online.js';

import './sync-status.css';

export interface SyncStatusChipProps {
  className?: string;
}

export function SyncStatusChip({ className }: SyncStatusChipProps): ReactNode {
  const t = useT();
  const online = useOnline();
  const conflicts = useConflictPendingCount();

  let kind: 'offline' | 'conflict' | 'local';
  let label: string;
  if (!online) {
    kind = 'offline';
    label = t('app.sync.offline');
  } else if (conflicts > 0) {
    kind = 'conflict';
    label =
      conflicts === 1
        ? t('app.sync.conflictOne')
        : t('app.sync.conflictMany').replace('{count}', String(conflicts));
  } else {
    kind = 'local';
    label = t('app.sync.local');
  }

  const classes = ['emt-sync-chip', `emt-sync-chip--${kind}`, className]
    .filter((c): c is string => c !== undefined && c !== '')
    .join(' ');

  return (
    <div
      className={classes}
      data-sync-status={kind}
      data-conflict-count={conflicts}
      role="status"
      aria-live="polite"
    >
      <span className="emt-sync-chip__dot" aria-hidden="true" />
      <span className="emt-sync-chip__label">{label}</span>
    </div>
  );
}
