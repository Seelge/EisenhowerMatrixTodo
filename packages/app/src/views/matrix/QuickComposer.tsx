/**
 * QuickComposer — view1/view2 quick-add surface (Step 5.8 + Phase 13).
 *
 * Wraps a title input + 2 × 2 quadrant picker inside the design
 * system's `<ResponsiveSurface>` so the composer renders as a Sheet on
 * narrow viewports and a SidePanel on wide ones (per Step 3.4).
 *
 * Phase 13 (design-input-new TODO 4) adds an opt-in "More options"
 * disclosure that reveals DueDatePicker + a compact priority segmented
 * control. The default path stays title-only so the FAB remains a
 * one-tap-and-type affordance; expanded fields only write when the user
 * actually changes them from the defaults (no due date, normal priority).
 *
 * Submit creates a task via `useCreateTask` against the registry's
 * default backend. The surface closes immediately on submit; the new
 * card is inserted optimistically into the React Query cache so it
 * appears in the chosen cell before the adapter write resolves. On
 * adapter error, the rollback closure restores the cache to its
 * pre-submit snapshot. On success, the existing `useCreateTask`
 * invalidation refetches and replaces the optimistic placeholder with
 * the real `Task` returned by the adapter.
 *
 * Validation: submit is disabled while the trimmed title is empty.
 * Esc and (on mobile) scrim click cancel via `useDialogBehavior` —
 * the desktop SidePanel intentionally has no scrim, mirroring the
 * "panel does not fully obscure the matrix" rule from `design-input.md`.
 */
import type { BackendId, Priority, Quadrant, Task, TaskDraft, TaskId } from '@emt/backend-core';
import {
  Button,
  DueDatePicker,
  QuadrantPicker,
  ResponsiveSurface,
  useSnackbar,
} from '@emt/design-system';
import type { Quadrant as DsQuadrant } from '@emt/design-system';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useCreateTask, useTasks } from '../../queries/tasks.js';
import { getBackends } from '../../state/backends.js';
import { useBusyStore } from '../../state/busy.js';
import { useDefaultPriority } from '../../state/defaults.js';
import {
  applySuggestedTag,
  collectTagCounts,
  committedTagsFromInput,
  incompleteTagQuery,
  mergeTags,
  normalizeTag,
  parseTagInput,
} from '../tags/tag-helpers.js';
import { TagSuggestInput } from '../tags/TagSuggestInput.js';

import './quick-composer.css';

const TO_DS: Record<Quadrant, DsQuadrant> = { Q1: 'q1', Q2: 'q2', Q3: 'q3', Q4: 'q4' };
const FROM_DS: Record<DsQuadrant, Quadrant> = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4' };

const PICKER_LABEL_KEY: Record<DsQuadrant, StringKey> = {
  q1: 'app.matrix.cell.q1.label',
  q2: 'app.matrix.cell.q2.label',
  q3: 'app.matrix.cell.q3.label',
  q4: 'app.matrix.cell.q4.label',
};

const PRIORITIES: readonly Priority[] = ['none', 'low', 'normal', 'high'];

export interface QuickComposerProps {
  open: boolean;
  onClose: () => void;
  /** Quadrant pre-selected when the composer opens. Defaults to Q1 (Do). */
  defaultQuadrant?: Quadrant;
  /**
   * Whether to render the 2 × 2 quadrant picker (Step 6.5). View1 needs
   * it because the FAB is shared across all four cells; view2 already
   * implies its quadrant via the focused frame, so the picker is hidden
   * and `defaultQuadrant` is the only quadrant the composer can land
   * the new task in. Defaults to `true` to preserve the view1 wiring.
   */
  showQuadrantPicker?: boolean;
}

export function QuickComposer({
  open,
  onClose,
  defaultQuadrant = 'Q1',
  showQuadrantPicker = true,
}: QuickComposerProps): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const createTask = useCreateTask();
  const snackbar = useSnackbar();
  const defaultPriority = useDefaultPriority();

  const [title, setTitle] = useState('');
  const [quadrant, setQuadrant] = useState<Quadrant>(defaultQuadrant);
  const [expanded, setExpanded] = useState(false);
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [dueTime, setDueTime] = useState('');
  /** `null` = follow Options default; set once the user picks a radio. */
  const [priorityOverride, setPriorityOverride] = useState<Priority | null>(null);
  const priority = priorityOverride ?? defaultPriority;
  const [tagsInput, setTagsInput] = useState('');
  const allTasks = useTasks();
  const tagInventory = useMemo(() => collectTagCounts(allTasks.data ?? []), [allTasks.data]);

  // Step 10.3 — mark the user as composing while the surface is open
  // so an incoming sync conflict queues silently instead of opening
  // a modal over the half-typed task.
  useEffect(() => {
    useBusyStore.getState().setComposing(open);
    if (open) {
      return () => {
        useBusyStore.getState().setComposing(false);
      };
    }
    return undefined;
  }, [open]);

  const resetForm = useCallback(() => {
    setTitle('');
    setQuadrant(defaultQuadrant);
    setExpanded(false);
    setDueDate(null);
    setDueTime('');
    setPriorityOverride(null);
    setTagsInput('');
  }, [defaultQuadrant]);

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const onSubmit = useCallback(
    async (event: FormEvent) => {
      event.preventDefault();
      const trimmed = title.trim();
      if (trimmed === '') return;

      const { registry } = await getBackends();
      const adapter = registry.getDefault();
      if (adapter === undefined) return;
      const backendId = adapter.describe().id;

      // When the picker is hidden (Step 6.5 — view2), the user can't
      // alter the quadrant inside the composer, so the live prop is the
      // single source of truth. Reading internal state would lock in
      // the prop value at first mount and ignore later view2 → view2
      // navigations through other quadrants.
      const targetQuadrant = showQuadrantPicker ? quadrant : defaultQuadrant;

      const tags = mergeTags([], parseTagInput(tagsInput));
      const draft: TaskDraft = {
        title: trimmed,
        notes: '',
        priority,
        quadrant: targetQuadrant,
        status: 'open',
        tags: [...tags],
      };
      if (dueDate !== null) {
        draft.dueDate = dueDate;
        if (dueTime !== '') draft.dueTime = dueTime;
      }
      const rollback = applyOptimisticCreate(queryClient, draft, backendId);
      // Close before the adapter resolves so the surface feels snappy;
      // the optimistic insert keeps the new card visible in the cell.
      close();
      // Reset the form so the next open starts from a clean slate. The
      // surface unmounts on close, but QuickComposer itself stays
      // mounted and its useState hooks would otherwise hold the prior
      // input.
      resetForm();
      createTask.mutate(
        { draft },
        {
          onError: () => {
            rollback();
            snackbar.show({ message: t('app.composer.create.failed') });
          },
        },
      );
    },
    [
      title,
      quadrant,
      defaultQuadrant,
      showQuadrantPicker,
      priority,
      dueDate,
      dueTime,
      tagsInput,
      queryClient,
      createTask,
      snackbar,
      t,
      close,
      resetForm,
    ],
  );

  const titleId = useId();
  const moreId = useId();
  const dueTimeId = useId();
  const trimmed = title.trim();
  const submitDisabled = trimmed === '';

  return (
    <ResponsiveSurface open={open} onClose={close} aria-label={t('app.composer.label')}>
      <form className="emt-quick-composer" onSubmit={onSubmit}>
        <header className="emt-quick-composer__header">
          <h2 className="emt-quick-composer__title">{t('app.composer.label')}</h2>
        </header>
        <div className="emt-quick-composer__field">
          <label htmlFor={titleId} className="emt-quick-composer__label">
            {t('app.composer.titleLabel')}
          </label>
          <input
            id={titleId}
            className="emt-quick-composer__input"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.currentTarget.value)}
            placeholder={t('app.composer.titlePlaceholder')}
            autoComplete="off"
            // Auto-focus is intentional: useDialogBehavior already moves
            // focus into the surface on open, but landing on the title
            // input — the only thing the user is here to do — beats
            // landing on a heading or a button.
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </div>
        {showQuadrantPicker && (
          <div className="emt-quick-composer__field">
            <span className="emt-quick-composer__label">{t('app.composer.quadrantLabel')}</span>
            <QuadrantPicker
              value={TO_DS[quadrant]}
              onChange={(next) => setQuadrant(FROM_DS[next])}
              labels={{
                q1: t(PICKER_LABEL_KEY.q1),
                q2: t(PICKER_LABEL_KEY.q2),
                q3: t(PICKER_LABEL_KEY.q3),
                q4: t(PICKER_LABEL_KEY.q4),
              }}
              aria-label={t('app.composer.quadrantLabel')}
            />
          </div>
        )}
        <button
          type="button"
          className="emt-quick-composer__more-toggle"
          aria-expanded={expanded}
          aria-controls={moreId}
          data-action="composer-more"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? t('app.composer.moreHide') : t('app.composer.moreShow')}
        </button>
        {expanded && (
          <div id={moreId} className="emt-quick-composer__more" data-expanded="true">
            <div className="emt-quick-composer__field">
              <span className="emt-quick-composer__label">{t('app.composer.dueLabel')}</span>
              <DueDatePicker
                value={dueDate}
                onChange={setDueDate}
                labels={{
                  today: t('app.due.today'),
                  tomorrow: t('app.due.tomorrow'),
                  weekend: t('app.due.weekend'),
                  nextWeek: t('app.due.nextWeek'),
                  none: t('app.due.none'),
                  quickGroup: t('app.due.quickGroup'),
                  pickDate: t('app.due.pickDate'),
                }}
              />
            </div>
            <div className="emt-quick-composer__field">
              <label htmlFor={dueTimeId} className="emt-quick-composer__label">
                {t('app.composer.dueTimeLabel')}
              </label>
              <input
                id={dueTimeId}
                type="time"
                className="emt-quick-composer__input"
                data-field="composer-due-time"
                value={dueTime}
                disabled={dueDate === null}
                onChange={(e) => setDueTime(e.currentTarget.value)}
              />
            </div>
            <div
              className="emt-quick-composer__field"
              role="radiogroup"
              aria-label={t('app.composer.priorityLabel')}
            >
              <span className="emt-quick-composer__label" aria-hidden>
                {t('app.composer.priorityLabel')}
              </span>
              <div className="emt-quick-composer__priority">
                {PRIORITIES.map((p) => {
                  const checked = p === priority;
                  return (
                    <button
                      key={p}
                      type="button"
                      role="radio"
                      aria-checked={checked}
                      data-priority={p}
                      className="emt-quick-composer__priority-option"
                      onClick={() => setPriorityOverride(p)}
                    >
                      {t(`app.task.fields.priority.${p}`)}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="emt-quick-composer__field">
              <label htmlFor={`${moreId}-tags`} className="emt-quick-composer__label">
                {t('app.composer.tagsLabel')}
              </label>
              <TagSuggestInput
                id={`${moreId}-tags`}
                className="emt-quick-composer__input"
                value={tagsInput}
                suggestQuery={incompleteTagQuery(tagsInput)}
                inventory={tagInventory}
                exclude={committedTagsFromInput(tagsInput)}
                placeholder={t('app.composer.tagsPlaceholder')}
                data-field="composer-tags"
                onChange={setTagsInput}
                onCommitFreeText={() => {
                  const token = incompleteTagQuery(tagsInput);
                  const next = normalizeComposerTagToken(tagsInput, token);
                  if (next !== null) setTagsInput(next);
                }}
                onPick={(tag) => setTagsInput(applySuggestedTag(tagsInput, tag))}
              />
            </div>
          </div>
        )}
        <footer className="emt-quick-composer__actions">
          <Button variant="text" onClick={close}>
            {t('app.composer.cancel')}
          </Button>
          <Button type="submit" variant="filled" disabled={submitDisabled}>
            {t('app.composer.submit')}
          </Button>
        </footer>
      </form>
    </ResponsiveSurface>
  );
}

/** Commit the trailing free-text token into the comma-separated tags field. */
function normalizeComposerTagToken(raw: string, token: string): string | null {
  const next = normalizeTag(token);
  if (next === '') return null;
  return applySuggestedTag(raw, next);
}

/**
 * Insert a placeholder task into every cached `['tasks', ...]` list
 * matching the optimistic shape. Returns a closure that restores the
 * pre-insert snapshot — the caller invokes it from `useCreateTask`'s
 * `onError` handler on adapter failure.
 *
 * The placeholder carries a stable `optimistic-` prefixed id so the
 * post-success invalidation refetches and replaces it with the real
 * record from the adapter. Cache layout assumptions match
 * `dnd.ts:applyOptimisticMove`.
 */
function applyOptimisticCreate(
  queryClient: QueryClient,
  draft: TaskDraft,
  backendId: BackendId,
): () => void {
  const now = new Date().toISOString();
  const placeholder: Task = {
    id: `optimistic-${crypto.randomUUID()}` as TaskId,
    backendId,
    title: draft.title,
    notes: draft.notes,
    priority: draft.priority,
    quadrant: draft.quadrant,
    status: draft.status,
    tags: [...draft.tags],
    createdAt: now,
    updatedAt: now,
  };
  if (draft.dueDate !== undefined) placeholder.dueDate = draft.dueDate;
  if (draft.dueTime !== undefined) placeholder.dueTime = draft.dueTime;

  const snapshots = queryClient.getQueriesData<unknown>({ queryKey: ['tasks'] });
  for (const [key] of snapshots) {
    const [, sub, filter] = key as readonly [string, string, string | undefined];
    if (sub !== 'list') continue;
    queryClient.setQueryData<readonly Task[] | undefined>(key, (prev) => {
      if (prev === undefined) return prev;
      // 'all' bucket — and any future un-filtered list — always
      // includes the placeholder. Single-quadrant buckets only include
      // it when the placeholder targets that quadrant.
      if (filter === 'all' || filter === undefined) return [...prev, placeholder];
      if (filter === draft.quadrant) return [...prev, placeholder];
      return prev;
    });
  }

  return () => {
    for (const [key, value] of snapshots) {
      queryClient.setQueryData(key, value);
    }
  };
}
