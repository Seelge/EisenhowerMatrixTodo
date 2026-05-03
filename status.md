# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 1.6 — Design tokens.

`packages/design-system/src/tokens.ts`: typed `tokens` object with `color` (bg, surface, surface-elevated, text-primary/secondary, accent, q1-q4, error), `space` (xs–3xl), `radius` (sm/md/lg/pill), `font` (family sans+mono, size scale, weights, line heights), `motion` (duration short/medium/long, easing standard/emphasized/decelerated/accelerated), `glow` (q1-q4 + accent — outer halo + inner shadow), `layer` (z-index ladder).

`packages/design-system/src/tokens.css`: CSS custom properties mirroring the TS values; `color-scheme: dark` and a `prefers-reduced-motion: reduce` override that zeroes out durations.

`packages/design-system/src/types.ts`: re-exports the token-derived types (`ColorToken`, `SpaceToken`, etc.).

`packages/design-system/preview.html`: standalone preview page that loads `tokens.css` and renders swatches for color, glow, space, radius, type scale, and motion. Open in a browser to visually verify (manual).

`test/tokens.test.ts`: asserts palette format, every quadrant has a matching glow with the right RGB, monotonic space and motion scales.

17 tests pass; all checks clean.

**Next:** Step 1.7 — Route + view-state contract in `packages/app/src/routes/contract.ts`. Closes Phase 1.

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
