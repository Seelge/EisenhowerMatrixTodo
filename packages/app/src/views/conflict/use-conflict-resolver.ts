/**
 * Conflict-resolver queue hook (Step 10.2).
 *
 * Wraps a FIFO queue of pending conflicts behind a `ConflictResolver`
 * shape that the sync engine can be registered against. Each call to
 * the returned `resolver` enqueues a conflict and returns a promise
 * that resolves once the user picks a side; the modal host renders
 * `current` and calls `resolveCurrent` when the user clicks
 * Keep-Local / Keep-Remote. Conflicts arriving while the modal is up
 * queue and are presented in order.
 */
import type { ConflictRecord, ConflictResolver } from '@emt/backend-core';
import { useCallback, useState } from 'react';

interface Pending {
  readonly record: ConflictRecord;
  readonly resolve: (choice: 'local' | 'remote') => void;
}

export interface UseConflictResolverResult {
  /** Head of the queue, or `undefined` when no conflicts are pending. */
  readonly current: ConflictRecord | undefined;
  /** Stable resolver to register on a `SyncEngine`. */
  readonly resolver: ConflictResolver;
  /** Resolves the head conflict with the user's choice and advances. */
  readonly resolveCurrent: (choice: 'local' | 'remote') => void;
}

export function useConflictResolver(): UseConflictResolverResult {
  const [queue, setQueue] = useState<readonly Pending[]>([]);

  const resolver = useCallback<ConflictResolver>(
    (record) =>
      new Promise<'local' | 'remote'>((resolve) => {
        setQueue((q) => [...q, { record, resolve }]);
      }),
    [],
  );

  const resolveCurrent = useCallback((choice: 'local' | 'remote') => {
    setQueue((q) => {
      const head = q[0];
      if (head === undefined) return q;
      head.resolve(choice);
      return q.slice(1);
    });
  }, []);

  return { current: queue[0]?.record, resolver, resolveCurrent };
}
