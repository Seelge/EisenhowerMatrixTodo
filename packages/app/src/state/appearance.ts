/**
 * Appearance prefs (Step 9.4).
 *
 * Per-quadrant color overrides live in the shared `meta` IDB store
 * (see `state/backends.ts`) under the keys `appearance:q{n}`. The
 * Zustand store mirrors those values so React subscribers re-render
 * on update — the meta write is fire-and-forget; reads only happen
 * at bootstrap.
 *
 * Cleared overrides delete the meta key (rather than writing the
 * design-system default) so future token tweaks propagate to users
 * who never customised that quadrant.
 */
import type { QuadrantColorOverrides } from '@emt/design-system';
import { create } from 'zustand';

import { getBackends } from './backends.js';

const KEYS = {
  q1: 'appearance:q1',
  q2: 'appearance:q2',
  q3: 'appearance:q3',
  q4: 'appearance:q4',
} as const;

export type QuadrantKey = keyof QuadrantColorOverrides;

interface AppearanceStore {
  loaded: boolean;
  overrides: QuadrantColorOverrides;
  load: () => Promise<void>;
  setColor: (key: QuadrantKey, value: string) => Promise<void>;
  clearColor: (key: QuadrantKey) => Promise<void>;
}

export const useAppearanceStore = create<AppearanceStore>((set, get) => ({
  loaded: false,
  overrides: {},
  load: async () => {
    if (get().loaded) return;
    const { meta } = await getBackends();
    const next: QuadrantColorOverrides = {};
    for (const key of ['q1', 'q2', 'q3', 'q4'] as const) {
      const v = await meta.get(KEYS[key]);
      if (v !== undefined) next[key] = v;
    }
    set({ loaded: true, overrides: next });
  },
  setColor: async (key, value) => {
    const { meta } = await getBackends();
    await meta.set(KEYS[key], value);
    set((s) => ({ overrides: { ...s.overrides, [key]: value } }));
  },
  clearColor: async (key) => {
    const { meta } = await getBackends();
    await meta.delete(KEYS[key]);
    set((s) => {
      const next = { ...s.overrides };
      delete next[key];
      return { overrides: next };
    });
  },
}));

/** Read-only hook returning the current overrides. */
export function useAppearanceOverrides(): QuadrantColorOverrides {
  return useAppearanceStore((s) => s.overrides);
}
