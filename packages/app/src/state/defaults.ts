/**
 * User-default prefs (Step 9.5 + Phase 16 + Phase 25).
 *
 * Values live here today:
 *  - `newTaskQuadrant`: which cell the FAB / quick composer pre-fills
 *    when "Add task" fires from view1. (View2's FAB always lands in
 *    the focused quadrant — the default doesn't override that.)
 *  - `sortBy`: the secondary sort key applied by `sortTasks` when a
 *    task has no manual rank — defaults to `'dueDate'` to match the
 *    Step 5.7 contract.
 *  - `hideCompleted`: when true (default), matrix cells and view2 omit
 *    `status === 'done'` tasks. Search still includes them.
 *  - `defaultPriority`: priority pre-selected in the quick composer.
 *
 * Prefs persist to the shared meta IDB store so a reload picks up the
 * saved value. The store mirrors them in React state so the matrix /
 * FAB re-render the instant the panel changes them.
 */
import type { Priority, Quadrant } from '@emt/backend-core';
import { create } from 'zustand';

import { getBackends } from './backends.js';

const KEYS = {
  newTaskQuadrant: 'defaults:newTaskQuadrant',
  sortBy: 'defaults:sortBy',
  hideCompleted: 'defaults:hideCompleted',
  defaultPriority: 'defaults:defaultPriority',
} as const;

export type SortKey = 'dueDate' | 'createdAt' | 'title';

const QUADRANTS = new Set<Quadrant>(['Q1', 'Q2', 'Q3', 'Q4']);
const SORT_KEYS = new Set<SortKey>(['dueDate', 'createdAt', 'title']);
const PRIORITIES = new Set<Priority>(['none', 'low', 'normal', 'high']);

function asQuadrant(v: string | undefined): Quadrant | undefined {
  return v !== undefined && QUADRANTS.has(v as Quadrant) ? (v as Quadrant) : undefined;
}

function asSortKey(v: string | undefined): SortKey | undefined {
  return v !== undefined && SORT_KEYS.has(v as SortKey) ? (v as SortKey) : undefined;
}

function asPriority(v: string | undefined): Priority | undefined {
  return v !== undefined && PRIORITIES.has(v as Priority) ? (v as Priority) : undefined;
}

function asBool(v: string | undefined): boolean | undefined {
  if (v === 'true') return true;
  if (v === 'false') return false;
  return undefined;
}

interface DefaultsStore {
  loaded: boolean;
  newTaskQuadrant: Quadrant;
  sortBy: SortKey;
  hideCompleted: boolean;
  defaultPriority: Priority;
  load: () => Promise<void>;
  setNewTaskQuadrant: (q: Quadrant) => Promise<void>;
  setSortBy: (s: SortKey) => Promise<void>;
  setHideCompleted: (v: boolean) => Promise<void>;
  setDefaultPriority: (p: Priority) => Promise<void>;
}

export const useDefaultsStore = create<DefaultsStore>((set, get) => ({
  loaded: false,
  newTaskQuadrant: 'Q1',
  sortBy: 'dueDate',
  hideCompleted: true,
  defaultPriority: 'normal',
  load: async () => {
    if (get().loaded) return;
    const { meta } = await getBackends();
    const q = asQuadrant(await meta.get(KEYS.newTaskQuadrant));
    const s = asSortKey(await meta.get(KEYS.sortBy));
    const hide = asBool(await meta.get(KEYS.hideCompleted));
    const p = asPriority(await meta.get(KEYS.defaultPriority));
    set({
      loaded: true,
      newTaskQuadrant: q ?? 'Q1',
      sortBy: s ?? 'dueDate',
      hideCompleted: hide ?? true,
      defaultPriority: p ?? 'normal',
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
  setHideCompleted: async (v) => {
    const { meta } = await getBackends();
    await meta.set(KEYS.hideCompleted, v ? 'true' : 'false');
    set({ hideCompleted: v });
  },
  setDefaultPriority: async (p) => {
    const { meta } = await getBackends();
    await meta.set(KEYS.defaultPriority, p);
    set({ defaultPriority: p });
  },
}));

export function useNewTaskQuadrant(): Quadrant {
  return useDefaultsStore((s) => s.newTaskQuadrant);
}

export function useSortBy(): SortKey {
  return useDefaultsStore((s) => s.sortBy);
}

export function useHideCompleted(): boolean {
  return useDefaultsStore((s) => s.hideCompleted);
}

export function useDefaultPriority(): Priority {
  return useDefaultsStore((s) => s.defaultPriority);
}
