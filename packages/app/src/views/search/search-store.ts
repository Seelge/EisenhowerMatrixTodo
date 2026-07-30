/**
 * Ephemeral search UI state (TODO 6). Not persisted — search is a
 * session affordance, not a route. Match ids drive the matrix/quadrant
 * card highlight so results stay visible under the overlay.
 */
import type { TaskId } from '@emt/backend-core';
import { create } from 'zustand';

export interface SearchState {
  readonly open: boolean;
  readonly query: string;
  /** Task ids currently matching `query` — empty when closed or no hits. */
  readonly matchIds: ReadonlySet<TaskId>;
  openSearch: () => void;
  closeSearch: () => void;
  setQuery: (query: string) => void;
  setMatchIds: (ids: ReadonlySet<TaskId>) => void;
}

export const useSearchStore = create<SearchState>((set) => ({
  open: false,
  query: '',
  matchIds: new Set(),
  openSearch: () => set({ open: true }),
  closeSearch: () => set({ open: false, query: '', matchIds: new Set() }),
  setQuery: (query) => set({ query }),
  setMatchIds: (matchIds) => set({ matchIds }),
}));

export function useSearchOpen(): boolean {
  return useSearchStore((s) => s.open);
}

export function useSearchMatchIds(): ReadonlySet<TaskId> {
  return useSearchStore((s) => s.matchIds);
}
