# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 6.6 — Empty state — closes Phase 6. View2 now renders the muted-grey "Nothing here yet." note when the focused quadrant has no tasks, with the neighbor strips and FAB still in place.

`packages/app/src/views/quadrant/QuadrantView.tsx`: imports `EmptyNote` from `@emt/design-system` and adds a `tasks !== undefined && tasks.length === 0` branch inside the existing list `<div>`, ordered after the `query.isPending` skeleton block and the `query.isError` `ErrorBanner` so transient pending states don't flash the empty note. The note text comes from a new `app.quadrant.empty` i18n key — added to `packages/app/src/i18n/strings.en.ts` between `app.matrix.fab.add` and the `app.composer.*` rows.

`packages/app/src/views/quadrant/quadrant.css`: single new rule `.emt-quadrant__empty { margin: auto; }`. The list is already a flex column with `flex: 1` and `min-height: 0`, so `margin-top/bottom: auto` absorbs the vertical free space and centers the note on the main axis. The cross-axis stretches by default, so horizontal centering actually comes from the design-system base style `.emt-empty-note { text-align: center }` in `components.css`, not from this rule. The note only renders when `tasks.length === 0`, so the rule never disturbs the card-stacking layout.

Tests added to `packages/app/test/quadrant-view.test.tsx`:

- A new `'QuadrantView — Step 6.6 empty state'` describe block with two cases. `waitFor` was hoisted to the file top and grew a `boolean | Promise<boolean>` predicate signature so it can wait on adapter calls in the second case.
- `'renders the muted-grey empty note when the focused quadrant has no tasks'` — mounts an empty Q3 view, waits on `.emt-quadrant__skeleton` clearing as the query-resolved sentinel (`data-task-count="0"` is also `0` during loading because `tasks?.length ?? 0` collapses undefined to 0, so it isn't a reliable wait condition), then asserts the EmptyNote text matches `strings['app.quadrant.empty']`, the Q3 neighbor strips (top → Q1, left → Q4) are still present, and the FAB and zero task cards are rendered correctly.
- `'does not render the empty note once the focused quadrant has tasks'` — pre-creates a Q3 task via the registry's first adapter, mounts the view, waits for the card to land, and asserts `.emt-empty-note` is absent. Locks in that the empty branch is gated only on the resolved length, not on the loading state.

328 vitest tests pass (was 326; +2). Typecheck clean, lint clean (Prettier autofixed one block-spacing in the test file during `pnpm format`), format clean. Production build: 265.95 KB JS (was 265.67) / 10.19 KB CSS (was 10.16) — JS gain is the `EmptyNote` import + i18n string, CSS gain is the single new rule.

Phase 6 is now closed. View2 has matrix layout (6.1), drop-on-edge to move (6.2), touch swipe to change focus (6.3), mouse drag-at-edge to change focus (6.4), FAB (6.5), and empty state (6.6). Phase 7 — zoom transition — depends on Phases 5 and 6 and now unblocks.

Additional fixes applied after phase 6:
- Found Playwright Chromium initially failed because Ubuntu 26.04 was missing runtime libraries: `libnspr4`, `libnss3`, and `libasound`.
- Asked the user to install the needed system packages with `sudo apt install -y libnspr4 libnss3 libasound2t64`.
- Verified the missing Chromium shared libraries were resolved after installation.
- Confirmed Playwright screenshot capture works.
- Fixed `packages/app/playwright.config.ts` so `VITE_BASE_PATH=/` applies to both `pnpm build` and `pnpm preview` during e2e.
- Fixed `packages/app/e2e/pwa.spec.ts` to wait for the service worker to control the page before offline reload.
- Updated the offline PWA assertion to check `[data-view="matrix"]` instead of a stale `h1` selector.
- Verified `pnpm e2e` passes: 4 tests passed.
- Verified `pnpm --filter @emt/app exec tsc` passes.

**Next:** Phase 7 opens with Step 7.1 — snap morph animation. Wire `packages/app/src/views/zoom/ZoomController.tsx`: a Framer Motion–driven shell that lives between `<App />`'s router and the actual view components, animating between `zoom: 'matrix'` and `zoom: 'quadrant'` via a single CSS transform on the wrapping container (no per-card layout shift). Cards keep their identity across views via a shared `layoutId` on `MatrixCell` ↔ `QuadrantView`'s task cards — already partially set up in 6.1's note ("same `task.id`, same manual rank, same due-date fallback"). Animation: 200–250 ms with M3 standard easing. The "snap" wording in `plan.md` means there's no in-between layout — the matrix-to-single-quadrant transform is the entire visual transition; cards may rescale via `layout` but their relative positions inside their cell don't shift mid-flight. Practical wiring: install `framer-motion` if not already present (check root `package.json`), add a wrapping `<motion.div layout>` with a key that flips on `zoom`, and let Framer's `LayoutGroup` handle the shared-layout cross-fades. Reduced-motion handling lands in 7.5; for 7.1 the animation is unconditional. Test: toggling zoom via `useViewStateStore.navigate({...state, zoom: 'quadrant', focusedQuadrant: 'Q1'})` from a `zoom: 'matrix'` baseline triggers the morph; cards mid-animation maintain their bounding-box relationship to the cell.

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
