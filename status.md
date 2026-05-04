# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 2.3 — Local IndexedDB adapter (change tracking).

`packages/backend-local-indexeddb/src/db.ts`: bumped `DB_VERSION` to 2. Schema now has three stores — `tasks`, `deletions`, `meta`. The `tasks` store gains a `bySeq` index plus an internal `seq` field on every record (`LocalTaskRecord = Task & { seq }`); the adapter strips `seq` before returning `Task` records. `deletions` is keyed by `TaskId` with a `bySeq` index. `meta` is a tiny key/value store currently holding only `nextSeq`. The v1→v2 upgrade walks any pre-existing tasks and assigns dense seq values starting at 1, then seeds `nextSeq`.

`packages/backend-local-indexeddb/src/adapter.ts`: every mutation reserves a fresh seq atomically inside its `readwrite` transaction (helper `allocateSeq(metaStore)` reads `nextSeq`, writes `nextSeq+1`, returns the reserved value). `create`/`update` stamp it on the record; `delete` writes a `{id, seq}` tombstone and removes the row. Idempotent delete short-circuits without writing a tombstone. `changesSince(cursor)` parses the cursor as an integer watermark, runs a `bySeq` lower-bound range query on each of `tasks` and `deletions`, sorts both by seq, strips seq from upserts, returns `String(nextSeq - 1)` as the new cursor (so an empty DB yields `'0'`).

`packages/backend-local-indexeddb/test/contract.test.ts`: dropped the `skip: ['changesSince']` option — the local adapter now runs the full contract suite. 21 contract tests green for `local-indexeddb` (matching the in-memory adapter).

70 tests pass overall (no skips remain); typecheck, lint, format clean.

**Next:** Step 2.4 — Sync engine outbound queue & flush. Implements `enqueueWrite` and `flush` for `DefaultSyncEngine` in `@emt/backend-core`, with exponential backoff + jitter, max 5 retries / 60 s delay, outbox persisted in IDB per the cache schema.

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
