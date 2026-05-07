/**
 * Task card — single-row summary of a `Task`. Used by `MatrixCell` in
 * view1 (Step 5.3) and by `QuadrantView` in view2 (Phase 6). Click /
 * tap opens view3 by writing `focusedTaskId` and `openedFromZoom`
 * into the view-state store; the URL is the source of truth so the
 * overlay survives reload and the back button.
 *
 * Step 5.2 only renders the card and wires its click. Drag-and-drop
 * (Step 5.5) and the kebab menu (Step 5.6) layer on top later.
 *
 * The priority dot is decorative (`aria-hidden`); the visible button
 * text — title, due date, and tags — carries the meaning for AT.
 */
import type { Task } from '@emt/backend-core';
import { useCallback, useMemo, type ReactNode } from 'react';

import { useViewStateStore } from '../../state/view-state.js';

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

  return (
    <button
      type="button"
      className="emt-task-card"
      data-task-id={task.id}
      data-priority={task.priority}
      data-status={task.status}
      onClick={onOpen}
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
