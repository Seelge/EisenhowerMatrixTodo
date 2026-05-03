# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 1.3 — Adapter contract test suite. `packages/backend-core/src/contract-tests.ts` exports `runAdapterContract(name, factory)` and `AdapterFactory` type. Coverage: descriptor stability, create + get + distinct ids + unknown id returns undefined, partial update preserves fields + advances updatedAt + throws on unknown id, delete + idempotent delete, list (all + by quadrant + per-quadrant table-driven), changesSince (initial state with cursor + only-after-cursor + deletions reported + cursor advances), concurrency (disjoint and overlapping parallel updates). Runtime guard test verifies throw on missing/non-function factory. 13 tests pass; all checks clean.
**Note.** Value re-export of `runAdapterContract` from package index uses `.js` extension (composite mode strips `.ts` in emit); type-only re-exports keep `.ts` since they erase. Vitest added as devDep of `@emt/backend-core` since contract-tests.ts imports describe/it/expect from it.

**Next:** Step 1.4 — Conflict resolution contract (`ConflictRecord`, `ConflictResolver` type) in `packages/backend-core/src/conflict.ts`.

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
