/**
 * Task card — single-row summary of a `Task`. Used by `MatrixCell` in
 * view1 and by `QuadrantView` in view2 (Phase 6). Click / tap opens
 * view3 by writing `focusedTaskId` and `openedFromZoom` into the
 * view-state store; the URL is the source of truth so the overlay
 * survives reload and the back button.
 *
 * Step 5.5 makes the card draggable via dnd-kit's `useDraggable`. The
 * `<DndContext>` configures the `PointerSensor` with a 5px activation
 * distance, so a tap that doesn't move past that threshold stays a
 * click and still opens view3. Once the threshold is crossed, dnd-kit
 * begins emitting transform updates and absorbs the pointer events —
 * the click handler does not fire.
 *
 * The priority dot is decorative (`aria-hidden`); the visible button
 * text — title, due date, and tags — carries the meaning for AT.
 */
import { useDraggable } from '@dnd-kit/core';
import type { Task } from '@emt/backend-core';
import { useCallback, useMemo, type CSSProperties, type ReactNode } from 'react';

import { useViewStateStore } from '../../state/view-state.js';

import type { DraggableTaskData } from './dnd.js';

import './task-card.css';

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const timeFormatter = new Intl.DateTimeFormat(undefined, { timeStyle: 'short' });

/**
 * Build a Date from an `IsoDate` (YYYY-MM-DD) using local-time
 * components — `new Date(iso)` would parse it as UTC midnight and
 * shift backwards by the local offset in negative-offset zones.
 */
function parseLocalDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function formatDueLabel(dueDate?: string, dueTime?: string): string | undefined {
  if (!dueDate) return undefined;
  const d = parseLocalDate(dueDate);
  if (!d) return undefined;
  const datePart = dateFormatter.format(d);
  if (!dueTime) return datePart;
  const timeMatch = /^(\d{2}):(\d{2})/.exec(dueTime);
  if (!timeMatch) return datePart;
  d.setHours(Number(timeMatch[1]), Number(timeMatch[2]), 0, 0);
  return `${datePart} · ${timeFormatter.format(d)}`;
}

export interface TaskCardProps {
  task: Task;
}

export function TaskCard({ task }: TaskCardProps): ReactNode {
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

  const dueLabel = useMemo(
    () => formatDueLabel(task.dueDate, task.dueTime),
    [task.dueDate, task.dueTime],
  );
  const hasMeta = dueLabel !== undefined || task.tags.length > 0;

  const data: DraggableTaskData = useMemo(() => ({ kind: 'task', task }), [task]);
  const { setNodeRef, attributes, listeners, transform, isDragging } = useDraggable({
    id: task.id,
    data,
  });

  // While dragging, follow the pointer with a CSS transform; dnd-kit
  // updates `transform` on every pointermove. `touch-action: none` is
  // already on `.emt-task-card` so touch drags don't scroll the page.
  const dragStyle: CSSProperties =
    transform !== null ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : {};

  return (
    <button
      ref={setNodeRef}
      type="button"
      className="emt-task-card"
      data-task-id={task.id}
      data-priority={task.priority}
      data-status={task.status}
      data-dragging={isDragging ? 'true' : 'false'}
      style={dragStyle}
      onClick={onOpen}
      {...attributes}
      {...listeners}
    >
      <span className="emt-task-card__priority" data-priority={task.priority} aria-hidden="true" />
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
  );
}
