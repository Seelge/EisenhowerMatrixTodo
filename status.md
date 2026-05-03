# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 1.5 — Sync engine contract & cache schema.

`packages/backend-core/src/cache-schema.ts` (types only, no IDB code yet): `TaskRecord` (Task + composite `key`), `OutboxRecord` ({seq, op, backendId, taskId, payload, attempts, lastAttemptAt, lastError}), `CursorRecord` ({backendId, cursor, updatedAt}), `STORE_NAMES` const, `taskKey()` helper. ASCII data-flow diagram embedded as the file header doc. Planned indexes documented inline.

`packages/backend-core/src/sync.ts`: `SyncEngine` interface with `enqueueWrite` (overloaded — Task for create/update, TaskRef for delete), `flush(backendId?)` returning `FlushResult`, `pull(backendId)` returning `PullResult` with new cursor, `setConflictResolver`. JSDoc covers retention semantics (failures stay queued), conflict policy (one resolver invocation per conflicting task; throw if no resolver registered when needed).

All checks clean (13 tests).

**Next:** Step 1.6 — Design tokens (typed token objects + CSS custom properties + preview HTML) in `packages/design-system`.

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
