# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 5.2 — Task card.

`packages/app/src/views/matrix/TaskCard.tsx` (new): single-row summary of a `Task`, used by view1 cells (Step 5.3) and view2 (Phase 6). Renders as a `<button>` (so keyboard activation is free) with a 2-row CSS grid: priority dot + title on top, meta (due + tags) on the bottom; the meta row is omitted entirely when both due and tags are empty. Long titles get `white-space: nowrap; overflow: hidden; text-overflow: ellipsis` on `.emt-task-card__title` — the full text stays in the DOM (so AT reads it) and CSS clips at paint. Done tasks get `data-status="done"` which the CSS uses to strike through and mute the title; the priority dot's color shifts via `data-priority` (`high` → q1 red with a 6 px halo; `normal` → accent cyan; `low` → muted secondary; `none` → outlined-only). The dot is `aria-hidden` because the visible button text already conveys the task's identity to AT.

Click handler reads `useViewStateStore.getState()` rather than subscribing — the card itself doesn't render anything that depends on zoom or focus, so subscribing would re-render every card on every navigation. The handler merges in `focusedTaskId: task.id, openedFromZoom: state.zoom`, so the URL becomes `/?task=:id&from=matrix` over view1 and `/q/:Q?task=:id&from=quadrant` over view2; that's the contract the Phase 6 / 8 close action reads back.

Date label: `Intl.DateTimeFormat(undefined, { dateStyle: 'medium' })` for the date, `{ timeStyle: 'short' }` appended after a `·` separator when `dueTime` is set. `IsoDate` (`YYYY-MM-DD`) is parsed with local-time components — `new Date(iso)` would parse it as UTC midnight and shift backwards in negative-offset zones. The `<time datetime="…">` carries the canonical ISO date.

`packages/app/src/views/matrix/task-card.css` (new): all card chrome. Pulls from CSS variables only (no hard-coded color or spacing) so re-skinning is a token edit.

Tests: `test/task-card.test.tsx` (12 cases) — all four priorities render the matching dot variant; no due-date suppresses the `<time>` element; date-only and date+time produce the expected formats (locale-tolerant — asserts structural facts like "contains 2026", not the exact string); multiple tags render as separate siblings in document order; an empty due+tags task drops the meta row; long titles keep the ellipsis class so CSS can clip; done tasks carry `data-status="done"`; click writes view3 state both over the matrix root (`/?task=…&from=matrix`) and the quadrant route (`/q/Q2?task=…&from=quadrant`).

254 vitest tests pass (was 241; +13). Typecheck clean, lint clean, format clean. Production build is identical to 5.1's (199.74 KB JS / 1.35 KB CSS) — TaskCard isn't yet imported by any consumer, so rollup tree-shakes it. Step 5.3 will pull it into `MatrixCell` and the bundle will grow then.

**Next:** Step 5.3 — Per-cell task list. `MatrixCell` calls `useTasks(quadrant)` and renders the returned tasks as `TaskCard`s in the sort order from Step 5.7 (manual + due-date secondary; until 5.7 lands, default to creation order or due-date asc). Done when tasks created via the Phase 4 debug page appear in their respective cells without reload.

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
