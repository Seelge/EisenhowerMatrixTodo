/**
 * @vitest-environment node
 *
 * Pure-helper tests for the due-date picker. The done-when criterion
 * for Step 3.7 calls out the locale-aware "weekend" computation
 * (Saturday upcoming) and a preset-per-case sweep — done here at the
 * helper level (the component tests in `due-date-picker.test.tsx` then
 * verify they're wired up correctly).
 */
import { describe, expect, it } from 'vitest';

import {
  addDays,
  computeNextWeekDate,
  computeWeekendDate,
  formatLocalDate,
  getFirstDayOfWeek,
} from '../src/due-date-helpers.ts';

describe('formatLocalDate', () => {
  it('zero-pads single-digit month and day', () => {
    expect(formatLocalDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(formatLocalDate(new Date(2026, 11, 31))).toBe('2026-12-31');
  });

  it('uses local-time fields, not UTC', () => {
    // 2026-05-06 in local time, regardless of host timezone.
    const d = new Date(2026, 4, 6, 23, 59, 59);
    expect(formatLocalDate(d)).toBe('2026-05-06');
  });
});

describe('addDays', () => {
  it('advances by the given number of days', () => {
    expect(formatLocalDate(addDays(new Date(2026, 4, 6), 1))).toBe('2026-05-07');
    expect(formatLocalDate(addDays(new Date(2026, 4, 6), 7))).toBe('2026-05-13');
  });

  it('rolls across month boundaries', () => {
    expect(formatLocalDate(addDays(new Date(2026, 4, 30), 3))).toBe('2026-06-02');
  });
});

describe('computeWeekendDate (Saturday upcoming)', () => {
  // 2026-05-06 is a Wednesday — three days from Saturday 2026-05-09.
  it('Wednesday → upcoming Saturday (+3 days)', () => {
    const wed = new Date(2026, 4, 6);
    expect(wed.getDay()).toBe(3);
    expect(formatLocalDate(computeWeekendDate(wed))).toBe('2026-05-09');
  });

  it('Friday → tomorrow Saturday (+1)', () => {
    const fri = new Date(2026, 4, 8);
    expect(fri.getDay()).toBe(5);
    expect(formatLocalDate(computeWeekendDate(fri))).toBe('2026-05-09');
  });

  it('Saturday → today (no change)', () => {
    const sat = new Date(2026, 4, 9);
    expect(sat.getDay()).toBe(6);
    expect(formatLocalDate(computeWeekendDate(sat))).toBe('2026-05-09');
  });

  it('Sunday → today (already inside the weekend)', () => {
    const sun = new Date(2026, 4, 10);
    expect(sun.getDay()).toBe(0);
    expect(formatLocalDate(computeWeekendDate(sun))).toBe('2026-05-10');
  });

  it('Monday → upcoming Saturday (+5)', () => {
    const mon = new Date(2026, 4, 4);
    expect(mon.getDay()).toBe(1);
    expect(formatLocalDate(computeWeekendDate(mon))).toBe('2026-05-09');
  });
});

describe('getFirstDayOfWeek', () => {
  it('returns 0 (Sunday) for en-US', () => {
    expect(getFirstDayOfWeek('en-US')).toBe(0);
  });

  it('returns 1 (Monday) for de-DE / ISO locales', () => {
    expect(getFirstDayOfWeek('de-DE')).toBe(1);
  });

  it('falls back to Monday for unknown locales', () => {
    expect(getFirstDayOfWeek('xx-zz')).toBe(1);
  });
});

describe('computeNextWeekDate', () => {
  // Wed 2026-05-06.
  it('en-US (Sun-first): Wed → upcoming Sunday (+4)', () => {
    expect(formatLocalDate(computeNextWeekDate(new Date(2026, 4, 6), 'en-US'))).toBe('2026-05-10');
  });

  it('de-DE (Mon-first): Wed → upcoming Monday (+5)', () => {
    expect(formatLocalDate(computeNextWeekDate(new Date(2026, 4, 6), 'de-DE'))).toBe('2026-05-11');
  });

  it('Mon-first: when today IS Monday, returns *next* Monday (+7), not today', () => {
    const mon = new Date(2026, 4, 4);
    expect(mon.getDay()).toBe(1);
    expect(formatLocalDate(computeNextWeekDate(mon, 'de-DE'))).toBe('2026-05-11');
  });

  it('Sun-first: when today IS Sunday, returns *next* Sunday (+7), not today', () => {
    const sun = new Date(2026, 4, 10);
    expect(sun.getDay()).toBe(0);
    expect(formatLocalDate(computeNextWeekDate(sun, 'en-US'))).toBe('2026-05-17');
  });
});
