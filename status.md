# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 6.5 — FAB in view2. View2 now has its own bottom-right FAB that opens a picker-less `QuickComposer`, creating tasks directly in the focused quadrant.

`packages/app/src/views/matrix/QuickComposer.tsx`: added `showQuadrantPicker?: boolean` prop (default `true`, so view1's call site is unchanged). When `false`, the second `.emt-quick-composer__field` row containing `<QuadrantPicker>` is omitted, and `onSubmit` resolves the destination via `showQuadrantPicker ? quadrant : defaultQuadrant` — falling back to the live prop is necessary because `<QuickComposer>` itself stays mounted across the surface's open/close cycles (only `<ResponsiveSurface>`'s children unmount when `open=false`), so internal state could otherwise lock in a stale quadrant if the user navigates view2 → another quadrant → reopens the composer.

`packages/app/src/views/quadrant/QuadrantView.tsx`: imports `Fab` and `QuickComposer`, adds `useState`-backed open/close state with `openComposer` / `closeComposer` `useCallback`s, and renders a `<Fab>` + `<QuickComposer showQuadrantPicker={false} defaultQuadrant={quadrant}>` pair as siblings of the `<Glow>` frame. The FAB carries `aria-haspopup="dialog"`, `aria-expanded={composerOpen}`, and the same `app.matrix.fab.add` label as view1 (the FAB does the same thing in both views — a separate i18n key would be premature scope).

`packages/app/src/views/quadrant/quadrant.css`: new `.emt-quadrant__fab` rule — `position: absolute`, anchored to the existing `position: relative` `.emt-quadrant` container, `right` / `bottom` use `max(--space-lg, env(safe-area-inset-…))` so the home indicator never overlaps it on mobile, and `z-index: var(--layer-fab)` (the design-system token defined in `tokens.css:76`). This mirrors the rule in `.emt-matrix__fab` (which still uses `z-index: 1` directly — Phase 7's morph will keep the FAB in place across views, so converging on the token now avoids a follow-up cleanup later).

Tests added to `packages/app/test/quick-composer.test.tsx` (no new test file; the FAB integration belongs with the composer it opens):

- `'hides the quadrant picker when showQuadrantPicker is false (Step 6.5)'` — renders the composer with the new prop and asserts `.emt-quadrant-picker` is absent while `.emt-quick-composer__input` is still present.
- `'QuadrantView — Step 6.5 FAB integration > renders the FAB and opens a picker-less composer that creates in the focused quadrant'` — mounts `<QuadrantView quadrant="Q3" />` against the local IDB adapter, clicks `.emt-quadrant__fab`, asserts `aria-expanded` flips and `.emt-quadrant-picker` is not in the rendered DOM, types a title, submits, and asserts the task lands in Q3 (not in Q1 / Q2 / Q4). This is the end-to-end "new task appears in the focused quadrant immediately" check from `plan.md`'s **Done when**.

A short-lived `rerender`-based test exploring the prop-vs-state precedence in QuickComposer was tried first; its async submit polluted the next test's React root (the MatrixView FAB regression went red because the prior test's createTask resolved into a dead queryClient between tests). Removed in favor of letting the QuadrantView integration test cover the prop-driven destination implicitly. The `RenderHandle` helpers in `packages/app/test/render.ts` and `query-render.tsx` were also reverted to their pre-step shape since `rerender` is no longer used — kept the diff to the actually-needed surface.

326 vitest tests pass (was 324; +2: hides-picker + QuadrantView FAB integration). Typecheck clean, lint clean, format clean. Production build: 265.67 KB JS (was 265.31) / 10.16 KB CSS (was 9.99) — JS gain is the FAB + composer wiring + handlers in QuadrantView, CSS gain is the single `.emt-quadrant__fab` rule.

**Next:** Step 6.6 — empty state. When `<QuadrantView>`'s sorted task list is empty, render the muted-grey `<EmptyNote>` primitive from Step 3.8 centered in the frame body, leaving the neighbor strips and FAB present. View1 already shows nothing for empty cells (`MatrixCell` just renders an empty list); for view2, an explicit empty-state cue is more important since the user is fully focused on one quadrant. Practical wiring: branch on `tasks.length === 0` after the loading + error guards in `QuadrantView`'s task-list `<div>`; add a single `'app.quadrant.empty'` i18n string ("Nothing here yet" or similar — the EmptyNote already takes the message via prop). Test: render `QuadrantView` with no tasks for the focused quadrant, assert `EmptyNote` is in the DOM and the neighbor strips for that quadrant's two shared edges are still present. After 6.6, Phase 6 closes — Phase 7 then layers the actual zoom morph + Ctrl+wheel binding on top, with `useReducedMotion` gating the animation duration.

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
