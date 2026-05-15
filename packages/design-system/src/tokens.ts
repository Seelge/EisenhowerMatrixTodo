/**
 * Design tokens. Single source of truth for the design system.
 *
 * The matching CSS custom properties live in `tokens.css` and are
 * mirrored 1:1 by hand. Keep them in sync; consider generating one
 * from the other once the surface stabilizes.
 *
 * Values follow `design-input.md` § UI Design (palette, M3 behaviors).
 * The first release is dark-mode only; light mode lands later.
 */

export const tokens = {
  color: {
    /** App background (near-black with a slight blue cast). */
    bg: '#0A0E14',
    /** Cards, sheets, panels. */
    surface: '#121821',
    /** Elevated surfaces (modal, focused panel). */
    surfaceElevated: '#1A2230',
    /** Primary text. */
    textPrimary: '#E6EDF3',
    /** Secondary text, muted captions. */
    textSecondary: '#8B96A5',
    /** Focus rings, active states, primary accent. */
    accent: '#3DF1FF',
    /** Q1 — Important + Urgent (Do). */
    q1: '#FF3370',
    /** Q2 — Important, not Urgent (Schedule). */
    q2: '#3DF1FF',
    /** Q3 — Urgent, not Important (Delegate). */
    q3: '#FFB800',
    /** Q4 — Neither (Delete). */
    q4: '#A7B4C4',
    /** Error / destructive — shares Q1 hue. */
    error: '#FF3370',
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
  /** Per-quadrant glow box-shadows. Outer halo + soft inner shadow. */
  glow: {
    q1: '0 0 20px rgba(255, 51, 112, 0.6), inset 0 0 8px rgba(255, 51, 112, 0.25)',
    q2: '0 0 20px rgba(61, 241, 255, 0.6), inset 0 0 8px rgba(61, 241, 255, 0.25)',
    q3: '0 0 20px rgba(255, 184, 0, 0.6), inset 0 0 8px rgba(255, 184, 0, 0.25)',
    q4: '0 0 20px rgba(167, 180, 196, 0.6), inset 0 0 8px rgba(167, 180, 196, 0.25)',
    accent: '0 0 16px rgba(61, 241, 255, 0.5), inset 0 0 6px rgba(61, 241, 255, 0.2)',
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
