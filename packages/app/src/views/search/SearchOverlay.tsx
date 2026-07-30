/**
 * SearchOverlay — full-viewport title/notes/tag search (TODO 6).
 *
 * Opens over the current matrix or quadrant without changing zoom.
 * Matching cards are highlighted underneath via `matchIds` on the
 * search store; picking a result opens view3 for that task and closes
 * the overlay.
 *
 * Keyboard:
 *   - `/` or Ctrl/Cmd+K opens (bound in {@link SearchHotkeys})
 *   - Escape closes (via `useDialogBehavior` on the dialog root)
 *   - ArrowUp/Down move the highlighted result; Enter opens it
 */
import type { Task, TaskId } from '@emt/backend-core';
import { EmptyNote, IconButton } from '@emt/design-system';
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { useT } from '../../i18n/provider.js';
import { useTasks } from '../../queries/tasks.js';
import { useViewStateStore } from '../../state/view-state.js';

import { filterTasks } from './search-match.js';
import { useSearchStore } from './search-store.js';

import './search.css';

const QUADRANT_LABEL: Record<Task['quadrant'], string> = {
  Q1: 'Do',
  Q2: 'Schedule',
  Q3: 'Delegate',
  Q4: 'Delete',
};

export function SearchOverlay(): ReactNode {
  const t = useT();
  const open = useSearchStore((s) => s.open);
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const setMatchIds = useSearchStore((s) => s.setMatchIds);
  const closeSearch = useSearchStore((s) => s.closeSearch);
  const allTasks = useTasks();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const titleId = useId();
  const inputId = useId();
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(
    () => (allTasks.data ? filterTasks(allTasks.data, query) : []),
    [allTasks.data, query],
  );

  // Push match ids so matrix/quadrant cards can highlight underneath.
  useEffect(() => {
    if (!open) {
      setMatchIds(new Set());
      return;
    }
    setMatchIds(new Set(results.map((task) => task.id)));
  }, [open, results, setMatchIds]);

  // Clamp rather than reset-in-effect when the result set shrinks.
  const safeActiveIndex = results.length === 0 ? 0 : Math.min(activeIndex, results.length - 1);

  // Focus the input on open.
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  // Escape closes; also trap focus roughly by keeping Tab inside.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        closeSearch();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, closeSearch]);

  const openTask = useCallback(
    (id: TaskId) => {
      const { state, navigate } = useViewStateStore.getState();
      navigate({ ...state, focusedTaskId: id });
      closeSearch();
    },
    [closeSearch],
  );

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, Math.max(results.length - 1, 0)));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      const hit = results[safeActiveIndex];
      if (hit !== undefined) {
        e.preventDefault();
        openTask(hit.id);
      }
    }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    const list = listRef.current;
    if (list === null) return;
    const item = list.querySelector<HTMLElement>(`[data-index="${String(safeActiveIndex)}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [safeActiveIndex]);

  if (!open) return null;

  const trimmed = query.trim();
  const showEmpty = trimmed !== '' && results.length === 0 && !allTasks.isPending;

  return (
    <div
      className="emt-search"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      data-view="search"
    >
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
      <div className="emt-search__scrim" data-emt-scrim onClick={closeSearch} />
      <div className="emt-search__panel">
        <header className="emt-search__header">
          <h2 id={titleId} className="emt-search__title">
            {t('app.search.heading')}
          </h2>
          <IconButton
            type="button"
            aria-label={t('app.search.close')}
            data-action="close-search"
            onClick={closeSearch}
          >
            <CloseIcon />
          </IconButton>
        </header>
        <label htmlFor={inputId} className="emt-search__label">
          {t('app.search.inputLabel')}
        </label>
        <input
          ref={inputRef}
          id={inputId}
          className="emt-search__input"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.currentTarget.value);
            setActiveIndex(0);
          }}
          onKeyDown={onInputKeyDown}
          placeholder={t('app.search.placeholder')}
          autoComplete="off"
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
        />
        <ul
          ref={listRef}
          className="emt-search__results"
          role="listbox"
          aria-label={t('app.search.resultsLabel')}
          data-count={results.length}
        >
          {results.map((task, index) => {
            const active = index === safeActiveIndex;
            return (
              <li key={task.id} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  data-index={index}
                  data-task-id={task.id}
                  className="emt-search__result"
                  data-active={active ? 'true' : 'false'}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openTask(task.id)}
                >
                  <span className="emt-search__result-title">{task.title}</span>
                  <span className="emt-search__result-meta">
                    {QUADRANT_LABEL[task.quadrant]}
                    {task.dueDate !== undefined ? ` · ${task.dueDate}` : ''}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {showEmpty && <EmptyNote className="emt-search__empty">{t('app.search.empty')}</EmptyNote>}
        {trimmed === '' && <p className="emt-search__hint">{t('app.search.hint')}</p>}
      </div>
    </div>
  );
}

/**
 * Global hotkeys: `/` (when not typing in an input) and Ctrl/Cmd+K open
 * search. Mounted once at the app root next to the overlay.
 */
export function SearchHotkeys(): ReactNode {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (useSearchStore.getState().open) return;
      const target = e.target;
      const typing =
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);
      const mod = e.ctrlKey || e.metaKey;
      if (mod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        useSearchStore.getState().openSearch();
        return;
      }
      if (!typing && e.key === '/' && !mod && !e.altKey) {
        e.preventDefault();
        useSearchStore.getState().openSearch();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return null;
}

function CloseIcon(): ReactNode {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
    </svg>
  );
}
