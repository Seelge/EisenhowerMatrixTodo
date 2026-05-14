/**
 * Modal dialog behavior shared by `<Sheet>` and `<SidePanel>`:
 *   - Move focus into the dialog on open (first focusable, else the
 *     dialog root itself if it has tabindex).
 *   - Trap Tab / Shift+Tab inside the dialog while open.
 *   - Close on Escape.
 *   - Restore focus to the previously-focused element on close.
 *   - Optionally close on a pointerdown outside the dialog
 *     (`closeOnOutsidePointer`).
 *
 * `onClose` is read through a ref so callers can pass an inline lambda
 * without re-running the effect on every render (which would otherwise
 * keep stomping the previously-focused element).
 */
import { useEffect, useRef, type RefObject } from 'react';

export interface DialogBehaviorOptions {
  /**
   * Dismiss the dialog when a pointerdown lands outside it. Off by
   * default: `<Sheet>` already closes via its scrim, so only the
   * scrimless `<SidePanel>` opts in — Step 12.4, where view3 on
   * desktop was otherwise dismissable by Escape alone.
   */
  closeOnOutsidePointer?: boolean;
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function getFocusable(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS));
}

export function useDialogBehavior(
  open: boolean,
  onClose: () => void,
  ref: RefObject<HTMLElement | null>,
  options: DialogBehaviorOptions = {},
): void {
  const { closeOnOutsidePointer = false } = options;
  const onCloseRef = useRef(onClose);
  // Sync the latest onClose into the ref *outside* the render phase, so the
  // main effect below doesn't have to depend on the callback's identity
  // (which would re-capture `previouslyFocused` and stomp focus on every
  // parent re-render).
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  // Close on a pointerdown outside the dialog. Opt-in: the `<Sheet>`'s
  // scrim already covers this, so only the scrimless `<SidePanel>`
  // enables it. `pointerdown` (not `click`) so the dialog dismisses as
  // soon as the press lands, matching the scrim's feel.
  useEffect(() => {
    if (!open || !closeOnOutsidePointer) return;
    const onPointerDown = (e: PointerEvent): void => {
      const root = ref.current;
      if (root === null) return;
      if (e.target instanceof Node && root.contains(e.target)) return;
      onCloseRef.current();
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, closeOnOutsidePointer, ref]);

  useEffect(() => {
    if (!open) return;
    const root = ref.current;
    if (!root) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const initial = getFocusable(root)[0] ?? root;
    initial.focus();

    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = getFocusable(root);
      if (items.length === 0) {
        e.preventDefault();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      if (previouslyFocused && document.contains(previouslyFocused)) {
        previouslyFocused.focus();
      }
    };
  }, [open, ref]);
}
