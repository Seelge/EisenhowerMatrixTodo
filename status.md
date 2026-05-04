# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 2.4 — Sync engine outbound queue & flush.

`packages/backend-core/src/sync-engine.ts` (new): `DefaultSyncEngine implements SyncEngine`. `enqueueWrite(op, taskOrRef)` appends to an `OutboxStore`; the local cache write is the caller's responsibility per the `SyncEngine` JSDoc. `flush(backendId?)` walks queued entries in `seq` order; each entry attempts up to `maxAttempts` (default 5) with full-jitter exponential backoff (`min(maxBackoffMs, baseBackoffMs * 2^(attempt-1)) * random()`, capped at 60 s by default). On success the entry is deleted; on terminal failure it is left queued with `attempts`, `lastAttemptAt`, `lastError` updated for diagnostics. When `getAdapter(backendId)` returns `undefined` (offline / unconfigured), the entry is *deferred* — left queued without consuming a retry — so going offline does not burn the budget. `pull` is a placeholder that throws until Step 2.5.

`OutboxStore` is an interface so tests / future engines can swap backings; the canonical impl is `IdbOutboxStore`, opened via `openSyncDb()` (DB name defaults to `'emt-sync'`, version 1). The store uses `keyPath: 'seq'` + `autoIncrement` so IDB owns seq generation, plus a `byBackend` index to power `flush(backendId)`.

`enqueueWrite` is overloaded: `('create' | 'update', Task)` vs `('delete', TaskRef)`. The dispatcher in `applyEntry` extracts a `TaskDraft` from the cached `Task` payload (drops `id`/`backendId`/`createdAt`/`updatedAt` plus undefined optional fields, per `exactOptionalPropertyTypes`). `update` reuses the same draft as the patch — partial-patch coalescing is a Step 2.5+ concern.

`packages/backend-core/test/sync-engine.test.ts`: 9 tests against a hand-rolled `StubAdapter` (kept local to avoid a circular workspace dep on `@emt/backend-inmemory`) and `fake-indexeddb`. Covers happy path drain, idempotent second flush, alternating-flake convergence, terminal-failure bookkeeping, no-adapter deferral, offline→online recovery, backendId filter, and the pull placeholder. Engine is constructed with `sleep: () => Promise.resolve()` and `random: () => 0` for deterministic fast runs.

`packages/backend-core/package.json`: added `idb ^8.0.3` runtime dep, `fake-indexeddb ^6.2.5` dev dep.

79 tests pass overall (was 70; +9 sync engine tests, +0 elsewhere); typecheck, lint, format clean.

**Next:** Step 2.5 — Sync engine pull & conflict detection. Implements `pull(backendId)` reading `changesSince(cursor)`, applying remote changes to the local cache, raising `ConflictResolver` for tasks edited locally since the cursor; computes `ConflictRecord.differingFields` via shallow diff. Persists per-backend cursor via the `cursors` store (currently only declared in `cache-schema.ts`).

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
