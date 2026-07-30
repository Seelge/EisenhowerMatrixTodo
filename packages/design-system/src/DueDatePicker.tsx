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

export interface DueDatePickerLabels {
  readonly today: string;
  readonly tomorrow: string;
  readonly weekend: string;
  readonly nextWeek: string;
  readonly none: string;
  readonly quickGroup: string;
  readonly pickDate: string;
}

const DEFAULT_LABELS: DueDatePickerLabels = {
  today: 'Today',
  tomorrow: 'Tomorrow',
  weekend: 'This weekend',
  nextWeek: 'Next week',
  none: 'No date',
  quickGroup: 'Quick due dates',
  pickDate: 'Pick a date',
};

export interface DueDatePickerProps {
  /** ISO date string (`YYYY-MM-DD`) or `null` for no due date. */
  value: string | null;
  onChange: (next: string | null) => void;
  /** Override "today" for tests or for backends with their own clock. */
  today?: Date;
  /** BCP-47 locale tag; controls the first day of the week. */
  locale?: string;
  /** Optional i18n labels; defaults to English. */
  labels?: Partial<DueDatePickerLabels>;
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

function buildPresets(today: Date, locale: string, labels: DueDatePickerLabels): readonly Preset[] {
  return [
    { key: 'today', label: labels.today, value: formatLocalDate(today) },
    { key: 'tomorrow', label: labels.tomorrow, value: formatLocalDate(addDays(today, 1)) },
    {
      key: 'weekend',
      label: labels.weekend,
      value: formatLocalDate(computeWeekendDate(today)),
    },
    {
      key: 'next-week',
      label: labels.nextWeek,
      value: formatLocalDate(computeNextWeekDate(today, locale)),
    },
    { key: 'none', label: labels.none, value: null },
  ];
}

export function DueDatePicker({
  value,
  onChange,
  today,
  locale,
  labels: labelOverrides,
}: DueDatePickerProps): ReactNode {
  const now = today ?? new Date();
  const loc = locale ?? defaultLocale();
  const labels: DueDatePickerLabels = { ...DEFAULT_LABELS, ...labelOverrides };
  const presets = buildPresets(now, loc, labels);

  const handleNative = (e: ChangeEvent<HTMLInputElement>): void => {
    onChange(e.target.value === '' ? null : e.target.value);
  };

  return (
    <div className="emt-due-date-picker">
      <div className="emt-due-date-picker__presets" role="group" aria-label={labels.quickGroup}>
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
        aria-label={labels.pickDate}
        value={value ?? ''}
        onChange={handleNative}
      />
    </div>
  );
}
