/**
 * QuadrantPicker — accessible 2 × 2 radio group for choosing a quadrant.
 *
 * Spatial layout matches the matrix axes from `design-input.md`
 * (Important ↑, Urgent →):
 *
 *     +-----------+-----------+
 *     | q2 Sched. | q1 Do     |
 *     +-----------+-----------+
 *     | q4 Delete | q3 Deleg. |
 *     +-----------+-----------+
 *
 * Implements the WAI-ARIA radio-group pattern: only the checked option
 * is in the tab order (`tabIndex=0`); arrows move both focus and
 * selection. Arrows clamp at the grid boundary rather than wrapping —
 * with a 2 × 2 layout, the user expects "right from the rightmost
 * column does nothing" rather than wrapping across rows.
 */
import { useRef, type KeyboardEvent, type ReactNode } from 'react';

import type { Quadrant } from './tokens.js';

const LABELS: Record<Quadrant, string> = {
  q1: 'Do',
  q2: 'Schedule',
  q3: 'Delegate',
  q4: 'Delete',
};

const TAB_ORDER: readonly Quadrant[] = ['q2', 'q1', 'q4', 'q3'];

type ArrowKey = 'ArrowUp' | 'ArrowDown' | 'ArrowLeft' | 'ArrowRight';

const NEIGHBOR: Record<Quadrant, Record<ArrowKey, Quadrant>> = {
  q2: { ArrowUp: 'q2', ArrowDown: 'q4', ArrowLeft: 'q2', ArrowRight: 'q1' },
  q1: { ArrowUp: 'q1', ArrowDown: 'q3', ArrowLeft: 'q2', ArrowRight: 'q1' },
  q4: { ArrowUp: 'q2', ArrowDown: 'q4', ArrowLeft: 'q4', ArrowRight: 'q3' },
  q3: { ArrowUp: 'q1', ArrowDown: 'q3', ArrowLeft: 'q4', ArrowRight: 'q3' },
};

function isArrowKey(key: string): key is ArrowKey {
  return key === 'ArrowUp' || key === 'ArrowDown' || key === 'ArrowLeft' || key === 'ArrowRight';
}

export interface QuadrantPickerProps {
  value: Quadrant;
  onChange: (quadrant: Quadrant) => void;
  /** Override the default label per quadrant (e.g., for i18n). */
  labels?: Partial<Record<Quadrant, string>>;
  /** Accessible name for the radio group (e.g., "Quadrant"). */
  'aria-label'?: string;
}

export function QuadrantPicker({
  value,
  onChange,
  labels,
  'aria-label': ariaLabel,
}: QuadrantPickerProps): ReactNode {
  const cellRefs = useRef<Record<Quadrant, HTMLButtonElement | null>>({
    q1: null,
    q2: null,
    q3: null,
    q4: null,
  });

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (!isArrowKey(e.key)) return;
    e.preventDefault();
    const next = NEIGHBOR[value][e.key];
    if (next === value) return;
    onChange(next);
    // Defer the focus move so React has rendered the new aria-checked
    // state before the browser hands focus over.
    queueMicrotask(() => cellRefs.current[next]?.focus());
  };

  return (
    // Per the WAI-ARIA radio-group pattern, the group container is not
    // itself focusable — focus lives on the currently-checked radio via a
    // roving tabindex (assigned below). The keydown listener is on the
    // group only so arrow events bubbling from any radio reach the same
    // handler; jsx-a11y's interactive-supports-focus heuristic does not
    // model that pattern, so we suppress it here.
    // eslint-disable-next-line jsx-a11y/interactive-supports-focus
    <div
      role="radiogroup"
      aria-label={ariaLabel ?? 'Quadrant'}
      className="emt-quadrant-picker"
      onKeyDown={handleKeyDown}
    >
      {TAB_ORDER.map((q) => {
        const checked = q === value;
        return (
          <button
            key={q}
            ref={(el) => {
              cellRefs.current[q] = el;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            data-emt-quadrant={q}
            className={`emt-quadrant-picker__cell emt-quadrant-picker__cell--${q}`}
            onClick={() => onChange(q)}
          >
            {labels?.[q] ?? LABELS[q]}
          </button>
        );
      })}
    </div>
  );
}
