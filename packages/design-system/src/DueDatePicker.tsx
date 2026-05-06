/**
 * DueDatePicker — quick-pick row plus a native `<input type="date">`.
 *
 * Quick-picks: Today, Tomorrow, This weekend (upcoming Saturday),
 * Next week (locale's first weekday), No date. The currently-selected
 * value (matched by ISO date string) renders as `Button variant="filled"`;
 * the others render as `tonal`. The native input is the precise-pick
 * fallback; its value mirrors `value`.
 *
 * `today` and `locale` are injectable for test determinism but default
 * to `new Date()` and the document language (or `'en-US'`).
 */
import type { ChangeEvent, ReactNode } from 'react';

import { Button } from './Button.js';
import {
  addDays,
  computeNextWeekDate,
  computeWeekendDate,
  formatLocalDate,
} from './due-date-helpers.js';

export interface DueDatePickerProps {
  /** ISO date string (`YYYY-MM-DD`) or `null` for no due date. */
  value: string | null;
  onChange: (next: string | null) => void;
  /** Override "today" for tests or for backends with their own clock. */
  today?: Date;
  /** BCP-47 locale tag; controls the first day of the week. */
  locale?: string;
}

function defaultLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}

interface Preset {
  key: string;
  label: string;
  value: string | null;
}

function buildPresets(today: Date, locale: string): readonly Preset[] {
  return [
    { key: 'today', label: 'Today', value: formatLocalDate(today) },
    { key: 'tomorrow', label: 'Tomorrow', value: formatLocalDate(addDays(today, 1)) },
    { key: 'weekend', label: 'This weekend', value: formatLocalDate(computeWeekendDate(today)) },
    {
      key: 'next-week',
      label: 'Next week',
      value: formatLocalDate(computeNextWeekDate(today, locale)),
    },
    { key: 'none', label: 'No date', value: null },
  ];
}

export function DueDatePicker({ value, onChange, today, locale }: DueDatePickerProps): ReactNode {
  const now = today ?? new Date();
  const loc = locale ?? defaultLocale();
  const presets = buildPresets(now, loc);

  const handleNative = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.value === '' ? null : e.target.value);
  };

  return (
    <div className="emt-due-date-picker">
      <div className="emt-due-date-picker__presets" role="group" aria-label="Quick due dates">
        {presets.map((preset) => {
          const selected = preset.value === value;
          return (
            <Button
              key={preset.key}
              variant={selected ? 'filled' : 'tonal'}
              data-emt-preset={preset.key}
              aria-pressed={selected}
              onClick={() => onChange(preset.value)}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>
      <input
        type="date"
        className="emt-due-date-picker__native"
        aria-label="Pick a date"
        value={value ?? ''}
        onChange={handleNative}
      />
    </div>
  );
}
