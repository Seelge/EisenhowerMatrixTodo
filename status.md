# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.3 — Buttons, IconButton, FAB, Card.

`packages/design-system/src/components.css` (new) + `src/components.ts` (new, `COMPONENT_CSS` string mirror) carry the M3-behaviored class layer: `.emt-button` (filled/tonal/outlined/text variants), `.emt-icon-button`, `.emt-fab`, `.emt-card`. Touch targets are 48 px (button, icon-button) / 56 px (fab) per the design-input spec. State layers use `filter: brightness()` for solid-bg variants and `color-mix(in oklab, …, transparent NN%)` for transparent-bg variants — kept in token-space, no hardcoded RGBs. `prefers-reduced-motion: reduce` zeroes out the `transition` and the FAB's hover translate. The two files are kept byte-identical by `test/components.test.ts` (drift guard, `// @vitest-environment node`, same pattern as `reset.test.ts`).

`ThemeProvider.tsx`: now injects `${RESET_CSS}\n${COMPONENT_CSS}` into the single `<style id="emt-theme-reset">` tag. Reset rules go first so component selectors can override (e.g., the reset's bare `button` rule). Existing ref-counted attach/detach is unchanged; one stylesheet, one mount-count.

`packages/design-system/src/Button.tsx` (new): `<Button variant="filled|tonal|outlined|text">`, defaults to `filled`. Defaults `type="button"` so the component is safe to drop inside a `<form>` without accidental submits — caller can opt into `type="submit"`. `packages/design-system/src/IconButton.tsx` (new): icon-only press target; `aria-label` is *required at the type level* via `Omit<ButtonHTMLAttributes<…>, 'aria-label'> & { 'aria-label': string }` — TS rejects `<IconButton>×</IconButton>` without a label. `packages/design-system/src/Fab.tsx` (new): same required-`aria-label` pattern; carries `--glow-accent` via the class. `packages/design-system/src/Card.tsx` (new): plain `<div class="emt-card">` surface, no required props.

`packages/design-system/test/button.test.tsx` (new, 12 cases): asserts default `type="button"`, four variant-class cases for `Button`, focusable + click-firing, click-blocked-when-disabled, caller `type` override, caller `className` preserved alongside the default; `IconButton` and `Fab` cases assert `aria-label` is forwarded to the DOM and the button is focusable; `Card` is a `<div>` with `emt-card`. `theme-provider.test.tsx`: extended with two regex assertions (`.emt-button`, `.emt-fab`) verifying the components layer is co-injected with the reset.

130 tests pass (was 115; +15: 12 a11y, 1 drift, 2 theme-provider). Typecheck, lint, format clean. `jsx-a11y` recommended rules pass — the type system carries the burden of enforcing icon-only `aria-label`, since `jsx-a11y` does not introspect custom components.

**Next:** Phase 3 — Step 3.4 — Sheet & SidePanel + responsive container. Bottom sheet (mobile), right-side panel (~480 px desktop) with focus trap and `Esc`-close; `ResponsiveSurface` picks one by viewport. Outputs: `Sheet.tsx`, `SidePanel.tsx`, `ResponsiveSurface.tsx`. Done when tests for both breakpoints pass and reduced-motion path gives instant open/close.

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
