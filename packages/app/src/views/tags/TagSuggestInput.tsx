/**
 * TagSuggestInput — combobox over existing tag inventory (Phase 18).
 *
 * Free-text path stays open (Enter / blur commit via parent). Arrow keys
 * + Enter apply a suggestion; Escape closes the list without bubbling to
 * sheet/dialog dismiss handlers.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type KeyboardEvent,
  type ReactNode,
} from 'react';

import { useT } from '../../i18n/provider.js';

import { suggestTags, type TagCount } from './tag-helpers.js';

import './tags.css';

export interface TagSuggestInputProps {
  id: string;
  value: string;
  /** Slice of `value` used for ranking (full draft or last comma segment). */
  suggestQuery: string;
  inventory: readonly TagCount[];
  exclude: readonly string[];
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  'data-field'?: string;
  onChange: (value: string) => void;
  /** Enter with no highlighted option (or form submit). */
  onCommitFreeText: () => void;
  onPick: (tag: string) => void;
  onBackspaceEmpty?: () => void;
  /** Blur when not selecting an option (e.g. field free-text commit). */
  onBlurCommit?: () => void;
}

export function TagSuggestInput({
  id,
  value,
  suggestQuery,
  inventory,
  exclude,
  disabled = false,
  placeholder,
  className,
  'data-field': dataField,
  onChange,
  onCommitFreeText,
  onPick,
  onBackspaceEmpty,
  onBlurCommit,
}: TagSuggestInputProps): ReactNode {
  const t = useT();
  const listId = useId();
  const listRef = useRef<HTMLUListElement | null>(null);
  const pickingRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const suggestions = useMemo(
    () => suggestTags(inventory, suggestQuery, { exclude }),
    [inventory, suggestQuery, exclude],
  );

  const showList = open && !disabled && suggestions.length > 0;
  const safeActive = showList ? Math.min(activeIndex, Math.max(suggestions.length - 1, 0)) : 0;

  useEffect(() => {
    if (!showList) return;
    const list = listRef.current;
    if (list === null) return;
    const item = list.querySelector<HTMLElement>(`[data-index="${String(safeActive)}"]`);
    item?.scrollIntoView({ block: 'nearest' });
  }, [safeActive, showList]);

  const pick = (tag: string): void => {
    pickingRef.current = true;
    onPick(tag);
    setOpen(false);
    setActiveIndex(0);
    // Release the flag after the blur from option mousedown has settled.
    queueMicrotask(() => {
      pickingRef.current = false;
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Escape' && showList) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown' && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
      return;
    }
    if (e.key === 'ArrowUp' && suggestions.length > 0) {
      e.preventDefault();
      setOpen(true);
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (e.key === 'Enter') {
      if (showList) {
        const hit = suggestions[safeActive];
        if (hit !== undefined) {
          e.preventDefault();
          pick(hit);
          return;
        }
      }
      // Always stop form submit so free-text commit cannot trigger
      // parent "Add task" / other submit handlers (composer vs view3).
      e.preventDefault();
      onCommitFreeText();
      return;
    }
    if (e.key === 'Backspace' && value === '' && onBackspaceEmpty !== undefined) {
      onBackspaceEmpty();
    }
  };

  const onBlur = (e: FocusEvent<HTMLInputElement>): void => {
    if (pickingRef.current) return;
    const next = e.relatedTarget;
    if (next instanceof Node && listRef.current?.contains(next) === true) return;
    setOpen(false);
    onBlurCommit?.();
  };

  return (
    <div className="emt-tag-suggest">
      <input
        id={id}
        className={className}
        type="text"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList ? `${listId}-opt-${String(safeActive)}` : undefined}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        data-field={dataField}
        onChange={(e) => {
          onChange(e.currentTarget.value);
          setOpen(true);
          setActiveIndex(0);
        }}
        onFocus={() => {
          setOpen(true);
          setActiveIndex(0);
        }}
        onKeyDown={onKeyDown}
        onBlur={onBlur}
      />
      {showList && (
        <ul
          ref={listRef}
          id={listId}
          className="emt-tag-suggest__list"
          role="listbox"
          aria-label={t('app.tags.suggest.label')}
          data-count={suggestions.length}
        >
          {suggestions.map((tag, index) => {
            const active = index === safeActive;
            return (
              <li key={tag.toLowerCase()} role="presentation">
                <button
                  type="button"
                  id={`${listId}-opt-${String(index)}`}
                  role="option"
                  aria-selected={active}
                  data-index={index}
                  data-tag-suggest={tag}
                  className="emt-tag-suggest__option"
                  data-active={active ? 'true' : 'false'}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(ev) => {
                    // Keep focus on the input so blur-commit does not race pick.
                    ev.preventDefault();
                    pick(tag);
                  }}
                >
                  {tag}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
