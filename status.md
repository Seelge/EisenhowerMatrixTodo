# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 1.2 — `BackendAdapter` interface. `packages/backend-core/src/adapter.ts` exports `Cursor`, `ChangeSet`, `BackendCapabilities`, `BackendDescriptor`, `TaskDraft`, `TaskPatch`, `BackendAdapter`. Method-level JSDoc covers concurrency (last-write-wins per field on `update`), idempotency (`delete` is idempotent; `update` advances `updatedAt` even when stable), and error semantics. Re-exported from package index. Lint, format:check, typecheck, test all clean (11 tests).

**Next:** Step 1.3 — Adapter contract test suite (`packages/backend-core/src/contract-tests.ts` exporting `runAdapterContract(name, factory)`).

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
