# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 5.8 — FAB + quick composer. **Phase 5 exit reached** — view1 is fully functional (view, sort, create, move, focus).

`packages/app/src/views/matrix/QuickComposer.tsx` (new): quick-add form rendered inside the design system's `<ResponsiveSurface>` (Sheet on mobile, SidePanel on desktop — Step 3.4). Holds local `title` (controlled input) and `quadrant` (defaults to `Q1`, configurable via `defaultQuadrant` prop). On submit it resolves the registry default backend, builds a `TaskDraft`, calls a private `applyOptimisticCreate(queryClient, draft, backendId)` to insert a placeholder into every cached `['tasks', 'list', ...]` bucket the new task belongs to, calls `close()` (so the surface unmounts immediately and the form feels snappy), resets local state for the next open, and fires `useCreateTask.mutate` with the rollback closure as `onError`. After the adapter write resolves, the existing `useCreateTask.onSuccess` invalidation refetches and replaces the placeholder with the real `Task`.

The placeholder id is `optimistic-${crypto.randomUUID()}` — a sentinel prefix the test suite uses to distinguish optimistic state from the post-refetch real id. Cache layout matches `dnd.ts:applyOptimisticMove`: 'all' / unfiltered buckets always get the placeholder; per-quadrant buckets get it only when the placeholder targets that quadrant; non-list buckets (e.g., `['tasks', 'one', id]`) are left alone.

Validation: submit `disabled` while the trimmed title is empty (covers whitespace-only). Esc and (mobile) scrim click cancel via the inherited `useDialogBehavior` hook. The desktop SidePanel intentionally has no scrim — that mirrors the "panel does not fully obscure the matrix" rule from `design-input.md`. The trade-off vs the plan's "popover on desktop" wording is intentional: SidePanel is the established Step-3.4 primitive for the desktop branch and adding a parallel popover would have meant a fresh design-system component for one consumer.

A11y: title input is auto-focused on open (overrides `useDialogBehavior`'s "first focusable" choice — the only thing the user is here to do), label is wired via `useId`, the QuadrantPicker is the existing 2 × 2 radio-group from the design system (case-mapped: `Q1↔q1` etc., since backend-core is upper-case and the design system is lower-case). FAB carries `aria-haspopup="dialog"` + `aria-expanded` so screen readers announce its state.

`packages/app/src/views/matrix/MatrixView.tsx`: hosts a `useState`-backed open/close pair plus a bottom-right `<Fab aria-label="Add task">` that opens `<QuickComposer>`. The matrix container is `position: relative`, so the FAB is positioned absolutely inside it — bottom-right with `env(safe-area-inset-*)` so it sits above iOS/Android home indicators.

`packages/app/src/i18n/strings.en.ts`: 7 new keys — `app.matrix.fab.add` ("Add task"), `app.composer.label` ("Add task"), `app.composer.titleLabel` ("Title"), `app.composer.titlePlaceholder` ("What needs doing?"), `app.composer.quadrantLabel` ("Quadrant"), `app.composer.cancel` ("Cancel"), `app.composer.submit` ("Add").

`packages/app/src/views/matrix/quick-composer.css` (new): form layout (vertical stack with consistent `--space-md` gaps), 48 px-min title input with focus ring, action footer right-aligned, plus the `.emt-matrix__fab` absolute positioning rule. The FAB lives at `bottom: max(--space-lg, env(safe-area-inset-bottom))` on the right.

`packages/app/test/setup.ts`: sets `globalThis.IS_REACT_ACT_ENVIRONMENT = true` so test files can call React's `act` directly without the "act-unsupported" warning.

Tests: `test/quick-composer.test.tsx` (6 cases) — submit disabled for empty/whitespace title, Escape cancels via `useDialogBehavior`, submit creates a task in the chosen quadrant via the registered backend, optimistic insert is visible in the live cell DOM while `adapter.create` is blocked (gating: a real `<MatrixCell>` is mounted alongside so its `useTasks` subscription keeps the cache entry alive past `gcTime`), nothing renders when `open` is false, FAB integration via `<MatrixView>` opens the composer on click and reflects state via `aria-expanded`.

298 vitest tests pass (was 292; +6). Typecheck clean, lint clean, format clean. Production build: 262.33 KB JS / 7.55 KB CSS (was 255.93 / 6.22) — JS gain is the composer, picker case-map, and FAB wiring; CSS gain is the composer form + FAB positioning.

**Next:** Phase 6 — view2 (Quadrant). Step 6.1 first: `QuadrantView.tsx` + `NeighborEdge.tsx` rendering the focused quadrant fullscreen with its glow border and ~24 px neighbor strips along each edge using the neighbors' colors at reduced opacity. Visual test asserts the strips are present on the correct edges per focused quadrant. Step 6.2 turns each `NeighborEdge` into a `useDroppable` so dragging onto an edge moves the task to that quadrant — same dnd-kit context as Step 5.5. Step 6.3 adds touch swipe (when not on a draggable card) to switch focused quadrant. The route + zoom level for view2 are already wired by Step 4.2 (router) and Step 4.1 (root shell), so the focus is purely view2's own component graph.

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
