# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 1.7 — Route + view-state contract. **Phase 1 complete.**

`packages/app/src/routes/contract.ts`: `Zoom` (`'matrix' | 'quadrant'`), `ViewState` (zoom, focusedQuadrant?, focusedTaskId?, openedFromZoom?), `defaultViewState`, `parseUrl(url)` and `serializeUrl(state)`. Routes handled: `/`, `/q/:Q1..Q4`, with `?task=` and `?from=` overlay params. `/options/*` and unknown paths degrade to the default matrix state — view4 has its own router.

Plumbing for cross-package imports landed in this step too:
- `@emt/backend-core/package.json` gained `main`/`types`/`exports` pointing to `dist/`, plus a `files: ["dist"]` whitelist.
- `@emt/app` now declares `@emt/backend-core: workspace:*` as a dependency.

`packages/app/test/routes-contract.test.ts`: round-trips 20 randomized states; asserts each route shape; degrades-gracefully cases (unknown quadrant, `/options/*`, malformed); serializer omits `from` when no task is set.

30 tests pass; all checks clean.

**Phase 1 done.** All inter-slice contracts are in place: canonical Task, BackendAdapter, contract test suite, conflict resolver, sync engine + cache schema, design tokens, route + view-state. Phases 2 / 3 / parts of 4 can now proceed in parallel.

**Next:** Phase 2, Step 2.1 — In-memory adapter (reference implementation; runs the contract test suite).

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
