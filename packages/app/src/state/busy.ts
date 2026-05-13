/**
 * User-busy detector (Step 10.3).
 *
 * Tracks whether the user is mid-action (currently: dragging a card
 * or composing a new task). The conflict-resolver host reads this
 * flag to decide whether the modal should appear or stay queued —
 * a conflict that arrives during a drag must not interrupt; once
 * the drag completes and `isDragging` flips back to `false`, the
 * host picks the queue back up and presents the modal.
 *
 * State only — no persistence. The flags are reset on reload.
 */
import { create } from 'zustand';

interface BusyStore {
  isDragging: boolean;
  isComposing: boolean;
  setDragging: (v: boolean) => void;
  setComposing: (v: boolean) => void;
}

export const useBusyStore = create<BusyStore>((set) => ({
  isDragging: false,
  isComposing: false,
  setDragging: (v) => {
    set({ isDragging: v });
  },
  setComposing: (v) => {
    set({ isComposing: v });
  },
}));

/** True when any tracked user action is in flight. */
export function useIsBusy(): boolean {
  return useBusyStore((s) => s.isDragging || s.isComposing);
}
