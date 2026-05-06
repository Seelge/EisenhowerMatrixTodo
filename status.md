# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.2 — Glow border primitive.

`packages/design-system/src/Glow.tsx` (new): tiny decorative wrapper. `<Glow color="q1|q2|q3|q4|accent">` renders a `<div data-emt-glow={color}>` with inline `box-shadow: var(--glow-${color})` and a default `border-radius: var(--radius-md)`. Both defaults compose with consumer `style` (consumer wins via spread order) and `className`/`aria-*`/etc. forward through `Omit<HTMLAttributes<HTMLDivElement>, 'color'>` (the `color` HTML attribute is replaced by the strict `Quadrant | 'accent'` prop). The component reads tokens via CSS variables — not by hardcoding `tokens.glow[color]` — so a future light-mode `<ThemeProvider>` re-skin works without prop changes. Exported from `src/index.ts` as `Glow`, `GlowColor`, `GlowProps`.

`packages/design-system/test/glow.test.tsx` (new): five color cases (q1–q4 + accent) parameterized over a `COLORS` array. Each case asserts the inline `boxShadow` is the matching `var(--glow-${color})` string, the default `borderRadius` is `var(--radius-md)`, the `data-emt-glow` attribute mirrors the color, and children render through. Two further cases: consumer `style.borderRadius` overrides the default; arbitrary div props (`className`, `aria-label`) forward to the rendered DOM. Reuses `test/render.ts` (React 18 `createRoot` + `act` helper) — no library dependency added.

7 new tests; 115 total (was 108). Typecheck, lint, format clean. The Glow box-shadow is already exercised visually by `preview.html`'s glow grid (q1–q4 + accent), satisfying the Step 3.2 done-when criterion.

**Next:** Phase 3 — Step 3.3 — Buttons, IconButton, FAB, Card. Material-3-behaving button family with custom styling, plus `Card` for surfaces. Outputs: components + a11y tests (focus-visible ring, role, `aria-label` requirement on icon-only). Done when tests are green and `jsx-a11y` lint stays clean.

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
