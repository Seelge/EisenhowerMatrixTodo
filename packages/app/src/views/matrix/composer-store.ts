/**
 * Ephemeral QuickComposer open state (Phase 17). Shared so view1 and
 * view2 share one surface and the global `n` hotkey can open it without
 * prop-drilling through Routes.
 */
import { create } from 'zustand';

export interface ComposerState {
  readonly open: boolean;
  openComposer: () => void;
  closeComposer: () => void;
}

export const useComposerStore = create<ComposerState>((set) => ({
  open: false,
  openComposer: () => set({ open: true }),
  closeComposer: () => set({ open: false }),
}));

export function useComposerOpen(): boolean {
  return useComposerStore((s) => s.open);
}
