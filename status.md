# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 4.2 — Router & view-state coordinator.

`packages/app/src/state/view-state.ts` (new): Zustand store of `ViewState` plus `navigate`, `replace`, `syncFromUrl` actions. Hook helpers `useViewState()` and `useNavigate()` are the consumer-facing surface. The store is initialized eagerly from `parseUrl(readInternalPath())` so deep-links (e.g. `/q/Q2?task=abc&from=quadrant`) hydrate the first render — without eager init the children would render the matrix view for one frame before the Router's `useEffect` could re-sync, which is visibly wrong on a deep-link load.

URL ↔ store invariant: the URL is the source of truth. `navigate` calls `pushState` then `set({state})`; `replace` calls `replaceState` then `set({state})`; `syncFromUrl` re-reads from `window.location` and `set({state})`. Browsers do not fire `popstate` for `pushState`/`replaceState`, which is why the actions update the store themselves. `syncFromUrl` is what `popstate` calls.

Base-path handling: in production, Vite serves the app from `/EisenhowerMatrixTodo/`. The contract layer (`parseUrl`/`serializeUrl` in `routes/contract.ts`) only deals with internal paths (`/`, `/q/Q2`, …) so the store strips the `import.meta.env.BASE_URL` prefix on read and re-prefixes on write. That keeps the contract a pure function of the app's own URL space and avoids leaking the deployment base into route definitions. In dev/tests `BASE_URL` is `/`, so the prefix is empty and behavior is unchanged.

`packages/app/src/routes/Router.tsx` (rewritten, moved from `src/Router.tsx`): one `useEffect` on mount that (a) calls `syncFromUrl()` to handle the case where the URL changed between module load and mount (relevant for tests), and (b) attaches/removes a `popstate` listener that calls `syncFromUrl()`. The body is still a `<>{children}</>` pass-through — there's no per-render projection because the store *is* the projection.

`packages/app/src/routes/Routes.tsx` (rewritten, moved from `src/Routes.tsx`): switch over `state.zoom` rendering inline `MatrixPlaceholder` / `QuadrantPlaceholder` / `TaskFocusPlaceholder` components. The task-focus overlay is rendered alongside (not instead of) the underlying view when `focusedTaskId` is set — that's the contract: `focusedTaskId` is an overlay flag, not a separate route. Each placeholder carries `data-view` / `data-quadrant` / `data-task-id` attributes so tests can assert structure without depending on the placeholder text. Phase 5+ replaces these bodies with the real views.

i18n updates: dropped `app.home.*` keys in favor of `app.matrix.*`, `app.quadrant.*`, `app.task.*` (heading + placeholder pairs). Existing tests updated.

`packages/app/src/App.tsx`: import paths updated to `./routes/Router.js` and `./routes/Routes.js`. Provider chain unchanged.

New deps: `zustand@^5.0.13` added to `packages/app/package.json`.

Tests:
- `test/view-state.test.ts` (6 cases): `syncFromUrl` projects matrix root / quadrant route / deep-linked task overlay; `navigate` pushes a history entry and updates the store; `replace` swaps without growing the history stack; unknown paths degrade to the default state. Each test resets `window.location` via `replaceState` + `syncFromUrl` to isolate from the singleton store across runs.
- `test/router.test.tsx` (5 cases): mounts `Router` + `I18nProvider` + `Routes` and asserts: matrix placeholder at `/`; quadrant placeholder at `/q/Q2` with the right `data-quadrant`; deep-link `/q/Q2?task=abc&from=quadrant` renders both quadrant and task-focus elements simultaneously (the explicit "Done when" check from the plan); `navigate()` re-renders without a reload and updates `window.location`; manual `replaceState` + dispatched `popstate` re-syncs the store.

218 tests pass (was 207; +11). Typecheck clean, lint clean, format clean, Vite build clean (185 KB main chunk including zustand, 7 PWA precache entries), secret scan clean (the only "match" was a `data-task-id={taskId}` JSX attribute — false positive).

**Next:** Step 4.3 — Backend wiring + queries. Instantiate the backend registry with `LocalIndexedDbAdapter` registered as default; expose tasks via TanStack Query hooks (`useTasks(quadrant?)`, `useTask(id)`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useMigrateTask`); add a dev-only `/__debug` page that lists tasks and offers create/delete buttons. Outputs: `packages/app/src/state/backends.ts`, `packages/app/src/queries/tasks.ts`, plus debug page wiring. Done when the debug page can list, create, update, and delete tasks against IndexedDB.

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
