# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 3.5 — Snackbar with undo.

`packages/design-system/src/Snackbar.tsx` (new): visual primitive — `<div role="status" aria-live="polite" class="emt-snackbar">` with `.emt-snackbar__message` and an Undo CTA rendered as `<Button variant="text">` only when `onUndo` is provided. `undoLabel` defaults to `"Undo"`; can be overridden for i18n.

`packages/design-system/src/SnackbarProvider.tsx` (new): owns a queue-of-one. `show({ message, onCommit, onUndo, duration?, undoLabel? })` is the public API; `dismiss()` is also exposed for explicit-close paths that should fire neither callback. State machine:
  - **Timeout (default 5000 ms) without Undo** → `onCommit` fires, `onUndo` does not.
  - **Undo button click within window** → `onUndo` fires, `onCommit` is suppressed; the originally-scheduled timer is cleared.
  - **Superseding `show()`** → previous item's `onCommit` fires immediately (the user has implicitly forfeited their undo window by triggering the next action), and the new item replaces it.
  - **`dismiss()`** → fires neither callback; the snackbar just disappears.
  - **Provider unmount** → cleans up the pending timer; does *not* fire `onCommit` (the host is tearing down, not accepting the action).

The active item is React state (so render reflects it without reading a ref); a parallel `optsRef` keeps the latest opts available to the timeout callback so it never reads a stale closure. `useSnackbar()` returns `{ show, dismiss }` and throws a clear error if used outside `<SnackbarProvider>`.

`packages/design-system/src/components.css` + `components.ts`: extended with `.emt-snackbar` (fixed-bottom, centered, elevated surface, 4 px shadow, layer `var(--layer-snackbar)`), `.emt-snackbar__message`, the `emt-snackbar-in` keyframe (translate-up + fade), and the reduced-motion block now also zeroes out `.emt-snackbar` animation. Drift guard (`components.test.ts`) keeps the two byte-identical.

`packages/design-system/test/snackbar.test.tsx` (new, 11 cases). The two done-when cases are the heart of the suite:
  - **Undo within 5 s** — `vi.useFakeTimers()` advances 4 s, the Undo button is clicked, `onUndo` fires once, `onCommit` is *not* called even after advancing another 10 s.
  - **Timeout without undo** — advance 5 s, `onCommit` fires once, `onUndo` does not.
Plus: aria-live attributes; Undo only renders when `onUndo` is set; custom `undoLabel`; custom `duration`; superseding `show()` commits the previous; explicit `dismiss()` fires neither callback; `useSnackbar` outside provider throws; reduced-motion override is asserted at the `COMPONENT_CSS` string level. The Harness component captures the `useSnackbar()` API into a closure variable so tests can drive `show`/`dismiss` from outside React's render cycle, all wrapped in `act()`.

152 tests pass (was 141; +11). Typecheck, lint, format, secret scan clean.

**Next:** Phase 3 — Step 3.6 — Quadrant picker (2 × 2). Reusable picker honoring per-quadrant glow colors and the current selection. Outputs: `QuadrantPicker.tsx`. Done when component test covers selection change + keyboard navigation.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

None outstanding. (Pages live at `https://seelge.github.io/EisenhowerMatrixTodo/`. CI and Deploy workflows confirmed green; Node 24 opt-in env added so the deprecation warning is gone.)

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. If still in planning mode (per "Phase" above), continue from "Next" above.
4. If in implementation mode, find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
