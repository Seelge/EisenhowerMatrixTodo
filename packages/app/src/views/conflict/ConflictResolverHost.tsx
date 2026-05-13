/**
 * ConflictResolverHost — bridges the sync engine's `ConflictResolver`
 * contract to the user-facing `ConflictModal` (Step 10.2).
 *
 * On mount, the host installs a queue-backed resolver on the sync
 * engine via `setConflictResolver`. When the engine reports a
 * conflict, the modal opens with the local/remote diff; the user's
 * choice resolves the in-flight promise back to the engine, which
 * then writes the chosen side and resumes.
 *
 * Multiple conflicts arriving in quick succession queue and are
 * presented one at a time (see `useConflictResolver`).
 *
 * Step 10.3: if the user is mid-action (drag, composing) when a
 * conflict arrives, the queue still accepts it but the modal stays
 * hidden until `useIsBusy()` flips back to `false`. This way an
 * incoming sync never interrupts a drag — the modal pops the moment
 * the user releases.
 *
 * The `syncEngine` prop exists for tests — production mounts the
 * host without it and the global engine from `getBackends()` is
 * resolved asynchronously on first effect.
 */
import type { SyncEngine } from '@emt/backend-core';
import { useEffect, type ReactNode } from 'react';

import { getBackends } from '../../state/backends.js';
import { useIsBusy } from '../../state/busy.js';

import { ConflictModal } from './ConflictModal.js';
import { useConflictResolver } from './use-conflict-resolver.js';

export interface ConflictResolverHostProps {
  /** Test seam — defaults to the app's global sync engine. */
  readonly syncEngine?: SyncEngine;
}

export function ConflictResolverHost({ syncEngine }: ConflictResolverHostProps = {}): ReactNode {
  const { current, resolver, resolveCurrent } = useConflictResolver();
  const isBusy = useIsBusy();

  useEffect(() => {
    if (syncEngine !== undefined) {
      syncEngine.setConflictResolver(resolver);
      return;
    }
    let cancelled = false;
    void getBackends().then((b) => {
      if (cancelled) return;
      b.syncEngine.setConflictResolver(resolver);
    });
    return () => {
      cancelled = true;
    };
  }, [syncEngine, resolver]);

  return (
    <ConflictModal
      open={current !== undefined && !isBusy}
      record={current}
      onResolve={resolveCurrent}
    />
  );
}
