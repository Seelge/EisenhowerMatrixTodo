/**
 * SidePanel — ~480 px right-side modal surface for wide viewports.
 *
 * Per design-input, the panel "does not fully obscure the underlying
 * matrix" — there is no scrim. Focus and Esc handling match `<Sheet>`
 * via the shared `useDialogBehavior` hook.
 */
import { useRef, type HTMLAttributes, type ReactNode } from 'react';

import { useDialogBehavior } from './dialog-behavior.js';

export type SidePanelProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'aria-label' | 'role' | 'aria-modal'
> & {
  open: boolean;
  onClose: () => void;
  'aria-label': string;
  children?: ReactNode;
};

export function SidePanel({
  open,
  onClose,
  className,
  children,
  ...rest
}: SidePanelProps): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null);
  useDialogBehavior(open, onClose, ref);
  if (!open) return null;
  const classes = className ? `emt-side-panel ${className}` : 'emt-side-panel';
  return (
    <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} className={classes} {...rest}>
      {children}
    </div>
  );
}
