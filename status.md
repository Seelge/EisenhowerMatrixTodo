# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 8.7 — backend-unsupported field hints. `useFieldSupport(backendId, capability)` resolves the active adapter's `BackendCapabilities` and returns whether the named field round-trips natively (defaults to `true` until the async resolution lands, so no hint-flash for a frame). `UnsupportedHint` renders a small `role="note"` info icon with an a11y description, wired into the Priority field (priority capability) and the Due-time half of `DueField` (dueTime capability). `InMemoryAdapter` gained an optional `capabilities` constructor option so tests can spin up less-capable stand-ins (Google-Tasks-shaped: dueTime/priority/recurrence all false). 2-case test asserts no hint on the local backend and exactly two hints when the active backend lacks support. CI run `25764385549` + Deploy `25764385495` green on `main`.

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

**Next:** Step 8.8 — Complete & delete actions. Complete reuses the Step 8.2 `StatusToggle`; delete is a trash icon that fires `useDeleteTask` and shows the undo snackbar (Step 3.5) for 5 s. Output `TaskActions.tsx`. Done when click → snackbar appears → pressing Undo cancels the delete (no commit), and letting the snackbar expire commits the delete.

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
