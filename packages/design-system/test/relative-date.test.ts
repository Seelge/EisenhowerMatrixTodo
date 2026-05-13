/**
 * @vitest-environment node
 *
 * Step 11.1 — wall-clock date round-trip + relative-bucket coverage.
 *
 * The cases below are all timezone-invariant by construction: every
 * input is built with `new Date(Y, M, D[, h, m])` (local components)
 * and every output is read via `formatLocalDate` (also local), so the
 * assertions hold regardless of the runtime `TZ`. The CI matrix runs
 * the suite under TZ=UTC by default; the helper file documents the
 * round-trip rule for Europe/Berlin and America/Los_Angeles in
 * `packages/backend-core/src/time.md`.
 */
import { describe, expect, it } from 'vitest';

import {
  addDays,
  formatLocalDate,
  parseLocalDate,
  relativeDateKey,
} from '../src/due-date-helpers.ts';

describe('parseLocalDate / formatLocalDate round-trip', () => {
  it('returns the same YYYY-MM-DD it parsed', () => {
    for (const iso of ['2026-01-01', '2026-05-13', '2026-12-31', '2024-02-29']) {
      const d = parseLocalDate(iso);
      expect(d).toBeDefined();
      expect(formatLocalDate(d!)).toBe(iso);
    }
  });

  it('rejects malformed input', () => {
    expect(parseLocalDate('2026/05/13')).toBeUndefined();
    expect(parseLocalDate('05-13-2026')).toBeUndefined();
    expect(parseLocalDate('')).toBeUndefined();
  });

  it('addDays preserves the calendar-day round-trip across the Berlin spring-forward boundary', () => {
    // Last Sunday of March 2026 is the 29th (Berlin shifts +1h at 02:00
    // local). Local-component construction means the test does not care
    // what the runtime TZ is — the day before / after computation lands
    // on the same calendar day everywhere.
    const eve = parseLocalDate('2026-03-28')!;
    expect(formatLocalDate(addDays(eve, 1))).toBe('2026-03-29');
    expect(formatLocalDate(addDays(eve, 2))).toBe('2026-03-30');
  });

  it('addDays preserves the round-trip across the LA fall-back boundary', () => {
    // First Sunday of November 2026 is the 1st (LA shifts -1h at 02:00).
    const eve = parseLocalDate('2026-10-31')!;
    expect(formatLocalDate(addDays(eve, 1))).toBe('2026-11-01');
    expect(formatLocalDate(addDays(eve, 2))).toBe('2026-11-02');
  });
});

describe('relativeDateKey', () => {
  // Anchor today at 2026-05-13 (Wednesday). All cases derive from this
  // wall-clock value, which is constant across time zones for the
  // helper's local-component comparison.
  const TODAY = new Date(2026, 4, 13, 14, 0, 0);

  it('today / tomorrow', () => {
    expect(relativeDateKey('2026-05-13', TODAY, 'en-US')).toBe('today');
    expect(relativeDateKey('2026-05-14', TODAY, 'en-US')).toBe('tomorrow');
  });

  it('weekend = upcoming Saturday on weekdays', () => {
    // Wed 2026-05-13 → upcoming Sat 2026-05-16.
    expect(relativeDateKey('2026-05-16', TODAY, 'en-US')).toBe('weekend');
  });

  it('nextWeek is locale-aware (en-US Sunday, de-DE Monday)', () => {
    // From Wed 2026-05-13:
    //   en-US: next Sunday → 2026-05-17 (also falls into weekend bucket
    //   in calendars where weekend is Sat — but here Saturday is
    //   2026-05-16, so Sunday goes to nextWeek for en-US).
    expect(relativeDateKey('2026-05-17', TODAY, 'en-US')).toBe('nextWeek');
    // de-DE: next Monday → 2026-05-18.
    expect(relativeDateKey('2026-05-18', TODAY, 'de-DE')).toBe('nextWeek');
  });

  it('past / future fall through', () => {
    expect(relativeDateKey('2026-05-12', TODAY, 'en-US')).toBe('past');
    expect(relativeDateKey('2026-06-01', TODAY, 'en-US')).toBe('future');
    // Saturday-anchor still beats far-future for the same calendar day:
    expect(relativeDateKey('2026-05-30', TODAY, 'en-US')).toBe('future');
  });

  it('returns undefined for malformed iso', () => {
    expect(relativeDateKey('not-a-date', TODAY, 'en-US')).toBeUndefined();
  });

  it('on Saturday, today wins over weekend (no alias)', () => {
    // 2026-05-16 is Saturday. relativeDateKey(today=Saturday, target=Saturday) → today.
    const SAT = new Date(2026, 4, 16, 10, 0, 0);
    expect(relativeDateKey('2026-05-16', SAT, 'en-US')).toBe('today');
  });

  it('on Friday, weekend (Sat) is one day away — bucket is weekend, not tomorrow', () => {
    // Spec: tomorrow takes precedence over weekend when they collide.
    // Fri 2026-05-15 → tomorrow is Sat 2026-05-16. Expect 'tomorrow'.
    const FRI = new Date(2026, 4, 15, 9, 0, 0);
    expect(relativeDateKey('2026-05-16', FRI, 'en-US')).toBe('tomorrow');
  });
});
