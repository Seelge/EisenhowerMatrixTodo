# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.6 — Quadrant picker (2 × 2).

`packages/design-system/src/QuadrantPicker.tsx` (new): controlled `<QuadrantPicker value onChange labels? aria-label?>`. The 2 × 2 grid is laid out spatially via CSS `grid-template-areas` matching the matrix axes from design-input.md (Important ↑ / Urgent →): q2 Schedule / q1 Do on the top row, q4 Delete / q3 Delegate on the bottom. Tab/reading order is q2, q1, q4, q3 (TL → TR → BL → BR).

Implements the WAI-ARIA radio-group pattern:
  - Container `<div role="radiogroup" aria-label="Quadrant">` (label overridable). The group itself is *not* focusable — only the currently-checked radio is in tab order via a roving `tabIndex={0}` (others get `-1`). The `jsx-a11y/interactive-supports-focus` rule is suppressed at that line with a comment because its heuristic does not model the radio-group pattern.
  - Each cell is a `<button type="button" role="radio" aria-checked={value === q} data-emt-quadrant={q}>` with the per-quadrant class hook (`emt-quadrant-picker__cell--{q1..q4}`). Selected cells light up via the matching `--glow-{q1..q4}` token through an `[aria-checked='true']` selector — selection is a single source-of-truth driven by `value`, no separate "active" state.
  - Click → `onChange(q)`.
  - Arrow keys move both selection and focus *spatially*, not as a 1-D radio cycle: ArrowRight from q2 → q1, ArrowDown from q2 → q4, ArrowLeft from q1 → q2, ArrowUp from q3 → q1, etc. Arrows clamp at the grid boundary rather than wrapping (with only 2 × 2, "right from the rightmost column" wrapping to the next row would be confusing). The neighbor lookup is a static `Record<Quadrant, Record<ArrowKey, Quadrant>>` so it cannot drift from the visual layout. Focus moves via `queueMicrotask(() => cellRefs.current[next]?.focus())` so the new `aria-checked` state is committed before the browser hands focus over.
  - Non-arrow keys are ignored — no `preventDefault`, no `onChange`, so input controls inside a parent form continue to receive their keystrokes.

`packages/design-system/src/components.css` + `components.ts`: extended with `.emt-quadrant-picker` (grid container, 240 px max width, 1 : 1 aspect ratio), `.emt-quadrant-picker__cell` (transparent surface, secondary-text color, transition on box-shadow/color/border), and four `[aria-checked='true']` rules wiring each cell to its `--glow-q{1..4}`. The reduced-motion block adds `.emt-quadrant-picker__cell` to the `transition: none` selector list. Drift guard (`components.test.ts`) keeps the two byte-identical.

`packages/design-system/test/quadrant-picker.test.tsx` (new, 11 cases): renders the radiogroup with the four expected labels in TL/TR/BL/BR order; aria-checked is set on exactly one radio and only that radio carries `tabIndex=0`; clicking a cell drives `onChange` and re-renders the picker with the new selection; arrow keys produce the spatially correct neighbor (cases for ArrowRight/Down/Left/Up); ArrowRight from q1 (rightmost-top) is a no-op (boundary clamp); non-arrow keys are ignored and don't `preventDefault`; custom `labels` and custom `aria-label` are honored. A small `<Host>` test wrapper holds local state so `onChange` actually flips the picker — matching how callers will use it.

163 tests pass (was 152; +11). Typecheck, lint, format, secret scan clean.

**Next:** Phase 3 — Step 3.7 — Due-date picker. Quick-pick row ("Today / Tomorrow / This weekend / Next week / No date") + native `<input type="date">` fallback. Outputs: `DueDatePicker.tsx`. Done when each preset has a test and the locale-aware "weekend" computation has its own unit test (Saturday upcoming).

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
