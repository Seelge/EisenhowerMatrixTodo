# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 4.1 — Root shell.

`packages/app/src/App.tsx` now composes the provider chain spelled out in the plan: `<ThemeProvider>` → `<QueryClientProvider>` → `<Router>` → `<ErrorBoundary>` → `<I18nProvider>` → `<Routes>`. The `QueryClient` is created lazily via `useState(() => new QueryClient(...))` so React StrictMode's double-invocation of the function body doesn't construct two clients; `retry: false` and `refetchOnWindowFocus: false` are set as conservative defaults to be revisited when real queries land in 4.3.

`packages/app/src/i18n/strings.en.ts`, `t.ts`, `provider.tsx` (new): flat-key string table (`'app.home.heading'` style) typed `as const satisfies Record<string, string>`, a narrowly-typed `Translator = (key: StringKey) => string`, and an `I18nProvider` whose context default is the English `t`. That default matters — components rendered outside the provider (notably the ErrorBoundary fallback, which sits *outside* `I18nProvider` per the chain) still get translated strings, and tests can stub the translator without monkey-patching modules.

`packages/app/src/ErrorBoundary.tsx` (new): class component using `getDerivedStateFromError` + `componentDidCatch`. The fallback renders the design-system `ErrorBanner` with a Reload action that calls `window.location.reload()`. Reload (rather than `setState({ error: null })` reset) is intentional at this stage: with no real state below the boundary yet, a full reload is the simplest "back to known-good" recovery; finer-grained reset can come with view5+.

`packages/app/src/Router.tsx`, `Routes.tsx` (new): placeholders. `Router` is a structural pass-through (`<>{children}</>`); `Routes` renders an `<h1>`/`<p>` home placeholder driven by `useT`. Step 4.2 replaces both bodies.

`packages/app/src/main.tsx`: unchanged — already mounted `<App />` inside `<StrictMode>`.

Wiring changes: added `@emt/design-system` (workspace) and `@tanstack/react-query@^5.62.7` to `packages/app/package.json` deps; added `happy-dom@^20.0.10` to dev deps; flipped `packages/app/vitest.config.ts` to `environment: 'happy-dom'`. Added `main` / `types` / `exports` / `files` fields to `packages/design-system/package.json` so workspace consumers can import it as a normal package (it had only `name` + `type: "module"` before, which is enough for tooling that walks `src/` but not for `import { ThemeProvider } from '@emt/design-system'`).

Tests: `packages/app/test/render.ts` (mirror of the design-system one), `i18n.test.tsx` (3 cases: default `t` resolves a known key; `useT` outside the provider falls back to English; `useT` inside the provider returns the stubbed translator), `app.test.tsx` (2 cases: `<App />` mounts the dark theme and renders the home placeholder; `<ErrorBoundary>` surfaces the translated fallback when a child throws — `console.error` is suppressed inside the throw to keep CI logs clean).

207 tests pass (was 202; +5). Typecheck clean (root `tsc -b` plus `pnpm --filter @emt/app exec tsc`), lint clean, format clean, Vite build clean (181 KB main chunk, 7 PWA precache entries), secret scan clean.

**Next:** Step 4.2 — Router & view-state coordinator. Implement routes from Step 1.7 with a Zustand store mirroring `ViewState`; URL is the source of truth, store is the projection. Outputs: `packages/app/src/routes/`, `packages/app/src/state/view-state.ts`. Done when browser back/forward preserves state and `/q/Q2?task=abc` deep-links into view3 over view2/Q2.

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
