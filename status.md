# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 2.2 — Local IndexedDB adapter (basic CRUD).

`packages/backend-local-indexeddb/src/db.ts`: schema declaration + `openLocalDb(name)` opening DB v1 with a single `tasks` store keyed by `Task.id`, indexed on `quadrant`, `status`, `updatedAt`. Step 2.3 will introduce DB v2 with change-tracking fields.

`packages/backend-local-indexeddb/src/adapter.ts`: `LocalIndexedDbAdapter implements BackendAdapter`. Constructor takes a pre-opened `LocalDb` + `BackendDescriptor`; the async factory `createLocalIndexedDbAdapter(options?)` opens the DB and wires the descriptor (`id` defaults to `'local'`, `databaseName` defaults to `id`, capabilities all `true`). CRUD goes through `idb`'s promise wrapper. `update` uses one explicit `readwrite` transaction per call so concurrent updates serialize correctly. `crypto.randomUUID()` for ids; per-instance monotonic ms clock for `updatedAt`. `changesSince` throws `not yet implemented (step 2.3)`. Adds `close()` for callers that need it.

`packages/backend-local-indexeddb/test/contract.test.ts`: imports `fake-indexeddb/auto`, calls `runAdapterContract('local-indexeddb', factory, { skip: ['changesSince'] })`. Each factory invocation opens a fresh DB by minting a unique name (`local-test-${Date.now()}-${counter++}`), so `beforeEach` always gets empty state without an explicit drop API. Smoke test removed.

`packages/backend-core/src/contract-tests.ts`: extended with `AdapterContractOptions = { skip?: ContractSection[] }` (`ContractSection = 'changesSince'`). The `changesSince` `describe` block becomes `describe.skip` when listed. Re-exported from `@emt/backend-core`.

`@emt/backend-local-indexeddb/package.json`: same `main`/`types`/`exports`/`files` plumbing as the other adapters; deps `@emt/backend-core: workspace:*` and `idb ^8.0.3`; devDeps `fake-indexeddb ^6.2.5` and `vitest`. Source uses the project's `'./adapter.js'` (value) / `'./adapter.ts'` (type-only) import convention.

70 tests pass (4 skipped — the `changesSince` block, until 2.3); typecheck, lint, format clean.

**Next:** Step 2.3 — Local IndexedDB adapter, change tracking (DB v2 migration: per-record `seq`, `nextSeq` meta, `deletions` store; implement `changesSince`; re-enable the previously-skipped contract section).

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
