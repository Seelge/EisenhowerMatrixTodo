# Implementation plan

This is the working implementation plan derived from `design-input.md`. It is built incrementally and committed phase-by-phase per the *Session continuity* discipline in `design-input.md`.

## Conventions

- **Phases** are coarse milestones, numbered from 0. **Steps** are the unit of work for a single commit and are numbered `<phase>.<step>` (e.g. step 2.3).
- Every step records:
  - **Goal** — what changes about the system after this step
  - **Inputs** — files and prior steps to read first
  - **Outputs** — files / packages produced or modified
  - **Done when** — verifiable checklist anyone can run from the repo state
- Commits use the message form `step <P>.<S>: <title>` (or `wip step <P>.<S>: …` for forced session ends).
- Step status is tracked inline by replacing the `### Step` heading with `### Step ✅` once `status.md` records it as complete.
- New decisions or deviations made during a step are appended to the step as `**Note:**` lines so the history stays in this file.
- Phase-level dependencies are stated at the top of each phase.

## Phase summary

| Phase | Title | Depends on |
|---|---|---|
| 0 | Repo & tooling foundation | — |
| 1 | Inter-slice contracts | 0 |
| 2 | Backend foundation | 1 |
| 3 | Design system | 1 (tokens), 0 |
| 4 | App shell | 1, 2, 3 |
| 5 | view1 — Eisenhower matrix | 4 |
| 6 | view2 — Quadrant | 4 |
| 7 | Zoom transition (view1 ↔ view2) | 5, 6 |
| 8 | view3 — Task focus | 4, design parts of 3 |
| 9 | view4 — Options | 4 |
| 10 | Conflict resolution UI | 2, 3 |
| 11 | Cross-cutting polish & release | all |

Phases 5/6, 8/9 are independent of each other once Phase 4 is done — good parallelization seams.

---

## Phase 0 — Repo & tooling foundation

Set up the monorepo, language, lint, test, and build tooling. End state: an empty PWA shell that builds, passes an empty test suite, and lints clean.

### Step 0.1 — pnpm workspace bootstrap
**Goal.** A pnpm workspace exists with one directory per planned package; `pnpm install` succeeds.
**Inputs.** `design-input.md` (Planning instruction → project layout).
**Outputs.**
- `package.json` (private workspace root, no deps yet)
- `pnpm-workspace.yaml` listing `packages/*`
- `.gitignore` (`node_modules`, `dist`, `.DS_Store`, `*.log`, `.vite`, `playwright-report`, `test-results`)
- `packages/{app,backend-core,backend-local-indexeddb,backend-inmemory,backend-google,backend-microsoft,design-system}/package.json` — each `private`, `type: "module"`, name scoped (e.g. `@emt/app`).
**Done when.**
- `pnpm install` succeeds.
- `pnpm -r ls --depth=-1` lists all seven packages.

### Step 0.2 — TypeScript baseline
**Goal.** Strict TypeScript shared across packages with project references.
**Inputs.** Step 0.1.
**Outputs.**
- `tsconfig.base.json` at root: `strict`, `noUncheckedIndexedAccess`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `declaration`, `composite`.
- Per-package `tsconfig.json` extending base, with `references` declared from packages that depend on others (e.g. `app` references `backend-core`, `design-system`, etc.).
- Root script `typecheck` running `tsc -b`.
**Done when.**
- `pnpm typecheck` returns clean.

### Step 0.3 — ESLint + Prettier
**Goal.** Lint and format consistent across packages.
**Inputs.** Step 0.2.
**Outputs.**
- `eslint.config.js` (flat config) with `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` (scoped to `packages/app` and `packages/design-system`), `eslint-plugin-import`.
- `.prettierrc.json`, `.prettierignore`.
- Root scripts: `lint`, `format`, `format:check`.
**Done when.**
- `pnpm lint` and `pnpm format:check` clean on the empty repo.

### Step 0.4 — Vitest setup
**Goal.** Unit tests run via Vitest at workspace level.
**Inputs.** Step 0.2.
**Outputs.**
- Root `vitest.config.ts` with workspace projects pointing at each package.
- One smoke test per package (`expect(1+1).toBe(2)` style) to verify wiring.
- Root script `test` (alias `test:unit`).
**Done when.**
- `pnpm test` passes with all smoke tests green.

### Step 0.5 — Playwright skeleton
**Goal.** Playwright installed and configured for `packages/app` end-to-end tests; no real tests yet.
**Inputs.** Step 0.1.
**Outputs.**
- `packages/app/playwright.config.ts` (Chromium project only; baseURL `http://localhost:4173`).
- `packages/app/e2e/.gitkeep`.
- Root scripts: `e2e`, `e2e:install` (browsers).
**Done when.**
- `pnpm e2e:install` succeeds.
- `pnpm e2e` exits 0 with "no tests found".

### Step 0.6 — CI workflow
**Goal.** GitHub Actions runs lint + typecheck + unit tests on PRs and `main`.
**Inputs.** Steps 0.3, 0.2, 0.4.
**Outputs.**
- `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
**Done when.**
- Workflow file passes `actionlint` (or equivalent) syntax check.
- Locally simulated: `act -j ci` (optional) succeeds, or the file is committed and the user confirms a green run on push.

### Step 0.7 — Vite PWA shell + GitHub Pages workflow
**Goal.** `packages/app` is a real Vite app producing an installable PWA build; deploy workflow targets GitHub Pages.
**Inputs.** Steps 0.1, 0.6.
**Outputs.**
- `packages/app/vite.config.ts` with `vite-plugin-pwa` and `base` set to `/<repo-name>/` (resolved from env).
- `packages/app/public/manifest.webmanifest` (placeholder name, theme color, icons).
- `packages/app/public/icons/{192,512,maskable-512}.png` placeholders (solid color, real icons later).
- `packages/app/index.html` minimal shell.
- `packages/app/src/main.tsx` mounts `<App />` (returning "Loading…").
- `.github/workflows/deploy.yml` building on push to `main` and deploying `packages/app/dist` to `gh-pages` via `actions/deploy-pages`.
**Done when.**
- `pnpm --filter @emt/app build` produces `dist/` with `manifest.webmanifest` and a service worker.
- `pnpm --filter @emt/app preview` serves locally; Chrome DevTools → Application → Manifest shows the manifest as installable.
- Deploy workflow is committed (run will succeed only after the user enables Pages — recorded in `status.md` as a pending external action).

**Phase 0 exit:** repo lints, typechecks, tests, builds an installable PWA shell. Nothing functional yet.

---

## Phase 1 — Inter-slice contracts

Per `design-input.md`, contracts must be defined before parallel work starts. After this phase, design / backend / app slices can be developed independently.

Depends on Phase 0.

### Step 1.1 — Canonical Task type
**Goal.** Define the canonical task model in `backend-core` matching the field mapping table.
**Inputs.** `design-input.md` (Backend → field mapping table).
**Outputs.**
- `packages/backend-core/src/task.ts` exporting:
  - `type TaskId = string & { readonly __brand: 'TaskId' }`
  - `type BackendId = string & { readonly __brand: 'BackendId' }`
  - `type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4'`
  - `type Priority = 'none' | 'low' | 'normal' | 'high'`
  - `type TaskStatus = 'open' | 'done'`
  - `interface Task { id: TaskId; backendId: BackendId; title: string; notes: string; dueDate?: string; dueTime?: string; priority: Priority; quadrant: Quadrant; status: TaskStatus; completedAt?: string; createdAt: string; updatedAt: string; tags: string[]; }`
- Re-export from `packages/backend-core/src/index.ts`.
**Done when.**
- Type compiles.
- Unit test: a sample `Task` literal type-checks; assignments to wrong-shaped objects fail to compile (verified by `expectTypeOf`).

### Step 1.2 — BackendAdapter interface
**Goal.** Define the operations every backend must implement.
**Inputs.** `design-input.md` (Backend → adapter operations); Step 1.1.
**Outputs.**
- `packages/backend-core/src/adapter.ts` exporting:
  - `type Cursor = string`
  - `interface ChangeSet { upserts: Task[]; deletes: TaskId[]; cursor: Cursor; }`
  - `interface BackendCapabilities { dueTime: boolean; priority: boolean; recurrence: boolean; }`
  - `interface BackendDescriptor { id: BackendId; displayName: string; capabilities: BackendCapabilities; }`
  - `interface BackendAdapter { describe(): BackendDescriptor; list(quadrant?: Quadrant): Promise<Task[]>; get(id: TaskId): Promise<Task | undefined>; create(task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task>; update(id: TaskId, patch: Partial<Task>): Promise<Task>; delete(id: TaskId): Promise<void>; changesSince(cursor?: Cursor): Promise<ChangeSet>; }`
- JSDoc on every method explaining contract: idempotency, error shapes, concurrency expectations.
**Done when.**
- Compiles, passes lint.
- Each method documented.

### Step 1.3 — Adapter contract test suite
**Goal.** A parameterized test suite that runs against any `BackendAdapter` implementation, used by every adapter package.
**Inputs.** Steps 1.1, 1.2.
**Outputs.**
- `packages/backend-core/src/contract-tests.ts` exporting `runAdapterContract(name: string, factory: () => Promise<BackendAdapter>): void`.
- Coverage:
  - create then get returns equal task (modulo timestamps)
  - update is partial; unspecified fields preserved
  - delete removes; subsequent get returns undefined
  - list returns all open tasks; `list(quadrant)` filters
  - changesSince() returns initial state with a cursor
  - changesSince(cursor) after a write contains that write and a new cursor
  - changesSince after a delete includes the delete
  - concurrent update via two adapter instances on the same store: last-write-wins at the field level, both `updatedAt` advance.
**Done when.**
- File compiles.
- Throws "no adapter installed" placeholder if invoked without a factory.
- Will fail loudly when applied to a stub adapter; verified once in-memory adapter exists in Phase 2.

### Step 1.4 — Conflict resolution contract
**Goal.** Define the callback the sync engine uses when an external client modified a task we also modified.
**Inputs.** `design-input.md` (Backend → conflict resolution); Step 1.1.
**Outputs.**
- `packages/backend-core/src/conflict.ts` exporting:
  - `interface ConflictRecord { local: Task; remote: Task; differingFields: (keyof Task)[]; }`
  - `type ConflictResolver = (record: ConflictRecord) => Promise<'local' | 'remote'>`
- Documentation: resolver returns whole-record choice; the sync engine then writes the chosen record to both ends.
**Done when.**
- Compiles.
- Doc note: "All choices are async to allow user prompting; resolver may also be implemented headlessly in tests."

### Step 1.5 — Sync engine contract & cache schema
**Goal.** Define the sync engine API and IndexedDB cache schema used in front of every backend.
**Inputs.** Steps 1.1–1.4.
**Outputs.**
- `packages/backend-core/src/sync.ts` exporting `interface SyncEngine`:
  - `enqueueWrite(op: 'create' | 'update' | 'delete', task: Task | { id: TaskId; backendId: BackendId }): Promise<void>`
  - `flush(backendId?: BackendId): Promise<{ flushed: number; failed: number }>`
  - `pull(backendId: BackendId): Promise<{ applied: number; conflicts: number }>`
  - `setConflictResolver(resolver: ConflictResolver): void`
- `packages/backend-core/src/cache-schema.ts` describing IndexedDB stores:
  - `tasks` — keyed by `${backendId}:${taskId}`, indexes on `quadrant`, `status`, `updatedAt`
  - `outbox` — keyed by autoincrement, fields `{ op, backendId, taskId, payload, attempts, lastError }`
  - `cursors` — keyed by `backendId`, value is the last `Cursor` consumed
  - ASCII data-flow diagram embedded as a comment
- Schema is types only; no IDB code yet (lands in Phase 2).
**Done when.**
- Types compile.
- Diagram present.

### Step 1.6 — Design tokens
**Goal.** Typed tokens (colors, spacing, motion, type, glow) consumable by the design system.
**Inputs.** `design-input.md` (UI Design → palette, M3 behaviors).
**Outputs.**
- `packages/design-system/src/tokens.ts` — typed token objects (`color`, `space`, `radius`, `font`, `motion`, `glow`).
- `packages/design-system/src/tokens.css` — CSS custom properties mirroring tokens.
- `packages/design-system/src/types.ts` — exported TS types.
- `packages/design-system/preview.html` — static preview swatch page.
**Done when.**
- Compiles.
- `preview.html` opened in a browser shows all tokens with their values (manual visual check).

### Step 1.7 — Route + view-state contract
**Goal.** URL shape and the in-memory view-state model coordinating views, zoom, focused quadrant, focused task.
**Inputs.** `design-input.md` (view sections, transitions); Step 1.1.
**Outputs.**
- `packages/app/src/routes/contract.ts` exporting:
  - URL shape:
    - `/` — view1 (matrix)
    - `/q/:quadrant` — view2 (single quadrant)
    - `?task=:taskId` overlay parameter — opens view3 over either of the above
    - `/options/*` — view4 sub-pages
  - `interface ViewState { zoom: 'matrix' | 'quadrant'; focusedQuadrant?: Quadrant; focusedTaskId?: TaskId; openedFromZoom?: 'matrix' | 'quadrant'; }`
  - `parseUrl(url: string): ViewState`, `serializeUrl(state: ViewState): string` (round-trip).
**Done when.**
- Round-trip unit test: 20 randomized states → URL → state preserves equality.
- Invalid URLs degrade gracefully (e.g. unknown quadrant → `matrix`).

**Phase 1 exit:** all contracts in place and committed. Phases 2 / 3 / parts of 4 can now proceed in parallel.

---

## Phase 2 — Backend foundation

Implement the in-memory and local-IndexedDB adapters, the sync engine, and the multi-backend registry with task migration.

Depends on Phase 1.

### Step 2.1 — In-memory adapter
**Goal.** Reference implementation of `BackendAdapter` backed by a Map; passes the contract test suite.
**Inputs.** Steps 1.1–1.3.
**Outputs.**
- `packages/backend-inmemory/src/adapter.ts` — `class InMemoryAdapter implements BackendAdapter`.
  - Internal monotonic clock for `updatedAt` & cursor.
  - `id` factory using `crypto.randomUUID()`.
- `packages/backend-inmemory/test/contract.test.ts` — invokes `runAdapterContract('in-memory', () => new InMemoryAdapter(...))`.
**Done when.**
- All contract tests green.

### Step 2.2 — Local IndexedDB adapter — basic CRUD
**Goal.** Implement create/read/update/delete/list against IndexedDB; no change tracking yet.
**Inputs.** Steps 2.1, 1.5.
**Outputs.**
- `packages/backend-local-indexeddb/src/db.ts` — opens DB, version 1, `tasks` store with indexes.
- `packages/backend-local-indexeddb/src/adapter.ts` — `class LocalIndexedDbAdapter implements BackendAdapter` (changesSince throws "not yet implemented").
- Tests against `fake-indexeddb`.
**Done when.**
- CRUD subset of the contract suite passes (a tagged subset; the changesSince tests are skipped via `it.skip` until 2.3).

### Step 2.3 — Local IndexedDB adapter — change tracking
**Goal.** Implement `changesSince` using a monotonic per-DB sequence number written on every mutation.
**Inputs.** Step 2.2.
**Outputs.**
- DB v2 migration adding a `seq` field on `tasks` records and a meta record `nextSeq`.
- `changesSince` reads the `seq` index ≥ cursor.
- Tombstone strategy for deletes: a `deletions` store (id, seq).
- Re-enable the previously-skipped contract tests.
**Done when.**
- Full contract test suite green for `LocalIndexedDbAdapter`.

### Step 2.4 — Sync engine — outbound queue & flush
**Goal.** Implement `enqueueWrite` and `flush`. For local backend, flush is a no-op (writes already applied directly). For remote backends, the queue replays operations against the adapter with retry + backoff.
**Inputs.** Steps 1.5, 2.3.
**Outputs.**
- `packages/backend-core/src/sync-engine.ts` — `class DefaultSyncEngine implements SyncEngine`.
- Backoff: exponential with jitter, max 5 retries, max delay 60 s.
- Outbox persisted in IDB (per Step 1.5 schema).
- Tests:
  - flush against a flaky in-memory adapter (50 % rejection): all 5 enqueued ops eventually flushed.
  - flush is idempotent: second flush after success is a no-op.
  - offline simulation: enqueue while adapter throws "offline"; come back online; flush succeeds.
**Done when.**
- Tests green.

### Step 2.5 — Sync engine — pull & conflict detection
**Goal.** Implement `pull(backendId)`: read `changesSince(cursor)`, apply remote changes to the cache, raise `ConflictResolver` for tasks edited locally since the cursor.
**Inputs.** Steps 2.4, 1.4.
**Outputs.**
- `pull` implementation in `sync-engine.ts`.
- `ConflictRecord.differingFields` computed via shallow field diff.
- Tests:
  - clean pull (no local edits): remote applied verbatim, no resolver calls.
  - local-only edits: pull does not overwrite.
  - true conflict: resolver invoked exactly once per conflicting task; chosen side persisted to both cache and queued for outbound flush.
**Done when.**
- Tests green.

### Step 2.6 — Backend registry
**Goal.** Registry of installed backends with a configurable default for new tasks.
**Inputs.** Step 2.5.
**Outputs.**
- `packages/backend-core/src/registry.ts` — `class BackendRegistry`:
  - `register(adapter: BackendAdapter)`, `unregister(id)`, `get(id)`, `list()`, `getDefault()`, `setDefault(id)`.
  - Default-id persisted to IDB `meta` store.
- Tests for registration, default selection, persistence across re-instantiation.
**Done when.**
- Tests green.

### Step 2.7 — Task migration
**Goal.** Move a task between backends as a create-then-delete with rollback.
**Inputs.** Step 2.6.
**Outputs.**
- `packages/backend-core/src/migrate.ts` — `migrateTask(taskId, fromBackendId, toBackendId): Promise<Task>`.
- On target-create failure: source untouched; error surfaced.
- On source-delete failure after target-create success: log, return new task, raise a "stale source copy" event for the UI to clean up later.
- Tests for both failure paths.
**Done when.**
- Tests green.

**Phase 2 exit:** the canonical model + adapter interface + sync engine + registry + migration are working end-to-end with the in-memory and local-IndexedDB backends. Future Google / Microsoft adapters are now drop-in.

---

## Phase 3 — Design system

Implement design tokens (already typed in 1.6) as runtime CSS, plus the primitive components view1–view4 will compose.

Depends on Step 1.6 and Phase 0.

### Step 3.1 — Theme provider + CSS reset
**Goal.** A `<ThemeProvider>` injects the token CSS vars and applies a CSS reset; `color-scheme: dark`.
**Outputs.** `ThemeProvider.tsx`, `reset.css`, integration test rendering a child that reads `--color-bg`.
**Done when.** Token-preview page renders in the dark palette.

### Step 3.2 — Glow border primitive
**Goal.** `<Glow color="Q1" />` (or a CSS utility) renders the futuristic glow border.
**Outputs.** `Glow.tsx` + tests for the four quadrant colors.
**Done when.** Visual snapshot per color.

### Step 3.3 — Buttons, IconButton, FAB, Card
**Goal.** Material-3-behaving button family with custom styling.
**Outputs.** Components + a11y tests (focus ring, role, aria-label requirement on icon-only).
**Done when.** Tests green; jsx-a11y lint clean.

### Step 3.4 — Sheet & SidePanel + responsive container
**Goal.** Bottom sheet (mobile), right-side panel (~480 px desktop), with focus trap and Esc-close.
**Outputs.** `Sheet.tsx`, `SidePanel.tsx`, `ResponsiveSurface.tsx` (picks one by viewport).
**Done when.** Tests for both breakpoints pass; reduced-motion path gives instant open/close.

### Step 3.5 — Snackbar with undo
**Goal.** Snackbar primitive with optional 5 s undo CTA.
**Outputs.** `Snackbar.tsx`, `SnackbarProvider`, `useSnackbar` hook.
**Done when.** Test: undo within 5 s cancels callback; otherwise commits.

### Step 3.6 — Quadrant picker (2 × 2)
**Goal.** Reusable 2 × 2 picker honoring per-quadrant glow colors and the current selection.
**Outputs.** `QuadrantPicker.tsx`.
**Done when.** Component test for selection change + keyboard navigation.

### Step 3.7 — Due-date picker
**Goal.** Quick-pick row ("Today / Tomorrow / This weekend / Next week / No date") + native `<input type="date">` fallback.
**Outputs.** `DueDatePicker.tsx`.
**Done when.** Test for each preset; locale-aware "weekend" computation has a unit test (Saturday upcoming).

### Step 3.8 — Loading / empty / error primitives
**Goal.** Standardized states.
**Outputs.** `Skeleton.tsx`, `EmptyNote.tsx` (the muted-grey "empty" note from view2), `ErrorBanner.tsx`.
**Done when.** Component tests pass.

### Step 3.9 — `useReducedMotion` hook
**Goal.** Centralize `prefers-reduced-motion` detection.
**Outputs.** `useReducedMotion.ts` + test using mocked media query.
**Done when.** Both branches covered.

**Phase 3 exit:** primitives ready. Views compose them; no view-specific code yet.

---

## Phase 4 — App shell

Wire the design system, the backend stack, and the routing contract into a running app with the first-run experience.

Depends on Phases 1, 2, 3.

### Step 4.1 — Root shell
**Goal.** `<App />` mounts: `<ThemeProvider>` → `<QueryClientProvider>` → `<Router>` → `<ErrorBoundary>` → `<I18nProvider>` → `<Routes>`.
**Outputs.** `packages/app/src/App.tsx`, `packages/app/src/i18n/{provider.tsx,strings.en.ts,t.ts}`.
**Done when.** App renders a placeholder home page with the dark theme applied.

### Step 4.2 — Router & view-state coordinator
**Goal.** Implement routes from Step 1.7 with a Zustand store mirroring `ViewState`; URL is the source of truth, store is the projection.
**Outputs.** `packages/app/src/routes/`, `packages/app/src/state/view-state.ts`.
**Done when.**
- Browser back/forward preserves state.
- Deep-link to `/q/Q2?task=abc` opens view3 over view2/Q2.

### Step 4.3 — Backend wiring + queries
**Goal.** Instantiate the backend registry with `LocalIndexedDbAdapter` registered as default; expose tasks through TanStack Query hooks.
**Outputs.**
- `packages/app/src/state/backends.ts` (registry + sync-engine singletons).
- `packages/app/src/queries/tasks.ts` — `useTasks(quadrant?)`, `useTask(id)`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useMigrateTask`.
- A throwaway debug page at `/__debug` listing tasks and offering create/delete buttons (gated to dev builds).
**Done when.** Debug page can list, create, update, and delete tasks against IndexedDB.

### Step 4.4 — First-run flow
**Goal.** On empty IDB, seed three sample tasks (one in Q1, one in Q2, one done in Q4) and show a dismissible banner suggesting Google / Microsoft connect. Subsequent loads do not reseed.
**Outputs.**
- `packages/app/src/onboarding/first-run.ts` (idempotent seeding with a meta flag).
- `packages/app/src/onboarding/ConnectBanner.tsx`.
**Done when.**
- Cleared IDB → 3 sample tasks appear.
- Reload → no duplicates.
- Banner dismiss persists.

### Step 4.5 — PWA finalization
**Goal.** Final manifest, service worker, real placeholder icons, offline shell.
**Outputs.**
- Real (still placeholder-art) icons sized 192/512/maskable.
- `vite-plugin-pwa` config with workbox runtime caching strategy: precache app shell, NetworkFirst for any future API calls.
- `manifest.webmanifest` finalized: name, short_name, theme_color, background_color, display `standalone`, scope, start_url.
**Done when.**
- Lighthouse PWA audit (installable + offline) passes.
- Offline reload still serves the shell.

**Phase 4 exit:** running app on device/desktop with persistent local tasks, theme applied, install banner. No real views yet — they land in Phases 5–9.

---

## Phase 5 — view1: Eisenhower matrix

*Stub — to be detailed in next planning increment.*

Top-line: 2 × 2 grid of quadrant cells; per-task card shows title + due + priority + tags; independent vertical scroll per cell; manual sort with due-date secondary + reset; drag-and-drop between quadrants via dnd-kit (with keyboard "move to" alternative); FAB + quick composer with mini 2 × 2 picker; faint axis labels on outer edges.

## Phase 6 — view2: Quadrant

*Stub — to be detailed in next planning increment.*

Top-line: focused-quadrant layout with colored glow border; ~24 px neighbor-edge strips that light up during a drag and accept drops; touch-swipe / mouse-drag to change focused quadrant; FAB adds task into focused quadrant; empty quadrant rendered as normal with muted-grey "empty" note.

## Phase 7 — Zoom transition (view1 ↔ view2)

*Stub — to be detailed in next planning increment.*

Top-line: snap animation between matrix and quadrant; touch pinch (in: midpoint quadrant; out: previously-focused quadrant briefly highlighted); mouse `Ctrl + wheel` toggles zoom while plain wheel scrolls within the quadrant; keyboard Esc / Enter / arrows / `+` / `-`; `prefers-reduced-motion` replaces the morph with instant cuts.

## Phase 8 — view3: Task focus

*Stub — to be detailed in next planning increment.*

Top-line: bottom sheet on mobile, ~480 px right-side panel on desktop; all fields editable (title, notes markdown, due date, due time, priority, quadrant, status, target backend); date quick-pick row + native picker; 2 × 2 quadrant picker; backend selector triggering migration; complete = instant toggle; delete = trash + 5 s undo snackbar; info icon for backend-unsupported fields; close returns to opener view.

## Phase 9 — view4: Options

*Stub — to be detailed in next planning increment.*

Top-line: top-level groups Backends / Account / Appearance / Defaults / Data / About; sub-routing under `/options/*`.

## Phase 10 — Conflict resolution UI

*Stub — to be detailed in next planning increment.*

Top-line: side-by-side diff modal triggered when sync engine reports a conflict; whole-record local/remote choice; resolver wired into sync-engine instance.

## Phase 11 — Cross-cutting polish & release

*Stub — to be detailed in next planning increment.*

Top-line: time-zone handling end-to-end; standardized loading/error/empty states audit; accessibility audit (keyboard, screen reader, contrast); Playwright e2e for the golden path (create → drag → focus → set due → complete) plus a PWA install + offline scenario; release checklist + GitHub Pages live.
