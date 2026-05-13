/**
 * Pure helpers for the due-date picker. Kept in a separate module so they
 * can be exercised under the node test environment without dragging in
 * React or DOM globals.
 *
 * All functions operate in *local* time — due dates are wall-clock dates
 * (the user means "this calendar day"), never UTC instants.
 */

/** Format a JS `Date` as YYYY-MM-DD using its local-time components. */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse an `IsoDate` (YYYY-MM-DD) into a `Date` at local midnight.
 * Returns `undefined` for malformed input. We deliberately avoid
 * `new Date(iso)` because that parses YYYY-MM-DD as UTC midnight,
 * shifting backwards by the local offset in negative-offset zones.
 */
export function parseLocalDate(iso: string): Date | undefined {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * Add `days` calendar days to `date`; returns a new `Date`.
 *
 * Local-time correctness across DST: a "calendar day" is not the
 * same as 24 hours — on a fall-back day the local day has 25 hours,
 * so a fixed 24h ms shift would land back inside the same calendar
 * day. The implementation walks `Date(Y, M, D + days, …)` instead,
 * which the JS constructor normalises into the next calendar day
 * regardless of the wall-clock length. Hours/minutes/seconds of
 * the input are preserved (so callers can safely add days to a
 * mid-day reference without time drift).
 */
export function addDays(date: Date, days: number): Date {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
    date.getHours(),
    date.getMinutes(),
    date.getSeconds(),
    date.getMilliseconds(),
  );
}

/**
 * "This weekend" date — the upcoming Saturday, or today if today is
 * already Saturday or Sunday (the user is already inside the weekend).
 *
 * Saturday is JS `getDay()` value 6, Sunday is 0.
 */
export function computeWeekendDate(today: Date): Date {
  const dow = today.getDay();
  // Sat (6) or Sun (0): user is already in the weekend.
  if (dow === 6 || dow === 0) return today;
  return addDays(today, 6 - dow);
}

/**
 * Locale's first day of the week, as a JS `getDay()` value
 * (0 = Sunday, 1 = Monday … 6 = Saturday). Uses
 * `Intl.Locale.prototype.getWeekInfo()` where available; otherwise
 * falls back to ISO 8601 (Monday).
 *
 * CLDR's `firstDay` uses 1..7 with 7 = Sunday, so we re-map.
 */
export function getFirstDayOfWeek(locale: string): number {
  try {
    const loc = new Intl.Locale(locale);
    const info = (loc as unknown as { getWeekInfo?: () => { firstDay: number } }).getWeekInfo?.();
    if (info && typeof info.firstDay === 'number') {
      return info.firstDay === 7 ? 0 : info.firstDay;
    }
  } catch {
    // fall through to default
  }
  return 1;
}

/**
 * "Next week" date — the next occurrence of the locale's first day of
 * the week. If today *is* the first day, returns one full week ahead
 * (so "Next week" never resolves to today).
 */
export function computeNextWeekDate(today: Date, locale: string): Date {
  const firstDay = getFirstDayOfWeek(locale);
  const dow = today.getDay();
  let diff = (firstDay - dow + 7) % 7;
  if (diff === 0) diff = 7;
  return addDays(today, diff);
}

/**
 * Relative-label bucket for an `IsoDate` (YYYY-MM-DD) due date, relative
 * to a `today` reference (local wall-clock — typically `new Date()`).
 *
 * Buckets:
 *  - `'today'`     — the stored date matches today's calendar day.
 *  - `'tomorrow'`  — the day after today.
 *  - `'weekend'`   — the upcoming Saturday (when today is Mon–Fri).
 *  - `'nextWeek'`  — the next occurrence of the locale's first weekday,
 *                    strictly after today (and not already covered by
 *                    `tomorrow` / `weekend`).
 *  - `'past'`      — strictly before today.
 *  - `'future'`    — strictly after today and outside the named buckets.
 *
 * Returns `undefined` for malformed inputs.
 *
 * The comparison is done on local calendar components only — `today`
 * is normalised to local-midnight before the diff — so the result is
 * identical regardless of the runtime time zone for the same wall-clock
 * inputs. (DST shifts within the comparison window are also fine: see
 * `addDays`.)
 */
export type RelativeDateKey = 'today' | 'tomorrow' | 'weekend' | 'nextWeek' | 'past' | 'future';

export function relativeDateKey(
  iso: string,
  today: Date,
  locale: string,
): RelativeDateKey | undefined {
  const target = parseLocalDate(iso);
  if (target === undefined) return undefined;

  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (sameDate(target, todayMidnight)) return 'today';
  if (sameDate(target, addDays(todayMidnight, 1))) return 'tomorrow';
  if (target.getTime() < todayMidnight.getTime()) return 'past';

  const weekend = computeWeekendDate(todayMidnight);
  // 'weekend' wins only on weekdays (Sat/Sun would alias to 'today').
  if (!sameDate(weekend, todayMidnight) && sameDate(target, weekend)) return 'weekend';

  const nextWeek = computeNextWeekDate(todayMidnight, locale);
  if (sameDate(target, nextWeek)) return 'nextWeek';

  return 'future';
}

function sameDate(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
