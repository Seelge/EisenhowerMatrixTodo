# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 1.4 — Conflict resolution contract. `packages/backend-core/src/conflict.ts` exports `DifferingField` (= `keyof Task` minus immutable identity/timestamp fields), `ConflictRecord` (`local`, `remote`, `differingFields`), and `ConflictResolver` (async callback returning `'local' | 'remote'`). Re-exported as types from package index. Doc covers the whole-record-not-field-merge resolution model, async-for-prompting rationale, and headless-test usage. All checks clean (13 tests).

**Next:** Step 1.5 — Sync engine contract (`SyncEngine`) and IndexedDB cache schema (`tasks`, `outbox`, `cursors` stores) in `packages/backend-core/src/sync.ts` and `cache-schema.ts`.

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
