# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 4.4 — First-run flow.

`packages/app/src/onboarding/first-run.ts` (new): `runFirstRunSeed()` reads a meta flag (`META_FIRST_RUN_KEY = 'firstRunCompleted'`); on absence, inserts three sample tasks (Q1 high-priority open, Q2 normal-priority open, Q4 done with a `completedAt`) via the registry's default adapter, then writes the flag. Idempotency layered: a module-level `inFlight` promise guard coalesces concurrent calls within a single page load (matters because React StrictMode double-mounts the effect in dev), and the meta flag handles the across-reload case. On error the in-flight cache is dropped so a later call can retry — the meta flag was never written, so re-running is safe. `__resetFirstRunForTesting()` resets the guard for tests.

`packages/app/src/onboarding/FirstRun.tsx` (new): tiny invisible mount that calls `runFirstRunSeed()` in a `useEffect` and, if anything was seeded, invalidates the `['tasks']` query subtree so the next `useTasks()` re-fetch picks up the new rows. Mounted as a child of `<QueryClientProvider>` in `App.tsx`.

`packages/app/src/onboarding/ConnectBanner.tsx` (new): three-state banner (`loading` → `visible` | `dismissed`). On mount, reads `META_CONNECT_BANNER_DISMISSED_KEY = 'connectBannerDismissed'`; renders nothing until the read resolves (avoids a flash of banner content the user already dismissed). Dismiss handler updates local state synchronously *and* writes the meta flag in the background, so a remount after dismiss stays hidden. CTA is intentionally just "Dismiss" until view4 (Options / Backends panel) lands in phase 9 — at that point the banner can grow a "Connect" CTA that navigates there. Mounted in `Routes.tsx` above the matrix/quadrant placeholders so it sits at the top of the main views and self-hides on `/__debug` (which short-circuits before the banner) and the task overlay alone (which only renders when there's also a matrix/quadrant view underneath).

`state/backends.ts`: added `meta` to the `AppBackends` shape so onboarding code can reuse the existing IDB-backed `MetaStore` (the registry already takes it as a constructor option). The shared store keeps app-level flags in the same database as the default-backend id, with no extra storage layer.

i18n: three new keys — `app.connect.banner.label` ("Connect a sync backend"), `app.connect.banner.message`, `app.connect.banner.dismiss`. The label is the `aria-label` on the banner's `role="region"`.

App composition: `<App />` now mounts `<FirstRun />` inside `<QueryClientProvider>` (siblinged with `<Router>`); `Routes.tsx` renders `<ConnectBanner />` at the top of its main return.

Test infra: added `packages/app/test/setup.ts` (just `import 'fake-indexeddb/auto';`) and wired it up via `setupFiles` in `vitest.config.ts`. Reason: with `<ConnectBanner />` mounted in `Routes.tsx` and `<FirstRun />` mounted in `App.tsx`, *every* test that mounts these (router.test.tsx, app.test.tsx) now opens IndexedDB transitively. happy-dom doesn't ship an IDB stub, so the global setup gives every test a working factory.

Tests:
- `test/first-run.test.ts` (3 cases): seeds on empty IDB and sets the flag; second call is a no-op (`seeded: false`); concurrent `Promise.all([seed, seed, seed])` shares one in-flight promise so only one seed runs (asserted via the final task count, which is 3 not 9).
- `test/connect-banner.test.tsx` (2 cases): banner appears after the dismissed-flag read resolves; clicking Dismiss hides it immediately and persists `connectBannerDismissed=true`; a remount with the flag pre-set stays hidden.

236 tests pass (was 231; +5). Typecheck clean, lint clean, format clean. Production build is 198 KB (from 185 KB; +13 KB for the onboarding mounts and their string table). Debug page still tree-shakes out — the `'Reply to the urgent'` string in the bundle is the first-run sample task title, which is supposed to ship.

**Next:** Step 4.5 — PWA finalization. Final manifest, service worker, real placeholder icons, offline shell. Outputs: real (still placeholder-art) icons sized 192/512/maskable; `vite-plugin-pwa` config with workbox runtime caching strategy (precache app shell, NetworkFirst for any future API calls); `manifest.webmanifest` finalized: name, short_name, theme_color, background_color, display `standalone`, scope, start_url. Done when Lighthouse PWA audit (installable + offline) passes and offline reload still serves the shell. **Closes Phase 4.**

`packages/app/src/state/backends.ts` (new): cached singleton bootstrap. Opens the sync IDB once via `openSyncDb()`, builds `MetaStore` / `OutboxStore` / `CursorStore` from it, instantiates `BackendRegistry({ meta })`, calls `registry.load()` to hydrate any persisted default-backend id, registers `LocalIndexedDbAdapter`, and constructs `DefaultSyncEngine`. The persisted default is intentionally not clobbered if it points at a not-yet-registered backend (Google / Microsoft will register in phase 8+); `getDefault()` falls back to the first registered adapter (local) until then. `__resetBackendsCacheForTesting()` is the explicit reset hook for tests, which combine it with `globalThis.indexedDB = new IDBFactory()` to start each case from clean storage.

`packages/app/src/queries/tasks.ts` (new): `useTasks(quadrant?)`, `useTask(id)`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useMigrateTask`. Reads aggregate across all registered adapters so view1 / view2 don't have to know about backend topology; writes are scoped via the input (`backendId` for update / delete, the registry default for create, explicit source / target for migrate). All mutations invalidate the entire `['tasks']` subtree on success — blunt but correct for phase 4; optimistic updates can be layered when phase 5 surfaces real perceived latency.

`packages/app/src/debug/DebugPage.tsx` (new): dev-only `/__debug` page. Title input + quadrant select + Create button, then a list of tasks with per-row Toggle (open/done) and Delete buttons. Strings are intentionally untranslated — this surface ships only in dev. Wired through the existing query hooks so it doubles as a manual integration check.

Routing for `/__debug`: extended the view-state store with `internalPath` (the base-prefix-stripped pathname + query) so out-of-band routes can match against it reactively without their own popstate subscription. Added `useInternalPath()` hook. `Routes.tsx` short-circuits to `<DebugPage />` when `import.meta.env.DEV && stripQuery(internalPath) === '/__debug'`. Using the canonical `import.meta.env.DEV` (no optional chaining) is what makes Vite's substitution + rollup constant-folding fire — the production bundle ships at 185 KB instead of 211 KB because the debug page and its imports tree-shake out. `"sideEffects": false` was added to `@emt/app`, `@emt/design-system`, `@emt/backend-core`, and `@emt/backend-local-indexeddb` so cross-package tree-shaking works.

New deps: `fake-indexeddb@^6.2.5` (dev) and `@emt/backend-local-indexeddb` (workspace) added to `packages/app/package.json`.

Tests:
- `test/backends.test.ts` (4 cases): bootstrap registers local; local is the fallback default; concurrent `getBackends()` calls share the same singleton; fresh bootstrap exposes an empty list. Each test resets `globalThis.indexedDB = new IDBFactory()` and calls `__resetBackendsCacheForTesting()` to isolate.
- `test/tasks-queries.test.tsx` (6 cases): `useTasks` lists; `useTasks(quadrant)` filters; `useCreateTask` invalidates and re-fetches; `useUpdateTask` / `useDeleteTask` mutate end-to-end; an unknown backendId rejects. Probe components assign hook results into outer `let`s so the test can assert against the latest values; `waitFor` polls until invariants hold (TanStack Query's async refetch loop doesn't fit `act()` cleanly).
- `test/debug-page.test.tsx` (2 cases): renders the create form + empty-list message; lists tasks already present in the registry. Verifies the page mounts under just `<QueryClientProvider>` (no theme / i18n / router needed for this surface).
- `test/view-state.test.ts`: +1 case for the new `internalPath` field on `navigate` / `replace`.
- `test/query-render.tsx` (new helper): wraps `renderToContainer` in a fresh `QueryClient` per call.

231 tests pass (was 218; +13). Typecheck clean, lint clean, format clean. Production build is 185 KB (debug page + idb / sync engine code in production paths net the same as before; tree-shake cleanly drops the debug surface). Secret scan clean (the only "matches" were `data-task-id={taskId}` JSX attributes — false positive).

**Next:** Step 4.4 — First-run flow. On empty IDB, seed three sample tasks (one in Q1, one in Q2, one done in Q4) and show a dismissible banner suggesting Google / Microsoft connect. Outputs: `packages/app/src/onboarding/first-run.ts` (idempotent seeding gated by a meta flag), `packages/app/src/onboarding/ConnectBanner.tsx`. Done when cleared IDB shows the 3 sample tasks, reload doesn't duplicate, and the banner dismiss persists.

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
