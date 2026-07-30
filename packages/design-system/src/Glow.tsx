/**
 * Neon border frame primitive (formerly a soft glow halo).
 *
 * Renders a div with a 1px solid border in the per-quadrant neon
 * colour. Used by view1 quadrant cells and view2's focused frame.
 * Pulls from CSS variables (`--glow-*`, aliased to `--color-*`) so
 * AppearancePanel overrides re-skin without prop changes.
 *
 * Forwards its `ref` so callers (e.g. dnd-kit's `useDroppable`) can
 * attach measurement / pointer hooks without wrapping the element.
 */
import { forwardRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

import type { Quadrant } from './tokens.js';

export type GlowColor = Quadrant | 'accent';

export interface GlowProps extends Omit<HTMLAttributes<HTMLDivElement>, 'color'> {
  color: GlowColor;
  children?: ReactNode;
}

export const Glow = forwardRef<HTMLDivElement, GlowProps>(function Glow(
  { color, children, style, ...rest },
  ref,
) {
  // Set border pieces separately — happy-dom (and some browsers) drop
  // `var(...)` from the `border` shorthand when reading `style.border`.
  const composed: CSSProperties = {
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: `var(--glow-${color})`,
    borderRadius: 'var(--radius-md)',
    boxShadow: 'none',
    ...style,
  };
  return (
    <div ref={ref} data-emt-glow={color} style={composed} {...rest}>
      {children}
    </div>
  );
});
