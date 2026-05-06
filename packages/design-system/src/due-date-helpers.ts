/**
 * Pure helpers for the due-date picker. Kept in a separate module so they
 * can be exercised under the node test environment without dragging in
 * React or DOM globals.
 *
 * All functions operate in *local* time — due dates are wall-clock dates
 * (the user means "this calendar day"), never UTC instants.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** Format a JS `Date` as YYYY-MM-DD using its local-time components. */
export function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Add `days` calendar days to `date`; returns a new `Date`. */
export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
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
