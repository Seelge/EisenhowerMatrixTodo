# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.9 — `useReducedMotion` hook. **Closes Phase 3.**

`packages/design-system/src/useReducedMotion.ts` (new): tiny hook over `useSyncExternalStore` that subscribes to `window.matchMedia('(prefers-reduced-motion: reduce)')` and returns the current `matches` value. Same subscribe / getSnapshot / SSR-snapshot triple as `ResponsiveSurface`'s `useMatchMedia`. The SSR snapshot is `false` ("animations on") — the conservative default for first paint, since no user preference is available yet, and matches the design-input intent that the reduced-motion path is opt-in. The hook is the JS counterpart to the `@media (prefers-reduced-motion: reduce)` blocks already in `components.css`; pure CSS animations should keep using those blocks, but JS-driven motion (e.g., the view1↔view2 zoom morph in Phase 5) needs a runtime check.

`packages/design-system/test/use-reduced-motion.test.tsx` (new, 4 cases): matches=false branch returns `false`; matches=true branch returns `true`; the live-flip case fires a synthetic `change` event into the listener registry and asserts the next render reads `true`; the unmount case asserts the listener set is empty (the hook unsubscribes cleanly). Uses the same controllable `window.matchMedia` stub introduced for `ResponsiveSurface` tests — happy-dom's stub always reports `matches: false` and ignores listeners, so we override.

202 tests pass (was 198; +4). Typecheck, lint, format, secret scan clean.

**Phase 3 exit:** primitives ready (`Glow`, `Button`/`IconButton`/`Fab`/`Card`, `Sheet`/`SidePanel`/`ResponsiveSurface`, `Snackbar`, `QuadrantPicker`, `DueDatePicker`, `Skeleton`/`EmptyNote`/`ErrorBanner`, `useReducedMotion`); 202 tests guarding them. Views can now compose them with no view-specific code yet.

**Next:** Phase 4 — Step 4.1 — Root shell. `<App />` mounts `<ThemeProvider>` → `<QueryClientProvider>` → `<Router>` → `<ErrorBoundary>` → `<I18nProvider>` → `<Routes>`. Outputs: `packages/app/src/App.tsx`, `packages/app/src/i18n/{provider.tsx,strings.en.ts,t.ts}`. Done when the app renders a placeholder home page with the dark theme applied.

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
