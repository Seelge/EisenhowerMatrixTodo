# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 2.6 — Backend registry.

`packages/backend-core/src/registry.ts` (new): `BackendRegistry` class. `register(adapter)` / `unregister(id)` mutate an in-memory `Map<BackendId, BackendAdapter>`; `get(id)`, `list()` are sync reads. `getDefault()` returns the persisted default if it is currently registered, else the first registered adapter, else `undefined` — so the app gets a sensible default before the user has explicitly picked one. `setDefault(id)` validates the id is registered (throws otherwise) and writes to the injected `MetaStore` under `META_DEFAULT_BACKEND_KEY = 'defaultBackendId'`. `load()` rehydrates the persisted id from the meta store; safe to call multiple times. Adapter instances are not persisted (the app re-registers them on startup); only the default-id survives reloads.

`MetaStore` interface (in `registry.ts`): generic `get`/`set`/`delete` over string keys/values — kept loose so future single-row settings can share the store.

`packages/backend-core/src/sync-engine.ts`: `openSyncDb` bumped to `SYNC_DB_VERSION = 3`; v3 upgrade adds the `meta` object store (`keyPath: 'key'`). New `IdbMetaStore` (factory `createIdbMetaStore(db)`) implements `MetaStore` against the same sync DB. v2→v3 migration is additive — existing outbox/cursors rows survive.

`packages/backend-core/src/cache-schema.ts`: added `MetaRecord` interface, `STORE_NAMES.meta = 'meta'`, and the `META_DEFAULT_BACKEND_KEY` constant.

`packages/backend-core/test/registry.test.ts` (new): 11 tests against an `InMemoryMeta` and a minimal `StubAdapter`. Covers: register/list/get, replace-on-re-register, unregister, no-default fallback to first-registered, `setDefault` writes to meta, `setDefault` throws for unknown id, fallback when persisted id is no longer registered, persistence across two registry instances sharing the same in-memory meta store, persistence across an IDB-backed meta store re-open, and IDB meta store set/get/delete round-trip.

97 tests pass overall (was 86; +11 registry tests in backend-core); typecheck, lint, format clean.

**Next:** Step 2.7 — Task migration. `packages/backend-core/src/migrate.ts` with `migrateTask(taskId, fromBackendId, toBackendId): Promise<Task>` — create on target, delete on source, with rollback on target-create failure (source untouched + error surfaced) and graceful degradation on source-delete failure (log, return new task, raise a "stale source copy" event for later cleanup). Tests for both failure paths.

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
