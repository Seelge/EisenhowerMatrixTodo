# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 7.5 — Reduced-motion path. Closes Phase 7.

`ZoomController` now reads `useReducedMotion` (from `@emt/design-system`, Step 3.9) and picks the zoom morph transition accordingly via the pure `selectZoomTransition(reduced)` helper:

- Default: `ZOOM_TRANSITION = { duration: 0.22, ease: [0.2, 0, 0, 1] }` (M3-standard).
- Reduced motion: `INSTANT_TRANSITION = { duration: 0 }` — Framer Motion still routes the state change, but the visual cut is instantaneous.

Both constants live in `packages/app/src/views/zoom/zoom-transition.ts` so the choice is unit-testable without a DOM.

The chosen transition is applied to the scene `motion.div` *and* propagated to every descendant motion through `<MotionConfig transition={...}>`. That lets the shared-`layoutId` morphs on matrix cells, the focused quadrant frame, and task cards all snap as one piece — and let me drop the three duplicated `transition={{ duration: 0.22, ease: ... }}` props from `MatrixCell.tsx`, `TaskCard.tsx`, and `QuadrantView.tsx` (they now inherit from MotionConfig). The scene exposes `data-reduced-motion="true"|"false"` for test/debug introspection.

Tests:
- `packages/app/test/zoom-reduced-motion.test.tsx`: pure `selectZoomTransition(true|false)` returns the expected constants; integration stubs `window.matchMedia` (same shape as `packages/design-system/test/use-reduced-motion.test.tsx`) and renders `<Routes>` in both modes. Asserts (a) the scene's `data-reduced-motion` flag reflects the OS preference, and (b) the same Enter-on-Q2 → `/q/Q2` transition lands at the same view-state in both modes — proving "only the animation duration differs".

Verification completed:
- `pnpm --filter @emt/app exec tsc` passes.
- `pnpm lint` passes.
- `pnpm format:check` passes.
- `pnpm test` passes: 54 files / 375 tests.
- `pnpm --filter @emt/app build` passes. Production build: 398.48 KB JS / 11.26 KB CSS.
- `pnpm e2e` passes: 6 tests.
- CI + Deploy green on `ce18bdb`.

**Phase 7 exit:** view1 ↔ view2 navigation feels seamless across input types (touch pinch, mouse wheel + Ctrl, keyboard, reduced-motion respected).

**Next:** Step 8.1 — Surface container. view3 mounts inside `ResponsiveSurface` (Step 3.4): bottom sheet on mobile, right side panel on desktop, ≤ 480 px wide. The matrix below remains visible. Outputs `packages/app/src/views/task/TaskView.tsx` + a route handler reading `?task=:id`. Done when opening view3 over view1 keeps the matrix dim but visible, and over view2 the focused quadrant is partly visible.

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
