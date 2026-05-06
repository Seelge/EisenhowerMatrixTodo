/**
 * Button — Material-3-behaving text/icon button family.
 *
 * Styles live in `components.css` (injected by `<ThemeProvider>`); this
 * component is a pure renderer that picks the right class names. Defaults
 * `type` to `"button"` to avoid accidental form submits.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'filled' | 'tonal' | 'outlined' | 'text';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children?: ReactNode;
}

export function Button({
  variant = 'filled',
  className,
  type,
  children,
  ...rest
}: ButtonProps): ReactNode {
  const classes = ['emt-button', `emt-button--${variant}`];
  if (className) classes.push(className);
  return (
    <button type={type ?? 'button'} className={classes.join(' ')} {...rest}>
      {children}
    </button>
  );
}
