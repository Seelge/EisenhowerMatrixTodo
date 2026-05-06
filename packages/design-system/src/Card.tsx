/**
 * Card — neutral surface (`--color-surface`) with rounded corners and
 * default padding. Used for task rows, sheets' inner sections, and the
 * undo-snackbar surface.
 */
import type { HTMLAttributes, ReactNode } from 'react';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export function Card({ className, children, ...rest }: CardProps): ReactNode {
  const classes = className ? `emt-card ${className}` : 'emt-card';
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
