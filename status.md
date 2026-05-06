# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.4 — Sheet & SidePanel + responsive container.

`packages/design-system/src/dialog-behavior.ts` (new): the `useDialogBehavior(open, onClose, ref)` hook is the shared modal contract used by both `<Sheet>` and `<SidePanel>`. On open it captures `document.activeElement`, moves focus to the first focusable inside the dialog (or the dialog root via its `tabIndex={-1}` if there is none), then registers a `document` keydown listener that (a) closes on `Escape` and (b) traps `Tab` / `Shift+Tab` to wrap between the first and last focusables. On close (effect cleanup) it restores focus to the previously-focused element if it's still in the DOM. `onClose` is read through a ref so a parent re-rendering with a fresh inline lambda doesn't re-run the trap effect and stomp focus — the ref is synced via a *separate* effect (lint-clean: no ref-write during render). The focusable selector list mirrors the WAI-ARIA recipe (`a[href]`, enabled `button`/`input`/`select`/`textarea`, `[tabindex]:not([tabindex="-1"])`).

`packages/design-system/src/Sheet.tsx` (new): renders nothing while `open=false`. While open, mounts a `.emt-scrim` overlay + a `.emt-sheet` `<div role="dialog" aria-modal="true" tabIndex={-1}>` containing the children. The scrim's `onClick={onClose}` is a redundant pointer convenience for the canonical keyboard `Esc`-close, so the two `jsx-a11y` rules (`click-events-have-key-events`, `no-static-element-interactions`) are disabled at that line with a comment explaining the rationale. `aria-label` is required at the type level via `Omit<HTMLAttributes<…>, 'aria-label' | 'role' | 'aria-modal'> & { 'aria-label': string }` — same pattern as `IconButton`.

`packages/design-system/src/SidePanel.tsx` (new): mirror of `Sheet` but renders the `.emt-side-panel` `<div role="dialog">` only — *no scrim*. Per design-input §view3: "the panel does not fully obscure the underlying matrix." 480 px wide (clamped to 100 vw), slides in from the right.

`packages/design-system/src/ResponsiveSurface.tsx` (new): picks `<SidePanel>` (≥ breakpoint) or `<Sheet>` (below) using `useSyncExternalStore` over `window.matchMedia('(min-width: ${breakpoint}px)')`. Default breakpoint 768 px. Subscribes to the `change` event so the surface flips live when the viewport crosses the breakpoint. SSR-safe (server snapshot is `false`).

`packages/design-system/src/components.css` + `components.ts`: extended with `.emt-scrim`, `.emt-sheet`, `.emt-side-panel`, three `@keyframes` (fade-in, slide-up, slide-left), and the reduced-motion block now also zeroes out their `animation`. Drift guard (`components.test.ts`) keeps the two byte-identical.

`packages/design-system/test/sheet.test.tsx` (new, 11 cases): Sheet — null when `open=false`; renders `role="dialog" aria-modal aria-label` + scrim when open; Esc closes; scrim click closes; focus moves into dialog and Tab/Shift+Tab wrap between first/last focusable; focus restores to the previously-focused button after unmount. SidePanel — renders without scrim and Esc-closes; null when closed. ResponsiveSurface — uses a per-test `window.matchMedia` mock with a controllable `matches` flag and a listener registry; below-breakpoint renders `.emt-sheet`, at-or-above renders `.emt-side-panel`. Reduced-motion — asserts the `@media (prefers-reduced-motion: reduce)` block in `COMPONENT_CSS` lists `.emt-sheet`, `.emt-side-panel`, `.emt-scrim` with `animation: none`.

141 tests pass (was 130; +11). Typecheck, lint, format, secret scan clean.

**Next:** Phase 3 — Step 3.5 — Snackbar with undo. `Snackbar` primitive with optional 5 s undo CTA; `SnackbarProvider` + `useSnackbar` hook. Done when test asserts undo within 5 s cancels the callback; otherwise it commits.

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
