/**
 * Appearance prefs (Step 9.4 / Phase 22).
 *
 * Per-quadrant color overrides and color scheme live in the shared
 * `meta` IDB store under `appearance:q{n}` and `appearance:scheme`.
 * The Zustand store mirrors those values so React subscribers re-render
 * on update — the meta write is fire-and-forget; reads only happen
 * at bootstrap.
 *
 * Cleared overrides delete the meta key (rather than writing the
 * design-system default) so future token tweaks propagate to users
 * who never customised that quadrant.
 */
import type { ColorScheme, QuadrantColorOverrides } from '@emt/design-system';
import { create } from 'zustand';

import { getBackends } from './backends.js';

const KEYS = {
  q1: 'appearance:q1',
  q2: 'appearance:q2',
  q3: 'appearance:q3',
  q4: 'appearance:q4',
  scheme: 'appearance:scheme',
} as const;

export type QuadrantKey = keyof QuadrantColorOverrides;

interface AppearanceStore {
  loaded: boolean;
  scheme: ColorScheme;
  overrides: QuadrantColorOverrides;
  load: () => Promise<void>;
  setScheme: (scheme: ColorScheme) => Promise<void>;
  setColor: (key: QuadrantKey, value: string) => Promise<void>;
  clearColor: (key: QuadrantKey) => Promise<void>;
}

function parseScheme(raw: string | undefined): ColorScheme {
  return raw === 'light' ? 'light' : 'dark';
}

export const useAppearanceStore = create<AppearanceStore>((set, get) => ({
  loaded: false,
  scheme: 'dark',
  overrides: {},
  load: async () => {
    if (get().loaded) return;
    const { meta } = await getBackends();
    const next: QuadrantColorOverrides = {};
    for (const key of ['q1', 'q2', 'q3', 'q4'] as const) {
      const v = await meta.get(KEYS[key]);
      if (v !== undefined) next[key] = v;
    }
    const schemeRaw = await meta.get(KEYS.scheme);
    set({ loaded: true, overrides: next, scheme: parseScheme(schemeRaw) });
  },
  setScheme: async (scheme) => {
    const { meta } = await getBackends();
    await meta.set(KEYS.scheme, scheme);
    set({ scheme });
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

export function useColorScheme(): ColorScheme {
  return useAppearanceStore((s) => s.scheme);
}
