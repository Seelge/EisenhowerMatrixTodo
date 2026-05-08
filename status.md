# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 5.3 — Per-cell task list.

`packages/app/src/views/matrix/MatrixCell.tsx` now calls `useTasks(quadrant)` (the Phase 4 hook) and renders one `TaskCard` per task in a new `.emt-matrix__cell-list` container. The list is sorted by `createdAt` ascending — the explicit interim ordering called out in the plan; Step 5.7 will replace it with manual ranks plus a due-date secondary sort. Sorting happens in a `useMemo` so cell re-renders triggered by sibling cells' updates don't reshuffle the array. Each cell makes its own quadrant-filtered query (the query key includes the quadrant), which lets the local IDB adapter filter at the source via its `quadrant` index rather than fetching everything and filtering in memory.

Loading state renders two `Skeleton` rows (`height={44}`); error state renders the design-system `ErrorBanner` with `query.error.message` and a retry button wired to `query.refetch()`. Empty state renders nothing — the muted `EmptyNote` is reserved for view2 per design-input. The cell carries a `data-task-count` attribute that's `0` while empty / `n` once tasks load; tests use it to wait for the query to resolve without polling card counts.

`packages/app/src/views/matrix/matrix.css`: added `.emt-matrix__cell-list` (column flex, `flex: 1`, `min-height: 0` so cell content can scroll independently in Step 5.4) and a `.emt-matrix__cell-skeleton` border-radius hook so loading rows match the card silhouette.

Tests: `test/matrix-cell.test.tsx` (5 cases) — quadrant filtering & createdAt asc ordering; empty quadrant; live update after `useCreateTask` mutates without remount (the explicit "no reload" check from the plan's "Done when"); skeleton on initial pending; ErrorBanner when `adapter.list` rejects. `test/matrix-view.test.tsx` and `test/router.test.tsx` were rewrapped in `renderWithQueryClient` and given a fresh `IDBFactory` per test (since `MatrixCell` now subscribes to a query that touches IDB through the registry).

259 vitest tests pass (was 254; +5). Typecheck clean, lint clean, format clean. Production build: 210.97 KB JS / 3.58 KB CSS (was 199.74 KB / 1.35 KB) — the CSS bump is `task-card.css` finally pulled into the graph now that `MatrixCell` imports `TaskCard`.

**Next:** Step 5.4 — Independent vertical scroll per cell. Each cell needs its own scroll viewport while the matrix container itself does not scroll; scrollbars styled to match the dark theme. The `.emt-matrix__cell-list` is already `flex: 1; min-height: 0` so adding `overflow-y: auto` (plus dark-theme scrollbar styling) on the list should be the bulk of it. Verify with two cells full of overflow-height tasks.

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
