/**
 * User-default prefs (Step 9.5).
 *
 * Two values live here today:
 *  - `newTaskQuadrant`: which cell the FAB / quick composer pre-fills
 *    when "Add task" fires from view1. (View2's FAB always lands in
 *    the focused quadrant — the default doesn't override that.)
 *  - `sortBy`: the secondary sort key applied by `sortTasks` when a
 *    task has no manual rank — defaults to `'dueDate'` to match the
 *    Step 5.7 contract.
 *
 * Both persist to the shared meta IDB store under
 * `defaults:newTaskQuadrant` and `defaults:sortBy` so a reload picks
 * up the saved value. The store mirrors them in React state so the
 * matrix / FAB re-render the instant the panel changes them.
 */
import type { Quadrant } from '@emt/backend-core';
import { create } from 'zustand';

import { getBackends } from './backends.js';

const KEYS = {
  newTaskQuadrant: 'defaults:newTaskQuadrant',
  sortBy: 'defaults:sortBy',
} as const;

export type SortKey = 'dueDate' | 'createdAt' | 'title';

const QUADRANTS = new Set<Quadrant>(['Q1', 'Q2', 'Q3', 'Q4']);
const SORT_KEYS = new Set<SortKey>(['dueDate', 'createdAt', 'title']);

function asQuadrant(v: string | undefined): Quadrant | undefined {
  return v !== undefined && QUADRANTS.has(v as Quadrant) ? (v as Quadrant) : undefined;
}

function asSortKey(v: string | undefined): SortKey | undefined {
  return v !== undefined && SORT_KEYS.has(v as SortKey) ? (v as SortKey) : undefined;
}

interface DefaultsStore {
  loaded: boolean;
  newTaskQuadrant: Quadrant;
  sortBy: SortKey;
  load: () => Promise<void>;
  setNewTaskQuadrant: (q: Quadrant) => Promise<void>;
  setSortBy: (s: SortKey) => Promise<void>;
}

export const useDefaultsStore = create<DefaultsStore>((set, get) => ({
  loaded: false,
  newTaskQuadrant: 'Q1',
  sortBy: 'dueDate',
  load: async () => {
    if (get().loaded) return;
    const { meta } = await getBackends();
    const q = asQuadrant(await meta.get(KEYS.newTaskQuadrant));
    const s = asSortKey(await meta.get(KEYS.sortBy));
    set({
      loaded: true,
      newTaskQuadrant: q ?? 'Q1',
      sortBy: s ?? 'dueDate',
    });
  },
  setNewTaskQuadrant: async (q) => {
    const { meta } = await getBackends();
    await meta.set(KEYS.newTaskQuadrant, q);
    set({ newTaskQuadrant: q });
  },
  setSortBy: async (s) => {
    const { meta } = await getBackends();
    await meta.set(KEYS.sortBy, s);
    set({ sortBy: s });
  },
}));

export function useNewTaskQuadrant(): Quadrant {
  return useDefaultsStore((s) => s.newTaskQuadrant);
}

export function useSortBy(): SortKey {
  return useDefaultsStore((s) => s.sortBy);
}
