# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.8 — Loading / empty / error primitives.

`packages/design-system/src/Skeleton.tsx` (new): `<Skeleton width? height? variant?>` — decorative `<div aria-hidden="true" class="emt-skeleton">`. `width`/`height` accept `string | number` (numbers coerce to `px`); `variant="circle"` adds `emt-skeleton--circle` (full-radius). When width/height are omitted, no inline style is emitted (so callers can size via the parent's flex/grid). The shimmer is a CSS background-position keyframe and is zeroed out by the `prefers-reduced-motion` block.

`packages/design-system/src/EmptyNote.tsx` (new): `<EmptyNote>...</EmptyNote>` renders as a `<p class="emt-empty-note">` — centered, italic, secondary-text color. The "muted-grey 'nothing here yet' note" called out in design-input §view2.

`packages/design-system/src/ErrorBanner.tsx` (new): `<ErrorBanner message onRetry? retryLabel?>` renders `<div role="alert" class="emt-error-banner">` so AT announces it the moment it appears; the message lives in `.emt-error-banner__message`; when `onRetry` is provided, a tonal Retry button (`<Button variant="tonal">`) is rendered alongside, label overridable via `retryLabel`. The background is the error color tinted into the surface (`color-mix(in oklab, var(--color-error), transparent 88%)`) plus a 1 px error-color border — destructive-feeling but not opaque.

`packages/design-system/src/components.css` + `components.ts`: extended with `.emt-skeleton` (linear-gradient shimmer + 1.4 s keyframe), `.emt-skeleton--circle`, `.emt-empty-note`, `.emt-error-banner` + `__message`. The reduced-motion block adds `.emt-skeleton` to the `animation: none` selector list. Drift guard kept byte-identical.

`packages/design-system/test/states.test.tsx` (new, 10 cases): Skeleton — `aria-hidden`, numeric coercion to `px`, raw CSS string passthrough, circle variant, no inline style without props, reduced-motion override at the COMPONENT_CSS string level. EmptyNote — renders as `<p>` with the class, forwards children, preserves caller className. ErrorBanner — `role="alert"` with the message, no button absent `onRetry`, Retry button fires `onRetry` and uses the tonal variant, custom `retryLabel` honored.

198 tests pass (was 188; +10). Typecheck, lint, format, secret scan clean.

**Next:** Phase 3 — Step 3.9 — `useReducedMotion` hook. Centralize `prefers-reduced-motion` detection. Outputs: `useReducedMotion.ts` + test using a mocked media query. Done when both branches (matches=true and matches=false) are covered. **Closes Phase 3** — primitives ready, views compose them with no view-specific code yet.

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
