/**
 * IconButton — round, icon-only press target (≥48 × 48 px).
 *
 * `aria-label` is required at the type level: an icon-only control must
 * announce its purpose to assistive tech. Pair with an `<svg>` or icon
 * font glyph as the child.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type IconButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> & {
  'aria-label': string;
  children?: ReactNode;
};

export function IconButton({ className, type, children, ...rest }: IconButtonProps): ReactNode {
  const classes = className ? `emt-icon-button ${className}` : 'emt-icon-button';
  return (
    <button type={type ?? 'button'} className={classes} {...rest}>
      {children}
    </button>
  );
}
