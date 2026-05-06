# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.7 — Due-date picker.

`packages/design-system/src/due-date-helpers.ts` (new): pure date math, no React/DOM dependencies, so the helpers can be unit-tested under the node test environment. Exports:
  - `formatLocalDate(d)` — `YYYY-MM-DD` from local-time fields (due dates are wall-clock, never UTC instants).
  - `addDays(d, n)` — local-time-safe day arithmetic.
  - `computeWeekendDate(today)` — "this weekend" is the upcoming Saturday, except on Sat/Sun where it's today (the user is already inside the weekend).
  - `getFirstDayOfWeek(locale)` — uses `Intl.Locale.prototype.getWeekInfo()` where available (Node 24 ✓) and remaps CLDR's `firstDay` (1..7, 7 = Sunday) to JS's `getDay()` (0 = Sunday); falls back to ISO 8601 Monday on unknown locales or older runtimes.
  - `computeNextWeekDate(today, locale)` — next occurrence of the locale's first weekday. If today *is* the first weekday, returns one full week ahead so "Next week" never resolves to today.

`packages/design-system/src/DueDatePicker.tsx` (new): controlled `<DueDatePicker value onChange today? locale?>`. Renders five preset buttons (`<Button>`) — Today, Tomorrow, This weekend, Next week, No date — followed by `<input type="date">` for precise picks. Selected preset (matched by ISO string equality with `value`) renders as `variant="filled"`; the others use `variant="tonal"`; both states also set `aria-pressed`. The native input mirrors `value` and emits `null` when cleared. `today` and `locale` are injectable for test determinism; defaults are `new Date()` and `navigator.language` (or `'en-US'`).

`packages/design-system/src/components.css` + `components.ts`: extended with `.emt-due-date-picker` (column flex), `.emt-due-date-picker__presets` (wrap-flex row), and `.emt-due-date-picker__native` (full-width 48 px input on the dark surface, `color-scheme: dark` so the native picker chrome inherits the theme). Drift guard kept byte-identical.

`packages/design-system/test/due-date-helpers.test.ts` (new, 14 cases, node env): `formatLocalDate` zero-pads and uses local-time; `addDays` advances and rolls across month boundaries; `computeWeekendDate` covers Mon/Wed (the "Saturday upcoming" canonical case from the done-when), Fri, Sat, Sun; `getFirstDayOfWeek` returns 0 for `en-US`, 1 for `de-DE`, 1 for unknown locales; `computeNextWeekDate` covers the Sun-first vs Mon-first split *and* the "today is the first day" edge cases (returns +7, never today).

`packages/design-system/test/due-date-picker.test.tsx` (new, 11 cases, happy-dom): each preset has its own case (Today → 2026-05-06, Tomorrow → +1, This weekend → upcoming Sat, Next week → upcoming Mon under `de-DE`, No date → `null`); the matching preset carries `aria-pressed="true"` and the `emt-button--filled` class while the others use `emt-button--tonal`; clicking a preset flips the filled variant; the native input mirrors `value` and emits both new values and `null` on clear. The native-input test uses `Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set` to bypass React 18's value-setter patch — assigning `input.value` directly silently no-ops the synthetic onChange.

188 tests pass (was 163; +25). Typecheck, lint, format, secret scan clean.

**Next:** Phase 3 — Step 3.8 — Loading / empty / error primitives. Standardized states. Outputs: `Skeleton.tsx`, `EmptyNote.tsx` (the muted-grey "empty" note from view2), `ErrorBanner.tsx`. Done when component tests pass.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

None outstanding. (Pages live at `https://seelge.github.io/EisenhowerMatrixTodo/`. CI and Deploy workflows confirmed green; Node 24 opt-in env added so the deprecation warning is gone.)

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. If still in planning mode (per "Phase" above), continue from "Next" above.
4. If in implementation mode, find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
