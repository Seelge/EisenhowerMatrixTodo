# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 2.1 — In-memory adapter.

`packages/backend-inmemory/src/adapter.ts`: `InMemoryAdapter implements BackendAdapter`, backed by a `Map<TaskId, Task>`. `crypto.randomUUID()` for ids. Per-instance monotonic seq clock drives `changesSince` (cursor = stringified seq); per-instance monotonic ms clock drives `updatedAt` (bumps forward on collision so back-to-back writes keep the timestamp strictly increasing). Deletes recorded as `{id, seq}` so `changesSince` reports tombstones. Capabilities: all true (lossless reference). `tags` arrays defensively copied on read of patches.

`packages/backend-inmemory/test/contract.test.ts`: invokes `runAdapterContract('in-memory', () => Promise.resolve(new InMemoryAdapter()))` from `@emt/backend-core`. Smoke test removed.

`@emt/backend-inmemory/package.json` got the same `main`/`types`/`exports`/`files` plumbing as backend-core, plus `@emt/backend-core: workspace:*`.

50 tests pass (20 contract tests added); typecheck, lint, format clean.

**Next:** Step 2.2 — Local IndexedDB adapter, basic CRUD (CRUD subset of contract suite passes; `changesSince` tests skipped until 2.3).

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
