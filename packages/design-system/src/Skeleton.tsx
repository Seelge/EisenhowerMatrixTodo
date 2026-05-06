/**
 * Skeleton — animated placeholder block for loading states.
 *
 * Decorative only: `aria-hidden="true"` so screen readers don't announce
 * the placeholder. The shimmer is CSS-only and is suppressed under
 * `prefers-reduced-motion: reduce`.
 *
 * `width`/`height` accept either CSS strings (`'120px'`, `'40%'`) or
 * numbers (treated as `px`). The `circle` variant overrides border-radius
 * to a full circle — useful for avatar placeholders.
 */
import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';

export type SkeletonVariant = 'rect' | 'circle';

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  variant?: SkeletonVariant;
}

function toCss(value: string | number): string {
  return typeof value === 'number' ? `${value}px` : value;
}

export function Skeleton({
  width,
  height,
  variant = 'rect',
  style,
  className,
  ...rest
}: SkeletonProps): ReactNode {
  const composed: CSSProperties = {
    ...(width !== undefined ? { width: toCss(width) } : {}),
    ...(height !== undefined ? { height: toCss(height) } : {}),
    ...style,
  };
  const classes = ['emt-skeleton'];
  if (variant === 'circle') classes.push('emt-skeleton--circle');
  if (className) classes.push(className);
  return <div aria-hidden="true" className={classes.join(' ')} style={composed} {...rest} />;
}
