/**
 * Per-card "Task actions" menu (Step 5.6 + Phase 16).
 *
 * The matrix's drag-and-drop covers the move interaction for pointer
 * users; this menu is the keyboard- (and screen-reader-) accessible
 * alternative the project's a11y commitment requires. It opens from a
 * kebab button rendered next to the card's main click target.
 *
 * Items (Phase 16):
 *   - Mark complete / Reopen (by current status)
 *   - Delete (optimistic cache drop + 5 s undo snackbar, same as view3)
 *   - Move to <quadrant> for every quadrant other than the current one
 *
 * Behavior:
 *   - The trigger button toggles the menu open/closed. While open,
 *     `role="menu"` wraps `role="menuitem"` buttons so AT announces it
 *     as a menu rather than a generic group.
 *   - Open: focus moves to the first item. ArrowDown / ArrowUp wrap
 *     between items. Enter or Space activates the focused item; Tab
 *     and Esc close the menu and return focus to the kebab.
 *   - Click outside also closes the menu, as does focus leaving the menu.
 *   - Move / status writes go through `useUpdateTask`. Delete uses
 *     `applyOptimisticDelete` + snackbar commit of `useDeleteTask`.
 *
 * The kebab button's `onPointerDown` calls `stopPropagation` so the
 * dnd-kit listeners attached to the card wrapper do not interpret the
 * click as the start of a drag.
 *
 * Step 12.3 — portal popover to `document.body` with fixed positioning
 * so view1 cell overflow cannot clip the menu.
 */
import type { Quadrant, Task, TaskPatch, TaskStatus } from '@emt/backend-core';
import { useSnackbar } from '@emt/design-system';
import { useQueryClient } from '@tanstack/react-query';
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
import { useDeleteTask, useUpdateTask } from '../../queries/tasks.js';

import { applyOptimisticDelete } from './dnd.js';

const ALL_QUADRANTS: readonly Quadrant[] = ['Q1', 'Q2', 'Q3', 'Q4'];

const MOVE_TO_KEY: Record<Quadrant, StringKey> = {
  Q1: 'app.task.menu.moveTo.q1',
  Q2: 'app.task.menu.moveTo.q2',
  Q3: 'app.task.menu.moveTo.q3',
  Q4: 'app.task.menu.moveTo.q4',
};

type MenuAction =
  | { readonly kind: 'status'; readonly next: TaskStatus }
  | { readonly kind: 'delete' }
  | { readonly kind: 'move'; readonly quadrant: Quadrant };

export interface TaskCardMenuProps {
  task: Task;
  /** Override the delete snackbar duration. Tests pass a short value. */
  snackbarDuration?: number;
}

/** Gap in px between the trigger button and the popover. */
const MENU_GAP = 4;

export function TaskCardMenu({ task, snackbarDuration }: TaskCardMenuProps): ReactNode {
  const t = useT();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();
  const snackbar = useSnackbar();
  const queryClient = useQueryClient();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [open, setOpen] = useState(false);

  const actions = useMemo((): readonly MenuAction[] => {
    const statusAction: MenuAction =
      task.status === 'done' ? { kind: 'status', next: 'open' } : { kind: 'status', next: 'done' };
    const moves: MenuAction[] = ALL_QUADRANTS.filter((q) => q !== task.quadrant).map((quadrant) => ({
      kind: 'move',
      quadrant,
    }));
    return [statusAction, { kind: 'delete' }, ...moves];
  }, [task.status, task.quadrant]);

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) {
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }, []);

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

  useLayoutEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const menu = menuRef.current;
    if (trigger === null || menu === null) return;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = menu.offsetWidth;
    const menuHeight = menu.offsetHeight;
    const left = Math.max(MENU_GAP, rect.right - menuWidth);
    const below = rect.bottom + MENU_GAP;
    const overflowsBottom = below + menuHeight > window.innerHeight - MENU_GAP;
    const top = overflowsBottom ? Math.max(MENU_GAP, rect.top - MENU_GAP - menuHeight) : below;
    menu.style.left = `${String(left)}px`;
    menu.style.top = `${String(top)}px`;
    menu.style.visibility = 'visible';
  }, [open]);

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

  useEffect(() => {
    if (open) {
      queueMicrotask(() => itemRefs.current[0]?.focus());
    }
  }, [open]);

  const onMenuBlur = useCallback((_e: FocusEvent<HTMLDivElement>) => {
    queueMicrotask(() => {
      const active = document.activeElement;
      if (active === triggerRef.current) return;
      if (menuRef.current?.contains(active)) return;
      setOpen(false);
    });
  }, []);

  const onTriggerKeyDown = useCallback((e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  const onItemKeyDown = useCallback(
    (index: number) => (e: KeyboardEvent<HTMLButtonElement>) => {
      const n = actions.length;
      switch (e.key) {
        case 'ArrowDown': {
          e.preventDefault();
          itemRefs.current[(index + 1) % n]?.focus();
          break;
        }
        case 'ArrowUp': {
          e.preventDefault();
          itemRefs.current[(index - 1 + n) % n]?.focus();
          break;
        }
        case 'Home': {
          e.preventDefault();
          itemRefs.current[0]?.focus();
          break;
        }
        case 'End': {
          e.preventDefault();
          itemRefs.current[n - 1]?.focus();
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
    [actions.length, close],
  );

  const onActivate = useCallback(
    (action: MenuAction) => {
      if (action.kind === 'move') {
        updateTask.mutate({
          backendId: task.backendId,
          id: task.id,
          patch: { quadrant: action.quadrant },
        });
        close(true);
        return;
      }
      if (action.kind === 'status') {
        const patch: TaskPatch = { status: action.next };
        if (action.next === 'done') {
          patch.completedAt = new Date().toISOString();
        }
        updateTask.mutate({ backendId: task.backendId, id: task.id, patch });
        close(true);
        return;
      }
      // delete
      const taskId = task.id;
      const backendId = task.backendId;
      const rollbackDelete = applyOptimisticDelete(queryClient, task);
      close(false);
      snackbar.show({
        message: t('app.task.delete.snackbar'),
        undoLabel: t('app.task.delete.undo'),
        ...(snackbarDuration !== undefined ? { duration: snackbarDuration } : {}),
        onCommit: () => {
          deleteTask.mutate({ id: taskId, backendId });
        },
        onUndo: () => {
          rollbackDelete();
        },
      });
    },
    [
      updateTask,
      deleteTask,
      snackbar,
      queryClient,
      task,
      t,
      snackbarDuration,
      close,
    ],
  );

  const onTriggerPointerDown = useCallback((e: PointerEvent<HTMLButtonElement>) => {
    e.stopPropagation();
  }, []);

  const labelFor = (action: MenuAction): string => {
    if (action.kind === 'status') {
      return action.next === 'done'
        ? t('app.task.menu.complete')
        : t('app.task.menu.reopen');
    }
    if (action.kind === 'delete') return t('app.task.menu.delete');
    return t(MOVE_TO_KEY[action.quadrant]);
  };

  const dataAttrs = (action: MenuAction): Record<string, string> => {
    if (action.kind === 'move') return { 'data-quadrant': action.quadrant };
    if (action.kind === 'status') return { 'data-action': action.next === 'done' ? 'complete' : 'reopen' };
    return { 'data-action': 'delete' };
  };

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
            {actions.map((action, index) => (
              <button
                key={
                  action.kind === 'move'
                    ? `move-${action.quadrant}`
                    : action.kind === 'status'
                      ? `status-${action.next}`
                      : 'delete'
                }
                ref={(el) => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitem"
                className={
                  action.kind === 'delete'
                    ? 'emt-task-card__menu-item emt-task-card__menu-item--danger'
                    : 'emt-task-card__menu-item'
                }
                {...dataAttrs(action)}
                onClick={() => onActivate(action)}
                onKeyDown={onItemKeyDown(index)}
              >
                {labelFor(action)}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
