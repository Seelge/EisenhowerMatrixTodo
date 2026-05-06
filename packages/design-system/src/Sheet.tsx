/**
 * Sheet — bottom sheet modal surface for narrow viewports.
 *
 * Renders nothing while `open` is false. While open it mounts a scrim
 * plus the sheet itself; the sheet receives focus, traps Tab, and closes
 * on Escape (see `useDialogBehavior`). Animations live in CSS and are
 * zeroed out under `prefers-reduced-motion: reduce`.
 *
 * `aria-label` is required so screen readers can announce the sheet's
 * purpose; the type system enforces it (cf. `IconButton`).
 */
import { useRef, type HTMLAttributes, type ReactNode } from 'react';

import { useDialogBehavior } from './dialog-behavior.js';

export type SheetProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  'aria-label' | 'role' | 'aria-modal'
> & {
  open: boolean;
  onClose: () => void;
  'aria-label': string;
  children?: ReactNode;
};

export function Sheet({ open, onClose, className, children, ...rest }: SheetProps): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null);
  useDialogBehavior(open, onClose, ref);
  if (!open) return null;
  const classes = className ? `emt-sheet ${className}` : 'emt-sheet';
  return (
    <>
      {/*
        The scrim's click handler is a redundant pointer convenience for
        the canonical keyboard close (Escape, wired in `useDialogBehavior`),
        so the keyboard a11y rule does not apply.
      */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="emt-scrim" data-emt-scrim onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" tabIndex={-1} className={classes} {...rest}>
        {children}
      </div>
    </>
  );
}
