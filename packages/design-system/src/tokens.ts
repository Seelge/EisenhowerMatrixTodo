/**
 * Design tokens. Single source of truth for the design system.
 *
 * The matching CSS custom properties live in `tokens.css` and are
 * mirrored 1:1 by hand. Keep them in sync; consider generating one
 * from the other once the surface stabilizes.
 *
 * Values follow `design-input.md` § UI Design (palette, M3 behaviors).
 * Dark is the default; light palette (Phase 22) uses deeper hues so
 * quadrant borders stay AA on pale surfaces.
 */

export type ColorScheme = 'dark' | 'light';

/** Shared surface/text/accent/quadrant colours for one scheme. */
export interface ColorPalette {
  readonly bg: string;
  readonly surface: string;
  readonly surfaceElevated: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly accent: string;
  readonly q1: string;
  readonly q2: string;
  readonly q3: string;
  readonly q4: string;
  readonly error: string;
}

export const darkColors: ColorPalette = {
  bg: '#0A0E14',
  surface: '#121821',
  surfaceElevated: '#1A2230',
  textPrimary: '#E6EDF3',
  textSecondary: '#8B96A5',
  accent: '#3DF1FF',
  q1: '#FF3370',
  q2: '#3DF1FF',
  q3: '#FFB800',
  q4: '#A7B4C4',
  error: '#FF3370',
};

/** Light surfaces; quadrant hues darkened for AA contrast on white. */
export const lightColors: ColorPalette = {
  bg: '#F4F6F8',
  surface: '#FFFFFF',
  surfaceElevated: '#E8ECF1',
  textPrimary: '#0F1419',
  textSecondary: '#5C6B7A',
  accent: '#007A8A',
  q1: '#C01048',
  q2: '#007A8A',
  q3: '#9A6B00',
  q4: '#5C6B7A',
  error: '#C01048',
};

export function colorsForScheme(scheme: ColorScheme): ColorPalette {
  return scheme === 'light' ? lightColors : darkColors;
}

export const tokens = {
  color: {
    ...darkColors,
  },
  space: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
  },
  radius: {
    sm: '4px',
    md: '8px',
    lg: '16px',
    pill: '9999px',
  },
  font: {
    family: {
      sans: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      mono: 'ui-monospace, "SFMono-Regular", "Cascadia Mono", Menlo, monospace',
    },
    size: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px',
      display: '32px',
    },
    weight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      loose: 1.6,
    },
  },
  motion: {
    /** Animation durations. M3-style: short for ripples, medium for sheets, long for screen transitions. */
    duration: {
      short: '120ms',
      medium: '220ms',
      long: '320ms',
    },
    /** Easing curves. `standard` for most UI; `emphasized` for screen / zoom transitions. */
    easing: {
      standard: 'cubic-bezier(0.2, 0, 0, 1)',
      emphasized: 'cubic-bezier(0.3, 0, 0, 1)',
      decelerated: 'cubic-bezier(0, 0, 0, 1)',
      accelerated: 'cubic-bezier(0.3, 0, 1, 1)',
    },
  },
  /**
   * Neon border colours for the Glow frame / selected chrome.
   * Match the quadrant palette 1:1; CSS aliases these to
   * `var(--color-q*)` so Appearance overrides stay coherent.
   */
  glow: {
    q1: '#FF3370',
    q2: '#3DF1FF',
    q3: '#FFB800',
    q4: '#A7B4C4',
    accent: '#3DF1FF',
  },
  /** Z-index layers. */
  layer: {
    base: 0,
    quadrantEdge: 10,
    fab: 100,
    sheet: 200,
    modal: 300,
    snackbar: 400,
    tooltip: 500,
  },
} as const;

export type Tokens = typeof tokens;
export type ColorToken = keyof Tokens['color'];
export type SpaceToken = keyof Tokens['space'];
export type RadiusToken = keyof Tokens['radius'];
export type GlowToken = keyof Tokens['glow'];
export type Quadrant = 'q1' | 'q2' | 'q3' | 'q4';
