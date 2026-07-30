/**
 * Active tag filter for matrix / quadrant lists (Phase 14).
 *
 * Ephemeral — not routed. Cleared on reload. Filtering is client-side
 * over already-loaded tasks; nothing leaves the device.
 */
import { create } from 'zustand';

export interface TagFilterStore {
  readonly activeTag: string | undefined;
  setActiveTag: (tag: string | undefined) => void;
  toggleTag: (tag: string) => void;
  clear: () => void;
}

export const useTagFilterStore = create<TagFilterStore>((set, get) => ({
  activeTag: undefined,
  setActiveTag: (activeTag) => set({ activeTag }),
  toggleTag: (tag) => {
    const current = get().activeTag;
    if (current !== undefined && current.toLowerCase() === tag.toLowerCase()) {
      set({ activeTag: undefined });
    } else {
      set({ activeTag: tag });
    }
  },
  clear: () => set({ activeTag: undefined }),
}));

export function useActiveTagFilter(): string | undefined {
  return useTagFilterStore((s) => s.activeTag);
}
