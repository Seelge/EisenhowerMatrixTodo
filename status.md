# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 2.5 — Sync engine pull & conflict detection.

`packages/backend-core/src/sync-engine.ts`: `DefaultSyncEngine.pull(backendId)` now reads the per-backend cursor, calls `adapter.changesSince(cursor)`, and reconciles the response against the outbox. Conflict trigger: a remote upsert whose `taskId` also has a queued local entry (looked up via `outbox.list(backendId)` keyed by `taskId`, last-wins on duplicates). When the local pending op is `'delete'`, remote is skipped (queued local delete will reach the backend on the next flush). Otherwise the engine reads `cache.get(backendId, taskId)`, computes `differingFields` via the new `computeDifferingFields` helper (shallow per-field diff over `DifferingField`; `tags` compared element-wise), and — when fields actually differ — invokes the registered `ConflictResolver`. `'remote'` writes remote to cache and drops the pending entry; `'local'` is a no-op (cache already has local; pending entry will push on next flush). Identical-but-pending remotes apply silently with no resolver call. Remote deletes apply unconditionally except when blocked by a pending local create/update (skipped); a coincident pending delete is dropped after applying. Finally the new `changes.cursor` is persisted via the cursor store. Throws on unknown `backendId`, missing `cache`/`cursors` options, or a conflict with no resolver registered.

New abstractions in `sync-engine.ts`:
- `LocalTaskCache` — opaque `(get | put | delete)` over `(backendId, taskId)`. The concrete IDB cache implementation lives outside this module and will be wired in when registry/cache integration lands.
- `CursorStore` — `(get | set)` per `backendId`. Canonical impl `IdbCursorStore` ships in this commit, opened via `createIdbCursorStore(db)`.
- `openSyncDb` bumped to `SYNC_DB_VERSION = 2`; v2 upgrade adds the `cursors` object store (`keyPath: 'backendId'`). v1→v2 migration is additive — existing outbox rows survive.
- `DefaultSyncEngineOptions` gained optional `cache` and `cursors` fields. Both are required at runtime for `pull`; flush-only constructions omit them.

`packages/backend-core/test/sync-engine.test.ts`: dropped the placeholder, added 7 pull tests against in-memory `LocalTaskCache` / `CursorStore` plus the existing `StubAdapter` (extended with a `nextChanges(cursor)` hook and a `seenCursors` log). Covers: clean pull verbatim, cursor round-tripping across two pulls, local-only-edits no-op, true conflict (one resolver call per task, mixed local/remote outcomes, correct `differingFields`, outbox dropped only for the remote-wins side), identical-payload silent apply, missing-resolver throw, coincident remote+local delete, and unknown-backend throw.

86 tests pass overall (was 79; +7 pull tests in backend-core); typecheck, lint, format clean.

**Next:** Step 2.6 — Backend registry. `packages/backend-core/src/registry.ts` with `BackendRegistry` (`register`, `unregister`, `get`, `list`, `getDefault`, `setDefault`); persist default-id to IDB `meta` store; tests for registration, default selection, and persistence across re-instantiation.

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
