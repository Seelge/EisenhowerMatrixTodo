# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 7.1 — Snap morph animation.

Added `framer-motion` to `packages/app/package.json` and `pnpm-lock.yaml`.

`packages/app/src/views/zoom/ZoomController.tsx` is the new Phase 7 shell. It wraps the active matrix/quadrant route in `LayoutGroup` + `AnimatePresence` and a single `motion.div` with `layout`, keyed by `matrix` or `quadrant-<Qn>`. The transition is 220 ms with M3 standard easing `[0.2, 0, 0, 1]`. `packages/app/src/views/zoom/zoom.css` adds the stable wrapper sizing and grid-area rules.

`packages/app/src/routes/Routes.tsx` now renders `MatrixView` / `QuadrantView` inside `ZoomController`. `ConnectBanner` and the task-focus placeholder stay outside the morph shell.

Shared-layout identity:
- `MatrixCell` wraps each Glow cell in a `motion.div` with `layoutId=emt-quadrant-<Qn>`.
- `QuadrantView` wraps its focused Glow frame with the matching quadrant `layoutId`.
- `TaskCard` renders as `motion.div` with `layoutId=emt-task-<backendId>-<taskId>`, preserving existing dnd-kit refs/listeners and the drag transform style.
- The motion wrappers use `data-zoom-quadrant`, not `data-quadrant`, so the existing tests and DOM contract still identify the Glow nodes as the quadrant elements.

Tests:
- Added `packages/app/test/zoom-controller.test.tsx` for shell state markers and stable layout-id helper output.
- Updated `packages/app/test/router.test.tsx` to assert the active zoom scene. Because Framer keeps outgoing scenes mounted during `AnimatePresence`, tests now search for the matching scene instead of assuming one scene exists after navigation.

Verification completed:
- `pnpm --filter @emt/app exec tsc` passes.
- `pnpm lint` passes.
- `pnpm format:check` passes after `pnpm format`.
- `pnpm test` passes: 50 files / 330 tests.
- `pnpm --filter @emt/app build` passes. Production build: 392.65 KB JS / 10.84 KB CSS. The JS increase is mostly Framer Motion.
- `pnpm e2e` passes: 4 tests.

**Next:** Step 7.2 — Touch pinch. Add two-pointer detection at the matrix/root zoom surface: pinch-in from view1 zooms into the quadrant under the pinch midpoint at gesture start; pinch-out from view2 returns to view1 and starts a 600 ms highlight on the previously-focused quadrant. Tests should synthesize pointer events for each matrix midpoint and confirm the highlight appears/decays on pinch-out.

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
