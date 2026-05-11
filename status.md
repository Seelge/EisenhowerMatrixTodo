# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 7.4 — Keyboard.

Global keyboard bindings now sit next to the wheel handler inside `ZoomController`, so every input modality that drives the view1 ↔ view2 morph is co-located:

- `Esc` → if view3 is open (`focusedTaskId !== undefined`), close it; else if `state.zoom === 'quadrant'`, zoom out to matrix; else no-op.
- `Enter` on a focused matrix cell → navigate to `/q/<that quadrant>`.
- Arrow keys on a focused matrix cell → move focus to the visually-adjacent cell (no wrap, standard WAI-ARIA grid pattern).
- `+` / `=` → zoom into the focused cell (or `Q1` by default if focus is elsewhere).
- `-` / `_` → zoom out of view2.

Pure helpers live in `packages/app/src/views/zoom/keyboard.ts`: `resolveArrowQuadrant(from, key)` codifies the 2 × 2 mapping (Q2↔Q1 / Q2↔Q4 / Q1↔Q3 / Q4↔Q3), and `isTextEditingTarget`, `isArrowKey`, `isZoomInKey`, `isZoomOutKey` keep the React handler small. The handler:
- Skips when `event.defaultPrevented`, when any of `ctrl/meta/alt` is pressed (Ctrl+wheel and OS shortcuts get a clear lane), or when the target is text-editing (input / textarea / `select` / `contenteditable`).
- Locates the focused cell via `target.closest('.emt-matrix__cell[data-quadrant]')` so unrelated `data-quadrant` carriers (TaskCardMenu items, QuadrantView frame) don't masquerade as cells.
- Reuses `toMatrixState(state)` for every zoom-out path (Esc, `-`, wheel-down) so the `focusedTaskId` / `openedFromZoom` preservation is written once.

`MatrixCell.tsx` adds `tabIndex={0}` to the Glow so cells are keyboard-focusable. `matrix.css` adds a `focus-visible` 3 px inset outline matched to the drop-indicator pattern so the ring doesn't shift layout (and dnd-kit's measured rects stay stable).

Tests:
- `packages/app/test/zoom-keyboard.test.tsx`: pure mapping for every cell × every direction, both shifted/unshifted zoom keys, text-target guard. Integration over `<Routes>`: cells expose `tabIndex={0}`; Enter on Q2 → `/q/Q2`; Esc from `/q/Q2` → `/`; Esc on `/` is a no-op; arrow keys walk Q2→Q1→Q3 and `Right` on Q3 is a no-op; `+` zooms into focused cell, defaults to `Q1` when focus is elsewhere; `-` zooms out; typing keys inside an `<input>` does nothing; `Ctrl+Enter` is ignored.
- `packages/app/e2e/keyboard.spec.ts`: keyboard-only Playwright covers Q2 → Enter → `/q/Q2` → Esc → `/` and the arrow-key focus walk to Q3 followed by Enter → `/q/Q3`.

Verification completed:
- `pnpm --filter @emt/app exec tsc` passes.
- `pnpm lint` passes.
- `pnpm format:check` passes.
- `pnpm test` passes: 53 files / 370 tests.
- `pnpm --filter @emt/app build` passes. Production build: 397.79 KB JS / 11.26 KB CSS.
- `pnpm e2e` passes: 6 tests.
- CI + Deploy green on `54b308d`.

**Next:** Step 7.5 — Reduced-motion path. `ZoomController` reads `useReducedMotion` (Step 3.9) and skips the Framer Motion transition (instant cuts, no morph). Done when a test covers both modes for the same state transitions; only the animation duration differs.

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
