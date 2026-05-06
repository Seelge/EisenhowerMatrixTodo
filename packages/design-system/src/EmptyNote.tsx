/**
 * EmptyNote — the muted-grey "nothing here yet" note used inside empty
 * quadrant cells (per design-input §view2).
 *
 * Renders as a plain `<p>` so it integrates with surrounding flow text;
 * the visual style (centered, italic, secondary-text color) lives in
 * `components.css` under `.emt-empty-note`.
 */
import type { HTMLAttributes, ReactNode } from 'react';

export interface EmptyNoteProps extends HTMLAttributes<HTMLParagraphElement> {
  children?: ReactNode;
}

export function EmptyNote({ className, children, ...rest }: EmptyNoteProps): ReactNode {
  const classes = className ? `emt-empty-note ${className}` : 'emt-empty-note';
  return (
    <p className={classes} {...rest}>
      {children}
    </p>
  );
}
