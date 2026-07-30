/**
 * Cross-tree conflict pending count (TODO 3).
 *
 * `useConflictResolver` owns the queue; the shell sync chip needs to
 * read the length without mounting the modal host. This tiny store is
 * the bridge — written by the resolver, read by `SyncStatusChip`.
 */
import { create } from 'zustand';

interface ConflictStatusStore {
  readonly pendingCount: number;
  setPendingCount: (n: number) => void;
}

export const useConflictStatusStore = create<ConflictStatusStore>((set) => ({
  pendingCount: 0,
  setPendingCount: (pendingCount) => set({ pendingCount }),
}));

export function useConflictPendingCount(): number {
  return useConflictStatusStore((s) => s.pendingCount);
}
