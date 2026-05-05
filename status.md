# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.1 — Theme provider + CSS reset.

`packages/design-system/src/ThemeProvider.tsx` (new): React component that wraps `children` in a `<div data-emt-theme="dark">` whose inline style carries every design token as a CSS custom property (`--color-bg`, `--color-q1…q4`, `--space-*`, `--font-*`, `--motion-*`, `--glow-*`, `--layer-*`) plus `color-scheme: dark`. The variables flow to descendants via the cascade. On mount, the component appends a single `<style id="emt-theme-reset">` to `document.head` containing the reset rules; mounts are ref-counted so multiple `<ThemeProvider>` instances share one stylesheet, and the last unmount removes it. SSR-safe (`typeof document` guard).

`packages/design-system/src/reset.css` (new): minimal modern reset — `box-sizing: border-box`, zero margins/padding, full-height `html/body/#root`, body uses the token vars (`--font-family-sans`, `--color-bg`, `--color-text-primary`), block media, focus-visible ring sourced from `--color-accent`. `packages/design-system/src/reset.ts` (new) exports `RESET_CSS` as a string mirror, used at runtime by `ThemeProvider`. The two are kept byte-identical by `test/reset.test.ts` (drift guard, forced `// @vitest-environment node` because happy-dom rewrites `import.meta.url` to a non-file scheme).

`packages/design-system/test/theme-provider.test.tsx` (new): integration test under `happy-dom`, using a tiny `test/render.ts` helper (React 18 `createRoot` + `act`, no `@testing-library/react` dependency). Asserts (1) a child wrapped in `<ThemeProvider>` finds `--color-bg`, `--color-q1…q4`, `--glow-q2` (multi-segment box-shadow with rgba commas survives intact), and `color-scheme: dark` on the wrapper, (2) two stacked `<ThemeProvider>`s mount only one `<style id="emt-theme-reset">` and the last unmount removes it.

`packages/design-system/vitest.config.ts`: switched to `environment: 'happy-dom'`. `package.json`: adds `react`/`react-dom`/`@types/react`/`@types/react-dom`/`happy-dom` as devDependencies and `react ^18.3.1` as a peerDependency.

108 tests pass overall (was 105; +3 in design-system: 2 ThemeProvider, 1 drift guard); typecheck, lint, format clean. The token preview page (`packages/design-system/preview.html`) already renders in the dark palette via `tokens.css` at `:root`, satisfying the Step 3.1 done-when criterion.

**Next:** Phase 3 — Step 3.2 — Glow border primitive: `<Glow color="q1|q2|q3|q4" />` (or a CSS utility) renders the futuristic glow border using `--glow-*`. Outputs: `Glow.tsx` + tests for the four quadrant colors. Done when visual snapshots per color exist.

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
