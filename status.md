# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 9.5 — Defaults panel (`DefaultsPanel.tsx`). Two values: default quadrant for new tasks (feeds view1's FAB `QuickComposer.defaultQuadrant` via the new `useNewTaskQuadrant()` selector) and default secondary sort (`dueDate` / `createdAt` / `title`). Both `MatrixCell` and `QuadrantView` now read `useSortBy()` and pass it into the extended `sortTasks(tasks, ranks, secondary)`; the comparator keeps `'dueDate'` as the default secondary key when no argument is passed, preserving the Step 5.7 contract for existing call sites. State lives in a Zustand store backed by the shared meta IDB store; `App.tsx` calls `useDefaultsStore.load()` on mount. 2-case test asserts FAB pre-selection flips after the panel writes the quadrant, and that `sortBy='title'` rehydrates across a fresh `load()`. CI run `25766026251` + Deploy `25766026253` green on `main`.

**Previously completed:** Step 9.4 — Appearance panel + per-quadrant color overrides. `AppearancePanel.tsx` locks the theme radio to "Dark" (the only theme shipped this release) and renders a per-quadrant color row for each of Q1-Q4 — native `<input type="color">` plus a Reset button that drops the override and returns to the design-system default. Plumbing: new `state/appearance.ts` Zustand store mirrors saved overrides under `appearance:q{n}` keys in the shared meta IDB store (reusing the registry's existing `MetaStore`); `ThemeProvider` gained an optional `colorOverrides` prop wiring through to the matching CSS variables; `App.tsx` calls `useAppearanceStore.load()` on mount and forwards live overrides so the matrix glow updates without reload. 4-case test covers default seeding, live CSS-variable update via the store, reset semantics, and persistence across remount. CI run `25765746450` + Deploy `25765746496` green on `main`.

**Previously completed:** Step 9.3 — Account panel (`AccountPanel.tsx`). Renders the registered backends with an informational status string for each (today: just the local IDB backend, which has no account concept) plus two future-backend placeholder rows for Google Tasks and Microsoft To-Do with disabled "Sign out" buttons. Structure mirrors `BackendsPanel` so the eventual remote rows can share the registry plumbing. 1-case test asserts the local-only state renders as expected. CI run `25765395927` + Deploy `25765395930` green on `main`.

**Previously completed:** Step 9.2 — Backends panel (`BackendsPanel.tsx`). Lists registered backends with a default radio writing through `registry.setDefault(id)` (persists to the registry's meta store, so a remount picks the same selection up). Two placeholder rows for Google Tasks and Microsoft To-Do preview the eventual shape with disabled Connect buttons and a "Coming later" status. Local-backend status label is "Always in sync (local writes are direct)" — natural slot for a real timestamp once the sync engine surfaces one. OptionsView's `GroupPanel` dispatches the `backends` slug to this panel; the other five still render the placeholder. 2-case test covers initial layout + future placeholders, and default-persistence across remount. CI run `25765242150` + Deploy `25765242178` green on `main`.

**Previously completed:** Step 9.1 — Options shell + sub-routing (opens Phase 9). `/options` lists six group entries (Backends, Account, Appearance, Defaults, Data, About); `/options/:group` opens a placeholder panel that later phase-9 steps fill in. The Routes shell dispatches via a new `isOptionsPath(internalPath)` predicate alongside the dev-only `/__debug` branch, so the matrix/quadrant flow is untouched. Sub-routing uses a new `useViewStateStore.navigateRaw(internal)` method that pushes history for out-of-band paths that don't map to a `ViewState` — the surface reads `useInternalPath()` directly. The Phase-8 `View3 close` semantics still apply because options live outside the projection. 9 test cases across `options-routing` (6 pure-function) and `options-view` (3 render cases including a back-button round trip). CI run `25765028812` + Deploy `25765028796` green on `main`.

**Previously completed:** Step 8.9 — view3 close behavior (closes Phase 8). New `closeViewState(state)` helper is the single source of truth for view3's landing zone — both the surface's Esc/scrim close and `TaskActions`' delete-commit route through it. Target zoom is `openedFromZoom` (whichever view was visible when view3 was opened), falling back to the current `zoom` for ad-hoc constructed states. Focused quadrant is preserved when landing on `quadrant` and dropped when landing on `matrix`. 4-case pure-function test covers both happy paths (open from view1 → matrix; open from view2/Q3 → quadrant/Q3), the mixed-state case (current zoom diverges from opener intent — opener wins), and the no-`openedFromZoom` fallback. CI run `25764785448` + Deploy `25764785457` green on `main`.

**Previously completed:** Step 8.8 — complete & delete actions (`TaskActions.tsx`). Trash icon in the view3 header. Clicking trash closes view3 (focusedTaskId dropped via `replace()`) and queues a `useDeleteTask` mutation behind a 5-second undo snackbar. Pressing Undo within the window dismisses the snackbar, restores `focusedTaskId`, and the deletion never runs; letting the timer expire fires the adapter delete. Both URL updates use `replace()` so a delete + maybe-undo is one history entry rather than three. `TaskActions` accepts an optional `snackbarDuration` for tests (production inherits the 5-second default). 3-case test covers the immediate trash-click state, the Undo path, and the timer-expiry path with a 50 ms test duration. CI run `25764582116` + Deploy `25764582177` green on `main`.

**Previously completed:** Step 8.7 — backend-unsupported field hints. `useFieldSupport(backendId, capability)` resolves the active adapter's `BackendCapabilities` and returns whether the named field round-trips natively (defaults to `true` until the async resolution lands, so no hint-flash for a frame). `UnsupportedHint` renders a small `role="note"` info icon with an a11y description, wired into the Priority field (priority capability) and the Due-time half of `DueField` (dueTime capability). `InMemoryAdapter` gained an optional `capabilities` constructor option so tests can spin up less-capable stand-ins (Google-Tasks-shaped: dueTime/priority/recurrence all false). 2-case test asserts no hint on the local backend and exactly two hints when the active backend lacks support. CI run `25764385549` + Deploy `25764385495` green on `main`.

**Previously completed:** Step 8.6 — view3 backend selector + migration (`BackendField.tsx`). A `<select>` of all registered backends; picking a different backend invokes `useMigrateTask`. Three paths: success rewrites the URL to the target task's new id via `replace()` so view3 stays open over the migrated record without stacking a Back step; target-create failure surfaces an inline `ErrorBanner` with the source untouched per the migrate contract; source-delete-after-target-create-succeeded commits the target side, flips the URL, and fires a warning snackbar telling the user the original copy lingered (cleanup retries deferred to a future step). `useMigrateTask` gained an optional `onStaleSource` callback so the field can pass a snackbar handler without leaking the snackbar through the queries layer. `SnackbarProvider` is now mounted in `App.tsx` (Step 8.8's delete-undo will share the same queue). `@emt/backend-inmemory` joined `@emt/app` deps for the test harness. 4-case test covers initial dropdown population, success-path URL flip, target-create error path, and partial-failure snackbar. CI run `25764153518` + Deploy `25764153532` green on `main`.

**Previously completed:** Step 8.5 — view3 quadrant editor (`QuadrantField.tsx`). Mounts the design-system `QuadrantPicker` (Step 3.6) with the task's current quadrant marked `aria-checked`. Changing the selection writes through `useUpdateTask`; the matrix below picks up the move via the existing `['tasks']` cache invalidation on `onSuccess`, so no view3-specific cross-component plumbing is needed. Re-uses the same lowercase/uppercase translation tables as `QuickComposer` (design-system uses `q1`-`q4`, canonical `Task.quadrant` is `Q1`-`Q4`). 4-case test covers initial aria-checked state, click writes the patch, clicking the current quadrant is a no-op, and arrow-key navigation writes through. CI run `25763844503` + Deploy `25763844244` green on `main`.

**Previously completed:** Step 8.4 — view3 priority editor (`PriorityField.tsx`). Four-option segmented control (none/low/normal/high) wired as a WAI-ARIA radio group with roving tabindex; ArrowLeft/Right + ArrowUp/Down move both focus and selection; Home/End jump to the ends; navigation clamps at the boundary rather than wrapping (same pattern as the design-system `QuadrantPicker`). Writes are discrete — `useUpdateTask` fires once per click or arrow press, and re-selecting the current priority is a no-op. New i18n keys `app.task.fields.priority{,.none,.low,.normal,.high}`. 7-case test covers initial roving-tabindex state, click + keyboard navigation, Home/End, and clamping on both edges. CI run `25763668227` + Deploy `25763668288` green on `main`.

**Previously completed:** Step 8.3 — view3 due date + time editor (`DueField.tsx`).

`DueField` composes the design-system `DueDatePicker` (Step 3.7) for the date side and a native `<input type="time">` for the optional time. Both are discrete pickers, so writes go straight through `useUpdateTask` — no debounce (unlike `TitleField`/`NotesField`). The time control is mounted unconditionally and toggles its `disabled` attribute based on `task.dueDate !== undefined`: keyboard focus and surrounding layout stay stable across date edits, and the visibly-inert state still communicates "set a date first." `TaskView` mounts the field between `NotesField` and `StatusToggle`.

Clear semantics:
- Picking the "No date" preset emits a single patch carrying `dueDate: undefined` AND `dueTime: undefined` — the time half always follows the date half down when the date is cleared. Verified end-to-end: the adapter spreads the patch, IDB stores the undefined values, and a subsequent `get` returns a record with neither field set.
- Clearing the time alone (empty `<input type="time">`) emits `{ dueTime: undefined }` only — `dueDate` is preserved.

TaskPatch / EOPT note (also recorded inline in `plan.md` step 8.3):
- `TaskPatch = Partial<Omit<Task, 'id' | 'backendId' | 'createdAt' | 'updatedAt'>>`. Under `exactOptionalPropertyTypes`, optional-field values cannot be `undefined`, so a literal `patch: TaskPatch = { dueDate: undefined }` is rejected. The contract has no explicit "clear" mechanism today.
- `DueField` builds the patch as `Record<string, unknown>` and casts. Adapters already spread the patch (`{ ...existing, ...patch }`), so `undefined` reaches storage and clears the field.
- The alternative — widening `TaskPatch` to `{ [K]?: T[K] | undefined }` — propagates type errors through every adapter assertion (`const next: Task = { ...existing, ...patch }` fails because the resulting record carries `string | undefined` on fields `Task` declares as `string`). Out of scope for an editor step; revisit if a third optional field ever needs clearing.

Tests (`packages/app/test/due-field.test.tsx`, 6 cases, +6 over Step 8.2):
- (a) seeded with no `dueDate`, the time input is `disabled`;
- (b) seeded with `dueDate` + `dueTime`, the time input is enabled and shows the existing time;
- (c) clicking the "Today" preset writes a `YYYY-MM-DD` ISO date (shape-matched so the test is timezone-agnostic);
- (d) **the "Done when" assertion**: clicking "No date" on a task with both fields fires one adapter write containing both `dueDate: undefined` and `dueTime: undefined`, and the persisted record afterwards has neither;
- (e) typing into the time input writes only `dueTime`, leaving `dueDate` out of the patch;
- (f) clearing the time alone writes `dueTime: undefined` and preserves the stored `dueDate`.

i18n: added `app.task.fields.due` ("Due") and `app.task.fields.dueTime` ("Time"). The DueDatePicker brings its own preset labels via the design system.

Verification:
- `pnpm typecheck` passes.
- `pnpm lint` + `pnpm format:check` pass.
- `pnpm test` passes: 57 files / 391 tests (+6).
- `pnpm --filter @emt/app build` passes. Production build: 404.19 KB JS / 13.68 KB CSS.
- `pnpm e2e` passes: 6 tests.
- CI run `25763038230` and Deploy run `25763038224` green on `main`.

**Previously completed:** Step 8.2 — view3 field editors (title, notes, status). `TitleField` / `NotesField` mirror task fields locally and commit through `useUpdateTask` with a 300 ms debounce + blur/unmount flush via `use-debounced-commit.ts`; `StatusToggle` writes immediately and stamps `completedAt` on open → done, leaving the trail intact on done → open. Field state is reset between tasks by remounting under `key={task.id}` in `TaskView`.

**Also: docs.** A small follow-up commit (`docs: backfill ✅`) added the missing ✅ markers on plan.md headings for steps 7.2–7.5, 8.1, and 8.2 — `status.md` had already recorded them complete, but the inline headings were stale.

**Next:** Step 9.6 — Data panel. Export all tasks (across backends) to JSON; import from JSON; clear local cache. Export format documented. Done when round-trip export → clear → import restores tasks, and clear-local-cache leaves remote backends intact.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

None.

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. Find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
