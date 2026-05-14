/**
 * Per-card "Task actions" menu (Step 5.6).
 *
 * The matrix's drag-and-drop covers the move interaction for pointer
 * users; this menu is the keyboard- (and screen-reader-) accessible
 * alternative the project's a11y commitment requires. It opens from a
 * kebab button rendered next to the card's main click target and
 * offers "Move to <quadrant>" entries for every quadrant other than
 * the task's current one.
 *
 * Behavior:
 *   - The trigger button toggles the menu open/closed. While open,
 *     `role="menu"` wraps `role="menuitem"` buttons so AT announces it
 *     as a menu rather than a generic group.
 *   - Open: focus moves to the first item. ArrowDown / ArrowUp wrap
 *     between items. Enter or Space activates the focused item; Tab
 *     and Esc close the menu and return focus to the kebab.
 *   - Click outside also closes the menu (pointer users dismissing
 *     without making a choice), as does focus leaving the menu by any
 *     means (the `onBlur` guard below).
 *   - Clicking a menu item dispatches `useUpdateTask` with the new
 *     quadrant; the existing `onSuccess` invalidation in that hook
 *     surfaces the move in the matrix without any optimistic shimmer
 *     here (this code path is rare enough to skip the gymnastics that
 *     drag uses).
 *
 * The kebab button's `onPointerDown` calls `stopPropagation` so the
 * dnd-kit listeners attached to the card wrapper do not interpret the
 * click as the start of a drag.
 *
 * Step 12.3 — portal popover. The menu used to render inline
 * (`position: absolute` within the card), so in view1 cells it was
 * clipped to the cell's `overflow` box — often only the first item was
 * visible. It now renders through a `createPortal` to `document.body`
 * with `position: fixed` at `--layer-tooltip`, anchored to the trigger's
 * bounding rect (measured in a layout effect, flipped above the trigger
 * if it would overflow the viewport bottom). Nothing escapes a cell's
 * clip box anymore.
 */
import type { Quadrant, Task } from '@emt/backend-core';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useUpdateTask } from '../../queries/tasks.js';

const ALL_QUADRANTS: readonly Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const MOVE_TO_KEY: Record<Quadrant, StringKey> = {
  Q1: 'app.task.menu.moveTo.q1',
  Q2: 'app.task.menu.moveTo.q2',
  Q3: 'app.task.menu.moveTo.q3',
  Q4: 'app.task.menu.moveTo.q4',
};

export interface TaskCardMenuProps {
  task: Task;
}

/** Gap in px between the trigger button and the popover. */
const MENU_GAP = 4;

export function TaskCardMenu({ task }: TaskCardMenuProps): ReactNode {
  const t = useT();
  const updateTask = useUpdateTask();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);

  const targets = useMemo(() => ALL_QUADRANTS.filter((q) => q !== task.quadrant), [task.quadrant]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) {
      // Defer to the next microtask so React has unmounted the menu
      // before we move focus — focusing while the menu is still
      // mounted would scroll the menu into view first and then jump.
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }, []);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: globalThis.PointerEvent): void => {
      const target = e.target;
      if (!(target instanceof Node)) return;
      if (triggerRef.current?.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  // Position the portalled popover against the trigger. A layout effect
  // writes the coordinates straight onto the node's `style` (an
  // "external system" update — no React state, so no cascading render)
  // so they land before paint. The menu starts `visibility: hidden` via
  // CSS and is revealed here once measured, so it never flashes at the
  // top-left corner. Measuring `menuRef` lets us flip the popover above
  // the trigger when a card near the viewport bottom would otherwise
  // push it off-screen.
  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (trigger === null || menu === null) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    // Right-align the popover with the trigger, clamped into view.
    const left = Math.max(MENU_GAP, rect.right - menuWidth);
    // Below the trigger by default; flip above if it would overflow.
    const below = rect.bottom + MENU_GAP;
    const overflowsBottom = below + menuHeight > window.innerHeight - MENU_GAP;
    const top = overflowsBottom ? Math.max(MENU_GAP, rect.top - MENU_GAP - menuHeight) : below;
    menu.style.left = `${String(left)}px`;
    menu.style.top = `${String(top)}px`;
    menu.style.visibility = 'visible';
  }, [open]);

  // While open, a scroll or resize moves the trigger out from under the
  // popover — simplest correct response is to dismiss it (the user can
  // re-open against the new position).
  useEffect(() => {
    if (!open) return;
    const dismiss = (): void => close(false);
    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open, close]);

  // Move focus to the first item when the menu opens.
  useEffect(() => {
    if (open) {
      // microtask so the items have mounted by the time we focus.
      queueMicrotask(() => itemRefs.current[0]?.focus());
    }
  }, [open]);

  // Close when focus leaves the menu by any route that the explicit
  // Tab / Esc handlers below don't already catch (e.g. a screen reader
  // moving focus, or focus dropping to the body). Deferring the check
  // to a microtask lets `document.activeElement` settle first, so
  // arrow-key navigation *between* items doesn't trip this.
  const onMenuBlur = useCallback((_e: FocusEvent<HTMLDivElement>) => {
    queueMicrotask(() => {
      const active = document.activeElement;
      if (active === triggerRef.current) return;
      if (menuRef.current?.contains(active)) return;
      setOpen(false);
    });
  }, []);

  const onTriggerKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    // ArrowDown on the trigger opens and lands focus on the first item —
    // matches the WAI-ARIA menu-button pattern.
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  const onItemKeyDown = useCallback(
    (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          const next = (index + 1) % targets.length;
          itemRefs.current[next]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          const prev = (index - 1 + targets.length) % targets.length;
          itemRefs.current[prev]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          itemRefs.current[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          itemRefs.current[targets.length - 1]?.focus();
          break;
        }
        case 'Escape':
        case 'Tab': {
          e.preventDefault();
          close(true);
          break;
        }
        default:
          break;
      }
    },
    [targets.length, close],
  );

  const onActivate = useCallback(
    (target: Quadrant) => {
      updateTask.mutate({
        backendId: task.backendId,
        id: task.id,
        patch: { quadrant: target },
      });
      close(true);
    },
    [updateTask, task.backendId, task.id, close],
  );

  const onTriggerPointerDown = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    // Block the dnd-kit listeners on the card wrapper from interpreting
    // this click as the start of a drag.
    e.stopPropagation();
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="emt-task-card__menu-button"
        aria-label={t('app.task.menu.label')}
        aria-haspopup="menu"
        aria-expanded={open ? 'true' : 'false'}
        onPointerDown={onTriggerPointerDown}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={onTriggerKeyDown}
      >
        <span aria-hidden="true">⋮</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="emt-task-card__menu"
            aria-label={t('app.task.menu.label')}
            onBlur={onMenuBlur}
          >
            {targets.map((target, index) => (
              <button
                key={target}
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                className="emt-task-card__menu-item"
                data-quadrant={target}
                onClick={() => onActivate(target)}
                onKeyDown={onItemKeyDown(index)}
              >
                {t(MOVE_TO_KEY[target])}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
