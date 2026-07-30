/**
 * Task card — single-row summary of a `Task`. Used by `MatrixCell` in
 * view1 and by `QuadrantView` in view2 (Phase 6).
 *
 * Anatomy (Step 5.6):
 *
 *   .emt-task-card                       (div: dnd-kit handle, drag listeners)
 *   ├── .emt-task-card__open             (button: opens view3)
 *   │   ├── priority dot (decorative)
 *   │   ├── title
 *   │   └── meta (due + tags)
 *   └── TaskCardMenu                      (button + popover: keyboard "Move to")
 *
 * Why the wrapper is a div: native `<button>`s cannot be nested
 * (HTML rejects it and accessibility trees flatten unpredictably), and
 * Step 5.6 requires a focusable menu trigger inside the card. So the
 * card wrapper drops its button role and the inner __open element
 * becomes the semantic click target. The wrapper still hosts the
 * dnd-kit ref + listeners so the whole visual area is draggable.
 *
 * Why the kebab calls `stopPropagation` on `pointerdown`: dnd-kit's
 * `PointerSensor` listens at the wrapper. Without the stop, opening
 * the menu would also start a drag once the pointer moved 5px.
 *
 * The priority dot is decorative (`aria-hidden`); the visible button
 * text — title, due date, and tags — carries the meaning for AT.
 */
import { useDraggable, useDroppable } from '@dnd-kit/core';
import type { Task } from '@emt/backend-core';
import { parseLocalDate, relativeDateKey, type RelativeDateKey } from '@emt/design-system';
import { motion, type MotionStyle } from 'framer-motion';
import { useCallback, useMemo, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useViewStateStore } from '../../state/view-state.js';
import { useSearchStore } from '../search/search-store.js';
import { taskLayoutId } from '../zoom/ZoomController.js';

import type { DraggableTaskData, DroppableCardData } from './dnd.js';
import { TaskCardMenu } from './TaskCardMenu.js';

import './task-card.css';

export interface TaskCardProps {
  task: Task;
  /** Forwarded to TaskCardMenu for delete-undo tests. */
  snackbarDuration?: number;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

const RELATIVE_KEY: Record<RelativeDateKey, StringKey | undefined> = {
  today: 'app.task.due.today',
  tomorrow: 'app.task.due.tomorrow',
  weekend: 'app.task.due.weekend',
  nextWeek: 'app.task.due.nextWeek',
  past: undefined,
  future: undefined,
};

/**
 * Format the due-date side of the card label. Returns a relative
 * label ("Today" / "Tomorrow" / "This weekend" / "Next week") when
 * the stored date falls into a named bucket relative to `now`,
 * otherwise the localised absolute date. The relative bucketing is
 * driven by `relativeDateKey` so the comparison stays consistent
 * with the picker presets (see `packages/backend-core/src/time.md`).
 */
function formatDuePart(
  dueDate: string,
  t: (k: StringKey) => string,
  now: Date,
  locale: string,
): string {
  const bucket = relativeDateKey(dueDate, now, locale);
  const key = bucket !== undefined ? RELATIVE_KEY[bucket] : undefined;
  if (key !== undefined) return t(key);
  const d = parseLocalDate(dueDate);
  return d ? dateFormatter.format(d) : dueDate;
}

function formatTimePart(dueDate: string, dueTime: string): string | undefined {
  const d = parseLocalDate(dueDate);
  if (!d) return undefined;
  const timeMatch = /^(\d{2}):(\d{2})/.exec(dueTime);
  if (!timeMatch) return undefined;
  d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  return timeFormatter.format(d);
}

export function TaskCard({ task, snackbarDuration }: TaskCardProps): ReactNode {
  const t = useT();
  // Highlight while search is open and this card matches (TODO 6).
  // Selector keeps the re-render surface to open/match changes only.
  const isSearchMatch = useSearchStore((s) => s.open && s.matchIds.has(task.id));
  const onOpen = useCallback(() => {
    // Read the latest view-state at click time rather than subscribing
    // to it — the card itself doesn't render anything that depends on
    // zoom or focus, so subscribing would re-render every card on
    // every navigation.
    const { state, navigate } = useViewStateStore.getState();
    navigate({
      ...state,
      focusedTaskId: task.id,
      openedFromZoom: state.zoom,
    });
  }, [task.id]);

  const dueLabel = useMemo(() => {
    if (task.dueDate === undefined) return undefined;
    const locale =
      typeof navigator !== 'undefined' && typeof navigator.language === 'string'
        ? navigator.language
        : 'en-US';
    const datePart = formatDuePart(task.dueDate, t, new Date(), locale);
    if (task.dueTime === undefined) return datePart;
    const timePart = formatTimePart(task.dueDate, task.dueTime);
    return timePart === undefined ? datePart : `${datePart} · ${timePart}`;
  }, [task.dueDate, task.dueTime, t]);
  const hasMeta = dueLabel !== undefined || task.tags.length > 0;

  const data: DraggableTaskData = useMemo(() => ({ kind: 'task', task }), [task]);
  const {
    setNodeRef: setDragRef,
    attributes,
    listeners,
    transform,
    isDragging,
  } = useDraggable({
    id: task.id,
    data,
  });

  // Step 12.1 — the card is also a drop target so a same-quadrant drop
  // onto it reorders the list (the matrix otherwise has just one drop
  // target per cell). Disable it while *this* card is the one being
  // dragged so dnd-kit never resolves a drop onto itself.
  const dropData: DroppableCardData = useMemo(() => ({ kind: 'card', task }), [task]);
  const { setNodeRef: setDropRef } = useDroppable({
    id: `card-drop-${task.id}`,
    data: dropData,
    disabled: isDragging,
  });

  // Both dnd-kit hooks target the same DOM node — fan the ref out to
  // each so the wrapper is simultaneously draggable and droppable.
  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      setDragRef(node);
      setDropRef(node);
    },
    [setDragRef, setDropRef],
  );

  // While dragging, follow the pointer with a CSS transform; dnd-kit
  // updates `transform` on every pointermove. `touch-action: none` is
  // already on `.emt-task-card` so touch drags don't scroll the page.
  const dragStyle: MotionStyle | undefined =
    transform !== null ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};

  return (
    <motion.div
      ref={setNodeRef}
      className="emt-task-card"
      data-task-id={task.id}
      data-priority={task.priority}
      data-status={task.status}
      data-dragging={isDragging ? 'true' : 'false'}
      data-search-match={isSearchMatch ? 'true' : 'false'}
      // Step 12.1 — the shared-layout `layoutId` (used for the view1↔view2
      // zoom morph) and dnd-kit's pointer `transform` both mutate this
      // node, and while dragging they fight: framer-motion keeps trying to
      // animate the card back to its measured layout box, producing
      // visible jitter. Drop `layoutId` for the duration of the drag so
      // the transform is the only thing moving the node; it comes back on
      // drop, when the card is already at rest in its destination cell.
      // (Conditional spread rather than `layoutId={undefined}` because
      // `exactOptionalPropertyTypes` rejects the explicit `undefined`.)
      {...(isDragging ? {} : { layoutId: taskLayoutId(task.backendId, task.id) })}
      style={dragStyle}
      {...attributes}
      {...listeners}
    >
      <button type="button" className="emt-task-card__open" onClick={onOpen}>
        <span
          className="emt-task-card__priority"
          data-priority={task.priority}
          aria-hidden="true"
        />
        <span className="emt-task-card__title">{task.title}</span>
        {hasMeta && (
          <span className="emt-task-card__meta">
            {dueLabel !== undefined && (
              <time className="emt-task-card__due" dateTime={task.dueDate}>
                {dueLabel}
              </time>
            )}
            {task.tags.length > 0 && (
              <span className="emt-task-card__tags">
                {task.tags.map((tag) => (
                  <span key={tag} className="emt-task-card__tag">
                    {tag}
                  </span>
                ))}
              </span>
            )}
          </span>
        )}
      </button>
      <TaskCardMenu task={task} {...(snackbarDuration !== undefined ? { snackbarDuration } : {})} />
    </motion.div>
  );
}
