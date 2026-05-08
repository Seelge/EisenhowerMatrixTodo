/**
 * Decorative glow border primitive.
 *
 * Renders a div whose `box-shadow` is the per-quadrant glow token
 * (outer halo + inset shadow). Used by view1 quadrant cells, view2
 * single-quadrant frame, and the drag-target highlight in view2's
 * inter-quadrant move.
 *
 * Pulls from CSS variables so descendants of a future light-mode
 * `<ThemeProvider>` re-skin without prop changes.
 *
 * Forwards its `ref` so callers (e.g. dnd-kit's `useDroppable`) can
 * attach measurement / pointer hooks without having to wrap the element.
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
  const composed: CSSProperties = {
    boxShadow: `var(--glow-${color})`,
    borderRadius: 'var(--radius-md)',
    ...style,
  };
  return (
    <div ref={ref} data-emt-glow={color} style={composed} {...rest}>
      {children}
    </div>
  );
});
