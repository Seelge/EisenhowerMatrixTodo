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

### Step ✅ 0.1 — pnpm workspace bootstrap
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

### Step ✅ 0.2 — TypeScript baseline
**Goal.** Strict TypeScript shared across packages with project references.
**Inputs.** Step 0.1.
**Outputs.**
- `tsconfig.base.json` at root: `strict`, `noUncheckedIndexedAccess`, `target: ES2022`, `module: ESNext`, `moduleResolution: bundler`, `declaration`, `composite`.
- Per-package `tsconfig.json` extending base, with `references` declared from packages that depend on others (e.g. `app` references `backend-core`, `design-system`, etc.).
- Root script `typecheck` running `tsc -b`.
**Done when.**
- `pnpm typecheck` returns clean.

### Step ✅ 0.3 — ESLint + Prettier
**Goal.** Lint and format consistent across packages.
**Inputs.** Step 0.2.
**Outputs.**
- `eslint.config.js` (flat config) with `@typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y` (scoped to `packages/app` and `packages/design-system`), `eslint-plugin-import`.
- `.prettierrc.json`, `.prettierignore`.
- Root scripts: `lint`, `format`, `format:check`.
**Done when.**
- `pnpm lint` and `pnpm format:check` clean on the empty repo.

### Step ✅ 0.4 — Vitest setup
**Goal.** Unit tests run via Vitest at workspace level.
**Inputs.** Step 0.2.
**Outputs.**
- Root `vitest.config.ts` with workspace projects pointing at each package.
- One smoke test per package (`expect(1+1).toBe(2)` style) to verify wiring.
- Root script `test` (alias `test:unit`).
**Done when.**
- `pnpm test` passes with all smoke tests green.

### Step ✅ 0.5 — Playwright skeleton
**Goal.** Playwright installed and configured for `packages/app` end-to-end tests; smoke test verifies runner wiring.
**Inputs.** Step 0.1.
**Outputs.**
- `packages/app/playwright.config.ts` (Chromium project only; baseURL `http://localhost:4173`).
- `packages/app/e2e/smoke.spec.ts` — trivial assertion test verifying the runner.
- Root scripts: `e2e`, `e2e:install` (browsers).
**Done when.**
- `pnpm e2e:install` succeeds.
- `pnpm e2e` exits 0 (smoke test passes).
**Note.** Original plan said `e2e/.gitkeep` and `pnpm e2e` exits 0 with "no tests found", but Playwright exits 1 on no-tests with no flag to override. Replaced the placeholder with a real one-line smoke test that asserts `1 + 1 === 2` without needing a running server.
**Note.** Browser install required `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64` because Playwright 1.59.1 does not have prebuilt browsers for ubuntu26.04 (which is the dev environment). The ubuntu24.04 build is ABI-compatible. Override baked into the `e2e:install` script.

### Step ✅ 0.6 — CI workflow
**Goal.** GitHub Actions runs lint + typecheck + unit tests on PRs and `main`.
**Inputs.** Steps 0.3, 0.2, 0.4.
**Outputs.**
- `.github/workflows/ci.yml` running `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`.
**Done when.**
- Workflow file passes `actionlint` (or equivalent) syntax check.
- Locally simulated: `act -j ci` (optional) succeeds, or the file is committed and the user confirms a green run on push.

### Step ✅ 0.7 — Vite PWA shell + GitHub Pages workflow
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

### Step ✅ 1.1 — Canonical Task type
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

### Step ✅ 1.2 — BackendAdapter interface
**Goal.** Define the operations every backend must implement.
**Inputs.** `design-input.md` (Backend → adapter operations); Step 1.1.
**Outputs.**
- `packages/backend-core/src/adapter.ts` exporting `Cursor`, `ChangeSet`, `BackendCapabilities`, `BackendDescriptor`, `TaskDraft`, `TaskPatch`, and `BackendAdapter`.
- JSDoc on every method covering concurrency (last-write-wins per field), idempotency (`delete` idempotent; `update` not idempotent in `updatedAt` but stable in state), and error semantics (`Error` subclasses allowed; base contract doesn't mandate specific types).
**Done when.**
- Compiles, passes lint.
- Each method documented.
**Note.** Two small deviations from the originally-sketched signatures, both tightening design: (a) `create` takes `TaskDraft = Omit<Task, 'id' | 'backendId' | 'createdAt' | 'updatedAt'>` so callers don't repeat the adapter's own `backendId`; (b) `update` takes `TaskPatch = Partial<Omit<Task, 'id' | 'backendId' | 'createdAt' | 'updatedAt'>>` so callers cannot patch immutable identity / timestamp fields. `list` and `changesSince` return `readonly` arrays.

### Step ✅ 1.3 — Adapter contract test suite
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

### Step ✅ 1.4 — Conflict resolution contract
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

### Step ✅ 1.5 — Sync engine contract & cache schema
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

### Step ✅ 1.6 — Design tokens
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

### Step ✅ 1.7 — Route + view-state contract
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

### Step ✅ 2.1 — In-memory adapter
**Goal.** Reference implementation of `BackendAdapter` backed by a Map; passes the contract test suite.
**Inputs.** Steps 1.1–1.3.
**Outputs.**
- `packages/backend-inmemory/src/adapter.ts` — `class InMemoryAdapter implements BackendAdapter`.
  - Internal monotonic clock for `updatedAt` & cursor.
  - `id` factory using `crypto.randomUUID()`.
- `packages/backend-inmemory/test/contract.test.ts` — invokes `runAdapterContract('in-memory', () => new InMemoryAdapter(...))`.
**Done when.**
- All contract tests green.

### Step ✅ 2.2 — Local IndexedDB adapter — basic CRUD
**Goal.** Implement create/read/update/delete/list against IndexedDB; no change tracking yet.
**Inputs.** Steps 2.1, 1.5.
**Outputs.**
- `packages/backend-local-indexeddb/src/db.ts` — opens DB, version 1, `tasks` store with indexes.
- `packages/backend-local-indexeddb/src/adapter.ts` — `class LocalIndexedDbAdapter implements BackendAdapter` (changesSince throws "not yet implemented").
- Tests against `fake-indexeddb`.
**Done when.**
- CRUD subset of the contract suite passes (a tagged subset; the changesSince tests are skipped via `it.skip` until 2.3).

### Step ✅ 2.3 — Local IndexedDB adapter — change tracking
**Goal.** Implement `changesSince` using a monotonic per-DB sequence number written on every mutation.
**Inputs.** Step 2.2.
**Outputs.**
- DB v2 migration adding a `seq` field on `tasks` records and a meta record `nextSeq`.
- `changesSince` reads the `seq` index ≥ cursor.
- Tombstone strategy for deletes: a `deletions` store (id, seq).
- Re-enable the previously-skipped contract tests.
**Done when.**
- Full contract test suite green for `LocalIndexedDbAdapter`.

### Step ✅ 2.4 — Sync engine — outbound queue & flush
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

### Step ✅ 2.5 — Sync engine — pull & conflict detection
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

### Step ✅ 2.6 — Backend registry
**Goal.** Registry of installed backends with a configurable default for new tasks.
**Inputs.** Step 2.5.
**Outputs.**
- `packages/backend-core/src/registry.ts` — `class BackendRegistry`:
  - `register(adapter: BackendAdapter)`, `unregister(id)`, `get(id)`, `list()`, `getDefault()`, `setDefault(id)`.
  - Default-id persisted to IDB `meta` store.
- Tests for registration, default selection, persistence across re-instantiation.
**Done when.**
- Tests green.

### Step ✅ 2.7 — Task migration
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

### Step ✅ 3.1 — Theme provider + CSS reset
**Goal.** A `<ThemeProvider>` injects the token CSS vars and applies a CSS reset; `color-scheme: dark`.
**Outputs.** `ThemeProvider.tsx`, `reset.css`, integration test rendering a child that reads `--color-bg`.
**Done when.** Token-preview page renders in the dark palette.

### Step ✅ 3.2 — Glow border primitive
**Goal.** `<Glow color="Q1" />` (or a CSS utility) renders the futuristic glow border.
**Outputs.** `Glow.tsx` + tests for the four quadrant colors.
**Done when.** Visual snapshot per color.

### Step ✅ 3.3 — Buttons, IconButton, FAB, Card
**Goal.** Material-3-behaving button family with custom styling.
**Outputs.** Components + a11y tests (focus ring, role, aria-label requirement on icon-only).
**Done when.** Tests green; jsx-a11y lint clean.

### Step ✅ 3.4 — Sheet & SidePanel + responsive container
**Goal.** Bottom sheet (mobile), right-side panel (~480 px desktop), with focus trap and Esc-close.
**Outputs.** `Sheet.tsx`, `SidePanel.tsx`, `ResponsiveSurface.tsx` (picks one by viewport).
**Done when.** Tests for both breakpoints pass; reduced-motion path gives instant open/close.

### Step ✅ 3.5 — Snackbar with undo
**Goal.** Snackbar primitive with optional 5 s undo CTA.
**Outputs.** `Snackbar.tsx`, `SnackbarProvider`, `useSnackbar` hook.
**Done when.** Test: undo within 5 s cancels callback; otherwise commits.

### Step ✅ 3.6 — Quadrant picker (2 × 2)
**Goal.** Reusable 2 × 2 picker honoring per-quadrant glow colors and the current selection.
**Outputs.** `QuadrantPicker.tsx`.
**Done when.** Component test for selection change + keyboard navigation.

### Step ✅ 3.7 — Due-date picker
**Goal.** Quick-pick row ("Today / Tomorrow / This weekend / Next week / No date") + native `<input type="date">` fallback.
**Outputs.** `DueDatePicker.tsx`.
**Done when.** Test for each preset; locale-aware "weekend" computation has a unit test (Saturday upcoming).

### Step ✅ 3.8 — Loading / empty / error primitives
**Goal.** Standardized states.
**Outputs.** `Skeleton.tsx`, `EmptyNote.tsx` (the muted-grey "empty" note from view2), `ErrorBanner.tsx`.
**Done when.** Component tests pass.

### Step ✅ 3.9 — `useReducedMotion` hook
**Goal.** Centralize `prefers-reduced-motion` detection.
**Outputs.** `useReducedMotion.ts` + test using mocked media query.
**Done when.** Both branches covered.

**Phase 3 exit:** primitives ready. Views compose them; no view-specific code yet.

---

## Phase 4 — App shell

Wire the design system, the backend stack, and the routing contract into a running app with the first-run experience.

Depends on Phases 1, 2, 3.

### Step ✅ 4.1 — Root shell
**Goal.** `<App />` mounts: `<ThemeProvider>` → `<QueryClientProvider>` → `<Router>` → `<ErrorBoundary>` → `<I18nProvider>` → `<Routes>`.
**Outputs.** `packages/app/src/App.tsx`, `packages/app/src/i18n/{provider.tsx,strings.en.ts,t.ts}`.
**Done when.** App renders a placeholder home page with the dark theme applied.

### Step ✅ 4.2 — Router & view-state coordinator
**Goal.** Implement routes from Step 1.7 with a Zustand store mirroring `ViewState`; URL is the source of truth, store is the projection.
**Outputs.** `packages/app/src/routes/`, `packages/app/src/state/view-state.ts`.
**Done when.**
- Browser back/forward preserves state.
- Deep-link to `/q/Q2?task=abc` opens view3 over view2/Q2.

### Step ✅ 4.3 — Backend wiring + queries
**Goal.** Instantiate the backend registry with `LocalIndexedDbAdapter` registered as default; expose tasks through TanStack Query hooks.
**Outputs.**
- `packages/app/src/state/backends.ts` (registry + sync-engine singletons).
- `packages/app/src/queries/tasks.ts` — `useTasks(quadrant?)`, `useTask(id)`, `useCreateTask`, `useUpdateTask`, `useDeleteTask`, `useMigrateTask`.
- A throwaway debug page at `/__debug` listing tasks and offering create/delete buttons (gated to dev builds).
**Done when.** Debug page can list, create, update, and delete tasks against IndexedDB.

### Step ✅ 4.4 — First-run flow
**Goal.** On empty IDB, seed three sample tasks (one in Q1, one in Q2, one done in Q4) and show a dismissible banner suggesting Google / Microsoft connect. Subsequent loads do not reseed.
**Outputs.**
- `packages/app/src/onboarding/first-run.ts` (idempotent seeding with a meta flag).
- `packages/app/src/onboarding/ConnectBanner.tsx`.
**Done when.**
- Cleared IDB → 3 sample tasks appear.
- Reload → no duplicates.
- Banner dismiss persists.

### Step ✅ 4.5 — PWA finalization
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

The full-matrix view. Depends on Phase 4 (router, queries, theme) and Phase 3.

### Step ✅ 5.1 — Matrix layout shell
**Goal.** 2 × 2 grid with quadrant headers ("Do / Schedule / Delegate / Delete") and faint axis labels ("Important ↑", "Urgent →") on the outer edges. Each cell renders the colored glow border from Step 3.2.
**Outputs.** `packages/app/src/views/matrix/MatrixView.tsx`, `MatrixCell.tsx`.
**Done when.** Snapshot test: empty matrix renders all four cells with correct labels and palette.

### Step ✅ 5.2 — Task card
**Goal.** Card showing title, full due date, priority dot, tags. Click/tap opens view3.
**Inputs.** Step 1.1 (`Task`).
**Outputs.** `packages/app/src/views/matrix/TaskCard.tsx` + tests.
**Done when.** Component test renders all field permutations (no due, all priorities, multiple tags, long titles → ellipsis after 1 line).

### Step ✅ 5.3 — Per-cell task list
**Goal.** Each cell loads tasks for its quadrant via `useTasks(quadrant)`; renders cards in sort order from Step 5.7.
**Outputs.** `MatrixCell.tsx` updated; integrates with TanStack Query.
**Done when.** Tasks created via the Phase 4 debug page appear in their respective cells without reload.

### Step ✅ 5.4 — Independent vertical scroll per cell
**Goal.** Each cell has its own scroll viewport; matrix container does not scroll.
**Outputs.** Updated CSS in `MatrixCell.tsx`.
**Done when.** Two cells with > viewport-height tasks scroll independently. Scrollbars styled to match the dark theme.

### Step ✅ 5.5 — Drag-and-drop between quadrants
**Goal.** Drag a card from one cell into another using dnd-kit; on drop, `useUpdateTask` patches `quadrant`.
**Inputs.** Step 4.3, dnd-kit.
**Outputs.** `MatrixView.tsx` becomes a `DndContext`; `MatrixCell` uses `useDroppable`; `TaskCard` uses `useDraggable`.
**Done when.**
- Mouse drag works on desktop.
- Touch drag works on Android.
- Visual drop indicator on the receiving cell.
- Optimistic update + rollback on adapter error.

### Step ✅ 5.6 — Keyboard alternative ("Move to")
**Goal.** Each task card has a focusable kebab menu offering "Move to → Q1/Q2/Q3/Q4" (excluding current). Required for a11y commitment.
**Outputs.** `TaskCardMenu.tsx`.
**Done when.** Keyboard-only test: focus card → activate menu → choose target → assertion task moved.

### Step ✅ 5.7 — Sort: manual with due-date secondary + reset
**Goal.** Per-quadrant manual order, persisted locally. When a task has no manual rank, sort by due date (nulls last). "Reset to secondary" action clears manual ranks for the current quadrant.
**Outputs.**
- New `taskOrder` IDB store keyed by `(backendId, taskId)` with a `rank: number` field. Manual order is a UI concern, not synced — kept out of the canonical `Task` model.
- `packages/app/src/views/matrix/sort.ts` + unit tests for the manual-with-fallback ordering.
- "Reset to secondary order" action in each cell header.
**Done when.**
- Reorder via drag (Step 5.5 extended) writes ranks.
- Reset clears ranks for the current quadrant; cards fall back to due-date order.
- Order persists across reloads.

### Step ✅ 5.8 — FAB + quick composer
**Goal.** Bottom-right FAB opens a quick composer (title + 2 × 2 mini-picker); creates a task via `useCreateTask` in the chosen quadrant.
**Outputs.** `QuickComposer.tsx` (uses Step 3.4 Sheet on mobile, popover on desktop).
**Done when.**
- Empty title disabled.
- Esc / outside click cancels.
- Created task appears optimistically in the chosen cell.

**Phase 5 exit:** matrix is fully functional — view, sort, create, move, focus.

---

## Phase 6 — view2: Quadrant

Single-quadrant view. Depends on Phase 4 and Phase 3.

### Step ✅ 6.1 — Quadrant layout
**Goal.** Render the focused quadrant fullscreen with its colored glow border; ~24 px strips along each edge representing the three neighbors (using their colors at reduced opacity).
**Outputs.** `packages/app/src/views/quadrant/QuadrantView.tsx`, `NeighborEdge.tsx`.
**Done when.** Visual test for each focused quadrant; neighbor strips are present on the correct edges.
**Note:** the 2 × 2 matrix gives each focused quadrant exactly two orthogonal neighbors (one urgency-axis, one importance-axis). The two remaining sides face the matrix outside and intentionally render no strip — that matches `design-input.md`'s "shared edge" wording and the swipe contract from Step 6.3 which only handles axis flips. `NEIGHBORS` in `NeighborEdge.tsx` codifies the per-quadrant edge → neighbor mapping. Task list, header, and overflow handling reuse the same hooks (`useTasks`, `useTaskOrder`, `sortTasks`) and CSS pattern as `MatrixCell` so a card has the same identity in view1 and view2 — sets up Phase 7's shared-`layoutId` morph cleanly. Routes.tsx replaces `QuadrantPlaceholder` with `<QuadrantView>` and the placeholder-only i18n keys (`app.quadrant.heading`, `app.quadrant.placeholder`) are dropped.

### Step ✅ 6.2 — Drop-on-edge to move
**Goal.** Dragging a task onto a neighbor edge moves it to that quadrant. The current quadrant stays focused after drop.
**Outputs.** `NeighborEdge.tsx` becomes a `useDroppable`; same dnd-kit context as Step 5.5.
**Done when.**
- During a drag, the targeted edge brightens (uses Step 3.2 glow).
- Drop moves the task and removes it from the current view.
**Note:** the dnd-kit drop-data discriminator was widened from `DroppableCellData` to `DroppableTargetData = DroppableCellData | DroppableEdgeData`, both carrying a `quadrant`. `createDragEndHandler` now narrows on either, so view2's edge-drop reuses the exact optimistic-cache + adapter-write + manual-rank pipeline as view1's cross-cell drag — same `applyOptimisticMove`, same rollback, same `setRank` write. `QuadrantView` hoists its own `<DndContext>` with the same `PointerSensor (distance: 5)` + `KeyboardSensor` config as `MatrixView`; Phase 7's `ZoomController` will replace the two local contexts with one shared context. The strip's drop-active state uses the same `data-drop-active` attribute pattern as `.emt-matrix__cell`; on hit, opacity jumps to 1 and a `--glow-q{n}` halo lights the band. The strips keep `pointer-events: none` (the band overlays only the frame's inner padding, so the focus list isn't behind it; dnd-kit's collision detector works off droppable rects, not pointer events on the strip).

### Step ✅ 6.3 — Touch swipe to change focus
**Goal.** Horizontal/vertical swipe (when not on a draggable card) switches focused quadrant.
**Outputs.** Pointer/touch handler at `QuadrantView` root.
**Done when.**
- Swipe left/right/up/down navigates to the geometrically-adjacent quadrant (left/right swap urgent axis, up/down swap importance axis).
- Swipe is rate-limited and respects `prefers-reduced-motion` (instant snap).
**Note:** the gesture geometry lives in `swipe.ts` as pure helpers (`resolveSwipeDirection` / `resolveSwipeTarget` / `SWIPE_NEIGHBORS`) so the thresholds are testable without happy-dom's pointer-event quirks. Defaults: 50 px distance, 1.5× dominance ratio, 400 ms max gesture duration, 300 ms cooldown between successful swipes — the duration cap is what discriminates a flick from a slow scroll/drag, the cooldown handles rate-limiting. Pointer handlers (`onPointerDown` / `onPointerUp` / `onPointerCancel`) are spread on `QuadrantView`'s `<main>`. Excluded targets: `.emt-task-card` (dnd-kit owns those drags) and `.emt-quadrant__list` (so vertical scroll inside a populated list isn't hijacked into a swipe). The reduced-motion guard is "instant snap" by construction in this step — there's no animation here, the route flip is the entire visual transition. Phase 7 gates the zoom morph on `useReducedMotion` separately.

### Step ✅ 6.4 — Mouse drag-at-edge to change focus
**Goal.** Click-and-drag from the background (not on a card) translates focus the same way as a swipe.
**Outputs.** Same handler as 6.3, mouse code path.
**Done when.** Tests for both swipe and mouse drag pass.
**Note.** Covered by 6.3's pointer-type-agnostic handlers — React's `onPointer*` props fire for mouse, touch, and pen alike, so the mouse code path *is* the swipe code path. No production change in this step. Added two regression cases in `test/quadrant-swipe.test.tsx` that dispatch with `pointerType: 'mouse'`: (a) drag on the background flips Q1 → Q2, (b) drag starting on a `.emt-task-card` is ignored (same exclusion still applies, so dnd-kit keeps mouse drags on cards). The shared `dispatchPointer` helper grew an optional `pointerType` field defaulting to `'touch'`, so existing 6.3 cases still describe a touch swipe explicitly.

### Step ✅ 6.5 — FAB in view2
**Goal.** FAB creates a task in the currently focused quadrant (no quadrant picker shown).
**Outputs.** Reuse `QuickComposer` (Step 5.8) without the mini-matrix.
**Done when.** New task appears in the focused quadrant immediately.
**Note.** `QuickComposer` grew a `showQuadrantPicker?: boolean` prop (default `true`, so view1's call site is unchanged). When `false`, the picker `<div>` is omitted and `onSubmit` reads the destination from the live `defaultQuadrant` prop instead of internal state — view2 has no UI to mutate the destination, and `<QuickComposer>` itself stays mounted across the surface's open/close cycles, so internal state could otherwise lock in a stale quadrant. `QuadrantView` adds a `<Fab>` + `<QuickComposer ... showQuadrantPicker={false} defaultQuadrant={quadrant}>` pair, anchored at `.emt-quadrant__fab` (absolute, bottom-right, `--layer-fab` z-index, safe-area inset — same rule as `.emt-matrix__fab` so Phase 7's morph keeps the FAB in place across views). The "Add task" label reuses `app.matrix.fab.add`; the FAB does the same thing in both views, so a separate i18n key would be premature scope.

### Step ✅ 6.6 — Empty state
**Goal.** Empty focused quadrant renders normally with the muted-grey "empty" note from Step 3.8 (no illustration).
**Outputs.** Branch in `QuadrantView` rendering `<EmptyNote>` when the list is empty.
**Done when.** Visual test: empty Q3 renders the note centered, neighbor strips still present.
**Note.** `QuadrantView` adds an `EmptyNote` import and a `tasks !== undefined && tasks.length === 0` branch inside the existing list `<div>` (after the loading-skeleton and error-banner branches so transient pending states don't flash the empty note). The new `app.quadrant.empty` i18n string ("Nothing here yet.") is the EmptyNote's text. CSS: `.emt-quadrant__empty { margin: auto; }` — the list is already a flex column, so `margin: auto` centers the note both vertically and horizontally inside the available space without affecting the card-stacking layout when the list is non-empty (the note is only rendered then). Test added: empty `QuadrantView quadrant="Q3"` renders the note + the Q3 neighbor strips (top → Q1, left → Q4) + FAB; populated quadrant does not render the note. `data-task-count="0"` is `0` during loading too (undefined → 0 fallback), so the test waits on `.emt-quadrant__skeleton` clearing as the actual query-resolved sentinel.

**Phase 6 exit:** quadrant view is fully functional — view, swipe, drag-to-edge, create.

---

## Phase 7 — Zoom transition (view1 ↔ view2)

Glue the two views with the snap-zoom animation and input bindings.

Depends on Phases 5 and 6.

### Step ✅ 7.1 — Snap morph animation
**Goal.** Animate from matrix to single quadrant (and back) by scaling the layout — single CSS transform, no per-card layout shift. The animation snaps; nothing in between.
**Outputs.** `packages/app/src/views/zoom/ZoomController.tsx`. Uses Framer Motion `layout` + a shared layout id between `MatrixCell` and `QuadrantView`.
**Done when.**
- Toggling zoom via the view-state store animates 200–250 ms with M3 easing.
- No layout shift on cards mid-animation.
**Note.** Added `framer-motion` to `@emt/app` and introduced `ZoomController` as a `LayoutGroup` + `AnimatePresence` shell around the active matrix/quadrant route. The shell uses a 220 ms M3-standard easing transition and keeps outgoing surfaces mounted during the snap morph. `MatrixCell` and `QuadrantView` now wrap their quadrant frames with matching shared layout IDs, and `TaskCard` publishes a stable task layout ID based on backend + task ID so cards retain visual identity across the two views. Wrapper-only quadrant metadata uses `data-zoom-quadrant` so the existing `[data-quadrant]` contract continues to identify the Glow cell/frame nodes.

### Step ✅ 7.2 — Touch pinch
**Goal.** Pinch-in from view1 zooms into the quadrant under the pinch midpoint at gesture start. Pinch-out from view2 returns to view1 with a 600 ms highlight on the previously-focused quadrant.
**Outputs.** Pointer event handler at the matrix root using two-pointer detection (no third-party library; the math is small).
**Done when.**
- Pinch-in test (synthetic pointer events) targets the correct quadrant from each midpoint.
- Pinch-out test confirms highlight appears and decays.

### Step ✅ 7.3 — Mouse wheel
**Goal.** `Ctrl + wheel` toggles zoom; plain wheel scrolls within the focused element (cell or quadrant).
**Outputs.** Wheel handler in `ZoomController`. Direction: wheel-up = zoom in, wheel-down = zoom out.
**Done when.**
- Plain-wheel scrolling inside a cell is unaffected.
- `Ctrl + wheel-up` on view1 zooms into the cell under the cursor.
- `Ctrl + wheel-down` on view2 returns to view1.

### Step ✅ 7.4 — Keyboard
**Goal.** `Esc` zooms out from view2 (or closes view3 if open); `Enter` on a focused matrix cell zooms in; arrow keys move focus between cells; `+` / `-` zoom.
**Outputs.** Global keyboard handler at the app shell, dispatching to view-state.
**Done when.** Keyboard-only e2e: navigate to Q2 → Enter → land in view2/Q2; Esc returns to view1.

### Step ✅ 7.5 — Reduced-motion path
**Goal.** When `prefers-reduced-motion: reduce`, all zoom animations are instant cuts (no morph).
**Outputs.** `ZoomController` reads `useReducedMotion` (Step 3.9) and skips the Framer Motion transition.
**Done when.** Test in both modes covers the same state transitions; only the animation duration differs.

**Phase 7 exit:** view1 ↔ view2 navigation feels seamless across input types.

---

## Phase 8 — view3: Task focus

Task editor. Depends on Phase 4 and Phase 3.

### Step ✅ 8.1 — Surface container
**Goal.** view3 mounts inside `ResponsiveSurface` (Step 3.4): bottom sheet on mobile, right side panel on desktop, ≤ 480 px wide. The matrix below remains visible.
**Outputs.** `packages/app/src/views/task/TaskView.tsx`, route handler reading `?task=:id`.
**Done when.** Opening view3 over view1 keeps the matrix dim but visible; over view2 the focused quadrant is partly visible.

### Step ✅ 8.2 — Field editors: title, notes, status
**Goal.** Editable title (single-line), notes (markdown via a small editor — `textarea` in v1 with preview toggle is acceptable; a richer editor is later), status checkbox.
**Outputs.** `TitleField.tsx`, `NotesField.tsx`, `StatusToggle.tsx`. All wired to `useUpdateTask` with debounce (300 ms).
**Done when.** Edits persist; fast typing does not produce N writes (debounced to 1).

### Step ✅ 8.3 — Due date + time
**Goal.** Use `DueDatePicker` (Step 3.7) for date; an optional time field appears after a date is set.
**Outputs.** `DueField.tsx`.
**Done when.** Each preset works; clearing date also clears time; "No date" disables the time field.
**Note.** The time input is rendered unconditionally and only switches between `disabled` (no date) and enabled (date set), rather than mounting/unmounting on date presence. Two reasons: (a) keyboard focus stays stable across edits — you don't lose the active field when the picker churns; (b) the layout no longer reflows when a date is cleared, which would otherwise nudge surrounding controls. The "appears after a date is set" wording in the step intent is satisfied by the disabled-state contrast: until a date exists the time control is visibly inert and `aria-disabled` per native `<input disabled>` semantics.

**Note.** `TaskPatch` under `exactOptionalPropertyTypes: true` does not accept `{ field: undefined }` literals — the contract has no explicit "clear" mechanism. The DueField call sites build the patch as a loose `Record<string, unknown>` and cast to `TaskPatch`; adapters already merge via `{ ...existing, ...patch }`, so a `undefined` value reaches storage and clears the field. Widening `TaskPatch` to `{ [K in keyof P]?: P[K] | undefined }` would propagate type changes through every adapter assertion (`{ ...existing, ...patch }: Task` ceases to typecheck because spread results would carry `string | undefined` on what `Task` insists is `string`) — out of scope for an editor step. If a third optional field ever needs clearing we should revisit and widen the contract end-to-end.

### Step ✅ 8.4 — Priority editor
**Goal.** Segmented control for none / low / normal / high.
**Outputs.** `PriorityField.tsx`.
**Done when.** Keyboard navigation works; selection updates the task.

### Step ✅ 8.5 — Quadrant editor
**Goal.** `QuadrantPicker` (Step 3.6) with current selection highlighted.
**Outputs.** `QuadrantField.tsx`.
**Done when.** Picking a different quadrant updates the task; matrix below reflects the move.

### Step ✅ 8.6 — Backend selector + migration
**Goal.** Dropdown of registered backends; selecting a different backend triggers `migrateTask` (Step 2.7) with a progress indicator and error handling.
**Outputs.** `BackendField.tsx`.
**Done when.**
- Migration success: task now lives under the new backendId; view3 stays open.
- Migration failure (target-create): error banner; task unchanged.
- Migration partial failure (source-delete): warning toast; orphan source is enqueued for cleanup retry.

### Step ✅ 8.7 — Backend-unsupported field hints
**Goal.** Each field declares which backends support it; an info icon appears next to a field whose value won't natively round-trip on the active backend (it will still be encoded into notes per design).
**Outputs.** `useFieldSupport(field)` hook reading `BackendCapabilities`; small `<UnsupportedHint>` component.
**Done when.** Switching to a less-capable backend mock surfaces the hint on Priority and Due-time fields.

### Step ✅ 8.8 — Complete & delete actions
**Goal.** Complete is the status toggle from 8.2; delete is a trash icon that fires `useDeleteTask` and shows an undo snackbar (Step 3.5) for 5 s.
**Outputs.** `TaskActions.tsx`.
**Done when.**
- Click delete → snackbar appears; pressing undo cancels the delete (no commit happened yet).
- Letting the snackbar expire commits the delete.

### Step ✅ 8.9 — Close behavior
**Goal.** Closing view3 returns the user to whichever view (view1 or view2) was visible when it opened, recorded by `openedFromZoom` in `ViewState` (Step 1.7).
**Outputs.** Close handler in `TaskView.tsx`.
**Done when.** Open from view1 → close → land in view1. Open from view2/Q3 → close → land in view2/Q3.

**Phase 8 exit:** end-to-end task editing works on both desktop and mobile, including backend migration.

---

## Phase 9 — view4: Options

Settings & data management.

Depends on Phase 4. Internal sub-routing.

### Step ✅ 9.1 — Options shell + sub-routing
**Goal.** `/options` lists groups; `/options/:group` opens the corresponding panel; back-button friendly.
**Outputs.** `packages/app/src/views/options/OptionsView.tsx`, `OptionsList.tsx`.
**Done when.** Browser back/forward works between groups.

### Step ✅ 9.2 — Backends panel
**Goal.** List registered backends with sync status, connect/disconnect actions, and a "default backend for new tasks" radio.
**Outputs.** `BackendsPanel.tsx`. (Connect actions for Google/MS will be wired when those adapters land; in this release only "Local (IndexedDB)" is connectable; the other two render disabled rows with "Coming later".)
**Done when.** Default selection persists; UI shows last-sync timestamp from the sync engine.

### Step ✅ 9.3 — Account panel
**Goal.** Show connected identity per backend; sign-out per backend.
**Outputs.** `AccountPanel.tsx`. Local backend has no account; renders informational copy. Google/MS rows are placeholders.
**Done when.** UI renders correctly for the local-only state.

### Step ✅ 9.4 — Appearance panel
**Goal.** Theme is locked to Dark in this release (rendered as disabled). Per-quadrant color overrides editable; persisted to user prefs.
**Outputs.** `AppearancePanel.tsx`. Override state stored under a `prefs` IDB store; merged into the theme on read.
**Done when.** Changing Q1 color updates the matrix glow without reload; clearing override returns to the design-system default.

### Step ✅ 9.5 — Defaults panel
**Goal.** Default quadrant for new tasks; default secondary sort (due date / created / title).
**Outputs.** `DefaultsPanel.tsx`. Defaults are read by Step 5.8 and Step 5.7.
**Done when.** Changing default quadrant changes the FAB → quick composer pre-selection.

### Step ✅ 9.6 — Data panel
**Goal.** Export all tasks (across backends) to JSON; import from JSON; clear local cache (does not affect remote backends).
**Outputs.** `DataPanel.tsx`. Export format documented in `packages/backend-core/src/export-format.md`.
**Done when.**
- Round-trip test: export → clear → import → original tasks restored.
- Clear local cache leaves remote backends intact (verified with the in-memory adapter as a remote stand-in).

### Step 9.7 — About panel
**Goal.** Version, build commit SHA, link to source.
**Outputs.** `AboutPanel.tsx`. Build info injected at Vite build time.
**Done when.** Live build shows the actual commit hash.

**Phase 9 exit:** options surface complete; user can manage backends, appearance, defaults, and data.

---

## Phase 10 — Conflict resolution UI

Wire the `ConflictResolver` (Step 1.4) to a user-facing modal.

Depends on Phases 2, 3, 4.

### Step 10.1 — Conflict modal
**Goal.** Modal displaying local vs remote whole-record side by side with the differing fields highlighted; "Keep local" / "Keep remote" actions.
**Outputs.** `packages/app/src/views/conflict/ConflictModal.tsx`. Uses the design-system Sheet/SidePanel surfaces (or a centered modal — to be decided in the step; default = centered modal because conflict resolution should be focused).
**Done when.** Opening the modal with a synthetic `ConflictRecord` shows both sides and allows choosing.

### Step 10.2 — Resolver wiring
**Goal.** Register a `ConflictResolver` on the app's sync-engine instance that opens the modal and awaits the user's choice. Multiple conflicts queue and are presented one at a time.
**Outputs.** `useConflictResolver` hook + connection in app shell. Resolver returns the chosen side; sync engine writes the choice back.
**Done when.**
- Synthetic two-conflict pull: modal opens twice in sequence.
- Choosing remote produces the same record on both sides after sync.

### Step 10.3 — Backstop for non-modal conflicts
**Goal.** If the user is mid-action (drag, composing) when a conflict arrives, queue it; show a small badge on the sync-status icon; the modal opens on next user idle or on click.
**Outputs.** Idle detector + queue.
**Done when.** During an active drag, no modal appears; drag completes; modal opens.

**Phase 10 exit:** conflict UX matches the design-input promise (whole-record local/remote choice).

---

## Phase 11 — Cross-cutting polish & release

Final pass for correctness, accessibility, and shipping.

Depends on all prior phases.

### Step 11.1 — Time-zone handling end-to-end
**Goal.** Verify dates round-trip through the canonical model and adapters in the user's local zone; document the rule in `packages/backend-core/src/time.md`.
**Outputs.** Unit tests across DST boundaries; UI string for "Today / Tomorrow / This weekend / Next week" computed from `Date.now()` localized.
**Done when.** Tests across UTC, Europe/Berlin, America/Los_Angeles pass.

### Step 11.2 — Loading / error / empty audit
**Goal.** Every view shows a skeleton while loading, an inline error banner with retry on failure, and the standardized empty state when applicable.
**Outputs.** Audit checklist + minor patches per view.
**Done when.** Each view file references the design-system primitives (mechanical grep verifies coverage).

### Step 11.3 — Accessibility audit
**Goal.** Verify WCAG 2.2 AA contrast across the dark palette + glow combinations; full keyboard navigation; screen-reader smoke test (NVDA / VoiceOver) on view1, view2, view3, view4.
**Outputs.** `docs/a11y-audit.md` (audit results + actions); patches.
**Done when.** Axe-core e2e check returns 0 critical issues. `prefers-reduced-motion` regression test passes.

### Step 11.4 — E2E golden path
**Goal.** Playwright test running: open app → see 3 sample tasks → create a new task → drag it from Q3 to Q1 → focus it → set due to "Tomorrow" → mark complete → verify completed state and order.
**Outputs.** `packages/app/e2e/golden-path.spec.ts`.
**Done when.** Runs green locally and in CI.

### Step 11.5 — PWA install + offline e2e
**Goal.** Playwright test installing the PWA (or simulating offline once installed): kill network → reload → app shell loads → existing tasks visible → new task creation queues; reconnect → queue flushes.
**Outputs.** `packages/app/e2e/pwa-offline.spec.ts`.
**Done when.** Runs green locally and in CI.

### Step 11.6 — Release checklist & GitHub Pages live
**Goal.** Tag a release, deploy to GitHub Pages, verify install flow on Android Chrome and Windows Chrome.
**Outputs.**
- `RELEASE.md` checklist (manual smoke, Android install screenshots, Windows install screenshots, Lighthouse PWA score).
- v0.1.0 git tag + signed release notes.
- Live URL recorded in `status.md`.
**Done when.**
- App is installable on Android Chrome and on Windows Chrome.
- Lighthouse PWA audit ≥ 90.
- All Phase 11 tests green in CI.

**Phase 11 exit:** first release shipped.

---

## After the first release

Out of scope for this plan; tracked here as forward-looking notes only:

- `backend-google` adapter (Phase 1's contract suite is the entry point — implement it, run the suite, integrate the OAuth PKCE flow).
- `backend-microsoft` adapter (same pattern).
- Recurrence (RRULE-based; materialize follow-up at completion time).
- Reminders / Web Notifications.
- Light theme.
- Multi-locale i18n.
