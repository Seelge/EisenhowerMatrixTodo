# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 5.6 — Keyboard alternative ("Move to" menu).

`packages/app/src/views/matrix/TaskCardMenu.tsx` (new): kebab-button trigger + popover menu wired to `useUpdateTask`. The trigger carries `aria-haspopup="menu"` + `aria-expanded`; while open the popover is a `<div role="menu">` with `<button role="menuitem">` children, one per quadrant *other than* the task's current one. Activating an item dispatches `useUpdateTask({ patch: { quadrant: target } })` — the same call drag uses, but without the optimistic shimmer (this code path is rare enough that the cache invalidation in `useUpdateTask`'s `onSuccess` is fast enough on its own).

Keyboard handling matches the WAI-ARIA menu-button pattern: ArrowDown / Enter / Space on the trigger open the menu and land focus on the first item; ArrowDown / ArrowUp wrap navigation between items; Home / End jump to the ends; Escape and Tab close the menu and restore focus to the trigger. Focus restore uses `queueMicrotask` so the menu has unmounted before we move focus (otherwise the browser scrolls the menu into view first and then jumps). A document-level `pointerdown` listener closes the menu on outside click.

`packages/app/src/views/matrix/TaskCard.tsx` was restructured to host the menu without nesting `<button>`s: the wrapper is now a `<div className="emt-task-card">` (still the dnd-kit ref + listeners target so the whole card is draggable), with two child buttons inside — `.emt-task-card__open` (the semantic click target that opens view3) and `.emt-task-card__menu-button` (the kebab from `TaskCardMenu`). The kebab calls `event.stopPropagation()` on `pointerdown` so dnd-kit's `PointerSensor` on the wrapper doesn't read the click as the start of a drag.

`packages/app/src/views/matrix/task-card.css`: wrapper becomes a flex row, the open-button keeps the original priority/title/meta grid layout, the kebab gets a 32px column with hover + `aria-expanded='true'` highlight; the menu popover is `position: absolute; top: 100%; right: 0` anchored to the (relatively positioned) wrapper. Menu items get the standard `:focus-visible` ring suppressed in favour of a background swap so the active item reads the same as keyboard hover.

i18n: 5 new string keys in `packages/app/src/i18n/strings.en.ts` — `app.task.menu.label` ("Task actions") and `app.task.menu.moveTo.{q1..q4}` ("Move to Do/Schedule/Delegate/Delete"). Per-quadrant strings rather than a single template because the i18n `t()` helper doesn't (yet) support format args; per-key strings stay tractable until a real templating story lands.

Tests: `test/task-card-menu.test.tsx` (7 cases) — kebab attributes, click-to-open lists every quadrant except the current one in canonical order, ArrowDown/Enter/Space open the menu and focus the first item, arrow-key wrap + Home/End + Esc-and-focus-restore, item activation patches the task through the registered adapter, outside `pointerdown` closes the menu, and the kebab's `stopPropagation` keeps dnd-kit listeners on the wrapper from firing. `test/task-card.test.tsx` and `test/matrix-dnd.test.tsx` updated for the new wrapper-is-a-div anatomy: clicks now target `.emt-task-card__open` rather than the wrapper, and the dnd-kit `aria-roledescription` / tabindex assertions live on the wrapper element.

278 vitest tests pass (was 271; +7). Typecheck clean, lint clean, format clean. Production build: 253.85 KB JS / 5.67 KB CSS (was 251.49 / 4.29) — JS gain is the new component, CSS gain is the menu styling.

**Next:** Step 5.7 — Sort: manual with due-date secondary + reset. New `taskOrder` IDB store keyed by `(backendId, taskId)` storing a numeric `rank` (UI-only, not synced; kept off the canonical `Task` model). `packages/app/src/views/matrix/sort.ts` with the manual-with-due-date-fallback ordering + unit tests. Drag from 5.5 extends to write ranks; per-cell "Reset to secondary order" action clears manual ranks for the current quadrant. `@dnd-kit/sortable` may finally land here for in-cell reorder; consider whether a sibling cell drop should also assign a rank or leave that to manual reorder afterwards.

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
