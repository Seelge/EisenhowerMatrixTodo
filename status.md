# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 8.2 — view3 field editors (title, notes, status).

`TaskView` now loads the focused task via `useTask(focusedTaskId)` and mounts the three editor components — `TitleField`, `NotesField`, `StatusToggle` — under `key={task.id}` so each field starts with a clean local-state slate whenever the focused task changes. A not-found notice covers the (rare) case where the query resolves to `undefined` (deleted in another tab, unknown id, query still pending). The Step 8.1 placeholder string (`app.task.placeholder`) was retired.

Field editors:
- `TitleField.tsx`: single-line input. Mirrors `task.title` locally; writes go through `useUpdateTask` with a 300 ms debounce. Blur flushes the pending value before the timer.
- `NotesField.tsx`: 5-row textarea (preview toggle deferred — v1 is plain Markdown per plan). Same debounce contract.
- `StatusToggle.tsx`: discrete checkbox, no debounce. open → done stamps `completedAt` with the current ISO timestamp; done → open leaves `completedAt` in place so the record carries a "last completed at" trail.

Shared plumbing:
- `use-debounced-commit.ts`: mirrors external value locally, restarts a single 300 ms timer per keystroke, exposes `flush()` for blur, auto-flushes on unmount. The hook keeps the latest `commit` closure in a ref so parent re-renders don't disturb the in-flight timer. It does NOT reset local state when `external` changes — a server invalidation while the user is mid-edit must not stomp their keystrokes; remounting (via `key={task.id}` in `TaskView`) handles task switches.
- `task-view.css`: layout + form-control styling, reusing tokens from the design system. Borrows the visual vocabulary of `emt-quick-composer__*` so the two surfaces feel like the same family.

Tests:
- `packages/app/test/task-fields.test.tsx`: seeds a real task through the registered local IDB adapter, spies on `adapter.update`, and asserts (a) `TitleField` seeds from the task title, (b) the title commit lands once after the 300 ms window with the latest value, (c) **the "Done when" assertion**: five rapid keystrokes on `NotesField` produce exactly one adapter write carrying the final value (debounced N → 1), (d) blur flushes the pending notes value before the timer, (e) toggling status open → done writes `status: 'done'` plus a stamped `completedAt`, (f) toggling done → open writes only `status: 'open'` and leaves `completedAt` untouched on the persisted record.

Verification:
- `pnpm --filter @emt/app exec tsc` passes.
- `pnpm lint` + `pnpm format:check` pass.
- `pnpm test` passes: 56 files / 385 tests (+6).
- `pnpm --filter @emt/app build` passes. Production build: 401.76 KB JS / 13.10 KB CSS.
- `pnpm e2e` passes: 6 tests.

**Previously completed:** Step 8.1 — view3 surface container (opened Phase 8). `TaskView` mounts inside `ResponsiveSurface`: Sheet + 40 %-opacity scrim on narrow viewports, ~480 px SidePanel (no scrim) on wide. Dialog plumbing (focus trap, Esc, focus restore) comes from `useDialogBehavior` inside the surface; `ZoomController`'s Escape handler no longer dispatches on `focusedTaskId !== undefined` so a single Esc doesn't push two history entries.

**Next:** Step 8.3 — Due date + time. Use the design-system `DueDatePicker` (Step 3.7) for the date; an optional time field appears after a date is set. Output `DueField.tsx`. Done when each preset works, clearing the date also clears the time, and "No date" disables the time field.

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
