/**
 * Sheet — bottom sheet modal surface for narrow viewports.
 *
 * Renders nothing while `open` is false. While open it mounts a scrim
 * plus the sheet itself; the sheet receives focus, traps Tab, and closes
 * on Escape (see `useDialogBehavior`). Animations live in CSS and are
 * zeroed out under `prefers-reduced-motion: reduce`.
 *
 * Step 12.7 — keyboard-aware. The sheet is `position: fixed; bottom: 0`,
 * so when an on-screen keyboard opens on a mobile browser that doesn't
 * shrink the layout viewport, the sheet's lower content (in the
 * QuickComposer: the quadrant picker + actions) ends up behind the
 * keyboard. `useKeyboardAwareLayout` reads the Visual Viewport API and,
 * when a keyboard is detected, lifts the sheet by `keyboardInset` and
 * caps its height to the still-visible area. On browsers that honour
 * the `interactive-widget=resizes-content` hint the inset is 0 and this
 * is a no-op.
 *
 * `aria-label` is required so screen readers can announce the sheet's
 * purpose; the type system enforces it (cf. `IconButton`).
 */
import { useRef, type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

import { useDialogBehavior } from './dialog-behavior.js';
import { useKeyboardAwareLayout } from './visual-viewport.js';

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
  const { keyboardInset, maxHeight } = useKeyboardAwareLayout();
  if (!open) return null;
  const classes = className ? `emt-sheet ${className}` : 'emt-sheet';
  // Only override the CSS-default `bottom: 0` / `max-height: 90vh` when
  // a keyboard is actually open; otherwise let the stylesheet drive.
  const keyboardStyle: CSSProperties | undefined =
    keyboardInset > 0
      ? { bottom: `${String(keyboardInset)}px`, maxHeight: `${String(maxHeight)}px` }
      : undefined;
  return (
    <>
      {/*
        The scrim's click handler is a redundant pointer convenience for
        the canonical keyboard close (Escape, wired in `useDialogBehavior`),
        so the keyboard a11y rule does not apply.
      */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="emt-scrim" data-emt-scrim onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={classes}
        style={keyboardStyle}
        {...rest}
      >
        {children}
      </div>
    </>
  );
}
