/**
 * Fab — bottom-right floating action button (56 × 56 px).
 *
 * Carries the accent glow shadow from `--glow-accent` so it stands away
 * from the surface. Like `IconButton`, it's icon-only by default and
 * requires `aria-label`.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type FabProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  'aria-label': string;
  children?: ReactNode;
};

export function Fab({ className, type, children, ...rest }: FabProps): ReactNode {
  const classes = className ? `emt-fab ${className}` : 'emt-fab';
  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  );
}
