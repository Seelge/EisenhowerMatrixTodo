import { useEffect, useMemo, type CSSProperties, type ReactNode } from 'react';

import { COMPONENT_CSS } from './components.js';
import { RESET_CSS } from './reset.js';
import { tokens } from './tokens.js';

const STYLE_ELEMENT_ID = 'emt-theme-reset';
let mountCount = 0;
let styleElement: HTMLStyleElement | null = null;

function attachReset(): void {
  if (typeof document === 'undefined') return;
  mountCount += 1;
  if (mountCount > 1) return;
  styleElement = document.createElement('style');
  styleElement.id = STYLE_ELEMENT_ID;
  // Reset first, then component layer — order lets components override the
  // reset where needed (e.g., the reset's bare `button` rule).
  styleElement.textContent = `${RESET_CSS}\n${COMPONENT_CSS}`;
  document.head.append(styleElement);
}

function detachReset(): void {
  if (typeof document === 'undefined') return;
  mountCount = Math.max(0, mountCount - 1);
  if (mountCount > 0) return;
  styleElement?.remove();
  styleElement = null;
}

function buildThemeVariables(): CSSProperties {
  const vars: Record<string, string | number> = {
    colorScheme: 'dark',
    '--color-bg': tokens.color.bg,
    '--color-surface': tokens.color.surface,
    '--color-surface-elevated': tokens.color.surfaceElevated,
    '--color-text-primary': tokens.color.textPrimary,
    '--color-text-secondary': tokens.color.textSecondary,
    '--color-accent': tokens.color.accent,
    '--color-q1': tokens.color.q1,
    '--color-q2': tokens.color.q2,
    '--color-q3': tokens.color.q3,
    '--color-q4': tokens.color.q4,
    '--color-error': tokens.color.error,

    '--space-xs': tokens.space.xs,
    '--space-sm': tokens.space.sm,
    '--space-md': tokens.space.md,
    '--space-lg': tokens.space.lg,
    '--space-xl': tokens.space.xl,
    '--space-2xl': tokens.space['2xl'],
    '--space-3xl': tokens.space['3xl'],

    '--radius-sm': tokens.radius.sm,
    '--radius-md': tokens.radius.md,
    '--radius-lg': tokens.radius.lg,
    '--radius-pill': tokens.radius.pill,

    '--font-family-sans': tokens.font.family.sans,
    '--font-family-mono': tokens.font.family.mono,
    '--font-size-xs': tokens.font.size.xs,
    '--font-size-sm': tokens.font.size.sm,
    '--font-size-md': tokens.font.size.md,
    '--font-size-lg': tokens.font.size.lg,
    '--font-size-xl': tokens.font.size.xl,
    '--font-size-display': tokens.font.size.display,
    '--font-weight-regular': tokens.font.weight.regular,
    '--font-weight-medium': tokens.font.weight.medium,
    '--font-weight-bold': tokens.font.weight.bold,
    '--line-height-tight': tokens.font.lineHeight.tight,
    '--line-height-normal': tokens.font.lineHeight.normal,
    '--line-height-loose': tokens.font.lineHeight.loose,

    '--motion-duration-short': tokens.motion.duration.short,
    '--motion-duration-medium': tokens.motion.duration.medium,
    '--motion-duration-long': tokens.motion.duration.long,
    '--motion-easing-standard': tokens.motion.easing.standard,
    '--motion-easing-emphasized': tokens.motion.easing.emphasized,
    '--motion-easing-decelerated': tokens.motion.easing.decelerated,
    '--motion-easing-accelerated': tokens.motion.easing.accelerated,

    '--glow-q1': tokens.glow.q1,
    '--glow-q2': tokens.glow.q2,
    '--glow-q3': tokens.glow.q3,
    '--glow-q4': tokens.glow.q4,
    '--glow-accent': tokens.glow.accent,

    '--layer-base': tokens.layer.base,
    '--layer-quadrant-edge': tokens.layer.quadrantEdge,
    '--layer-fab': tokens.layer.fab,
    '--layer-sheet': tokens.layer.sheet,
    '--layer-modal': tokens.layer.modal,
    '--layer-snackbar': tokens.layer.snackbar,
    '--layer-tooltip': tokens.layer.tooltip,
  };
  return vars as CSSProperties;
}

export interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps): ReactNode {
  const style = useMemo(() => buildThemeVariables(), []);
  useEffect(() => {
    attachReset();
    return detachReset;
  }, []);
  return (
    <div data-emt-theme="dark" style={style}>
      {children}
    </div>
  );
}
