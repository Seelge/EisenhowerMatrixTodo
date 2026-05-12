# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 8.4 — view3 priority editor (`PriorityField.tsx`). Four-option segmented control (none/low/normal/high) wired as a WAI-ARIA radio group with roving tabindex; ArrowLeft/Right + ArrowUp/Down move both focus and selection; Home/End jump to the ends; navigation clamps at the boundary rather than wrapping (same pattern as the design-system `QuadrantPicker`). Writes are discrete — `useUpdateTask` fires once per click or arrow press, and re-selecting the current priority is a no-op. New i18n keys `app.task.fields.priority{,.none,.low,.normal,.high}`. 7-case test covers initial roving-tabindex state, click + keyboard navigation, Home/End, and clamping on both edges. CI run `25763668227` + Deploy `25763668288` green on `main`.

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

**Next:** Step 8.5 — Quadrant editor. Mount the design-system `QuadrantPicker` (Step 3.6) inside view3 with the task's current quadrant highlighted. Done when picking a different quadrant updates the task and the matrix below reflects the move.

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
