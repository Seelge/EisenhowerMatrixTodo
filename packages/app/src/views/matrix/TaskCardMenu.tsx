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
 *     without making a choice).
 *   - Clicking a menu item dispatches `useUpdateTask` with the new
 *     quadrant; the existing `onSuccess` invalidation in that hook
 *     surfaces the move in the matrix without any optimistic shimmer
 *     here (this code path is rare enough to skip the gymnastics that
 *     drag uses).
 *
 * The kebab button's `onPointerDown` calls `stopPropagation` so the
 * dnd-kit listeners attached to the card wrapper do not interpret the
 * click as the start of a drag.
 */
import type { Quadrant, Task } from '@emt/backend-core';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

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

export function TaskCardMenu({ task }: TaskCardMenuProps): ReactNode {
  const t = useT();
  const updateTask = useUpdateTask();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
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
      const stillInMenu = itemRefs.current.some((el) => el?.contains(target));
      if (stillInMenu) return;
      close(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, close]);

  // Move focus to the first item when the menu opens.
  useEffect(() => {
    if (open) {
      // microtask so the items have mounted by the time we focus.
      queueMicrotask(() => itemRefs.current[0]?.focus());
    }
  }, [open]);

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
      {open && (
        <div role="menu" className="emt-task-card__menu" aria-label={t('app.task.menu.label')}>
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
        </div>
      )}
    </>
  );
}
