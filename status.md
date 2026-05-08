# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 5.7 — Sort: manual with due-date secondary + reset.

UI-only manual ordering, kept off the canonical `Task` model and out of every sync path.

`packages/app/src/state/task-order.ts` (new): owns a separate IDB database `emt-ui-order` (v1) with one `taskOrder` store, compound-keyed by `[backendId, taskId]` and holding `{ backendId, taskId, rank: number }`. Public DAO surface is small on purpose — `openTaskOrderDb`, `loadTaskOrderMap` (returns the whole rank table as an in-memory `Map<string, number>` so the comparator can do O(1) lookups), `setTaskRank`, `clearTaskRanks`. `taskOrderKey(backendId, taskId)` is the canonical string form used as the map key. The bootstrap in `state/backends.ts` opens this DB alongside the sync DB; the new handle (`taskOrderDb: OrderDb`) is part of the cached `AppBackends` so callers never re-open it.

`packages/app/src/queries/task-order.ts` (new): TanStack Query bindings — `useTaskOrder()` reads the whole `TaskOrderMap` once, `useSetTaskRank()` and `useClearTaskRanks()` both invalidate `['taskOrder']` on success so the four cells re-sort in lockstep. Loading the entire rank table per render is fine: count is bounded by total task count, and every cell needs the data anyway.

`packages/app/src/views/matrix/sort.ts` (new): pure comparator. Manual rank ascending floats above unranked; among unranked we go due-date asc with nulls-last, then `dueTime` as a tiebreaker on equal dates, then `createdAt` ascending for full determinism. `compareTasks(a, b, ranks)` is the comparator; `sortTasks(tasks, ranks)` wraps it in a non-mutating `[...].sort()`. `refsForReset(tasks)` returns the `(backendId, taskId)` list the cell hands to `useClearTaskRanks` when the user clicks "Reset order".

`packages/app/src/views/matrix/MatrixCell.tsx`: replaced the `sortByCreatedAtAsc` placeholder with `sortTasks(tasks, ranks)`. The cell header gains a small `Reset order` button whose visibility depends on `tasks.some(task => ranks.has(taskOrderKey(...)))` — the chrome stays out of the way for the default (no-rank) state. The button is disabled while the clear mutation is pending; on success the rank query invalidates and the button vanishes once the cell sees no manual ranks.

`packages/app/src/views/matrix/dnd.ts`: `createDragEndHandler` grew an optional `setRank` dep and an injectable `now` (defaults to `Date.now`) for deterministic tests. After the optimistic move + `mutate` write, a successful cross-cell drop also calls `setRank({ backendId, taskId, rank: now() })`. `Date.now()` as the rank means newer drops sort below older ones in the destination's manual section — natural "the task you just dragged in lands at the bottom of the manual list". No-op drops (no `over`, same quadrant) skip both the move and the rank write. Errors from `setRank` are intentionally swallowed: ranks are a UI nicety, the user-visible move has already happened.

`packages/app/src/views/matrix/MatrixView.tsx`: instantiates `useSetTaskRank` and threads `setRank.mutate` into `createDragEndHandler` alongside the existing `updateTask.mutate`.

`packages/app/src/views/matrix/matrix.css`: `.emt-matrix__cell-reset` styling — pill-shaped, transparent until hover/focus-visible, uppercase XS label so it reads as a secondary action.

i18n: one new string in `strings.en.ts` — `app.matrix.cell.reset` ("Reset order").

Tests: `test/matrix-sort.test.ts` (8 cases) — manual rank asc, ranked-floats-above-unranked, due-date asc nulls-last, dueTime as same-day tiebreaker, createdAt as final tiebreaker, `sortTasks` doesn't mutate input, equal ranks compare 0, `refsForReset` shape. `test/matrix-order.test.tsx` (4 cases) — cell renders manual order followed by due-date fallback, reset clears ranks and reverts ordering + hides the button, button is hidden when no manual ranks exist, ranks survive a fresh DB connection (the "persists across reloads" requirement). `test/matrix-dnd.test.tsx` gained 2 cases — drag-end writes a rank with the injected `now()` value, no-op drops skip the rank write.

292 vitest tests pass (was 278; +14). Typecheck clean, lint clean, format clean. Production build: 255.93 KB JS / 6.22 KB CSS (was 253.85 / 5.67) — JS gain is the DAO + queries + sort module + cell rewiring, CSS gain is the reset-button styling.

**Next:** Step 5.8 — FAB + quick composer. `QuickComposer.tsx` wraps title input + 2 × 2 mini-picker for quadrant; uses Step 3.4 `Sheet` on mobile and a popover on desktop. Bottom-right FAB triggers it; submission goes through `useCreateTask` against the registry default backend. Empty title disables submit; Esc / outside click cancels. Optimistically appends the new task to the chosen cell so it shows up before the adapter write resolves. After 5.8, Phase 5 exit criteria are met (matrix is fully functional — view, sort, create, move, focus).

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
