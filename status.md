# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 2.7 — Task migration. **(closes Phase 2.)**

`packages/backend-core/src/migrate.ts` (new): `migrateTask(options, taskId, fromBackendId, toBackendId): Promise<Task>`. Reads the source task via `source.get(taskId)`, derives a `TaskDraft` (drops `id`/`backendId`/`createdAt`/`updatedAt`; conditionally spreads optional fields per `exactOptionalPropertyTypes`), creates on target, then deletes on source. Target-create failure propagates as-is, leaving the source untouched. Source-delete failure after a successful target-create raises a `StaleSourceEvent` (`sourceBackendId`, `sourceTaskId`, `targetBackendId`, `targetTaskId`, `error`) via the optional `onStaleSource` callback and still returns the new task — the migration is logically committed on the target, the source copy is left for a UI-driven cleanup. Up-front validation throws on same-backend, unregistered source/target, or task-not-found, before any backend write.

`MigrateOptions`: `getAdapter` (matches the sync engine's contract — typically `registry.get.bind(registry)`) and `onStaleSource?`. The migrator deliberately does not touch the local cache or outbox; callers integrate with the sync engine after the migration resolves so caching policy stays in one place.

`packages/backend-core/test/migrate.test.ts` (new): 8 tests against a hand-rolled `StubAdapter` with `failNextCreate` / `failNextDelete` toggles. Covers: happy-path round-trip with all canonical fields preserved (including `tags` cloned, optional `dueDate` carried through), target-create failure leaves source untouched and surfaces the error, source-delete failure raises the event with the correct ids and underlying error while still returning the new task, source-delete failure without a handler still returns the new task, plus four input-validation throws (same-backend, unknown source, unknown target, task not found).

105 tests pass overall (was 97; +8 migrate tests in backend-core); typecheck, lint, format clean. **Phase 2 exit:** canonical model + adapter interface + sync engine (queue/flush/pull/conflict) + registry + migration are all in place; in-memory and local-IndexedDB backends pass the contract suite. Future Google / Microsoft adapters are now drop-in.

**Next:** Phase 3 — Design system. Step 3.1 — Theme provider + CSS reset: a `<ThemeProvider>` injects the design tokens (typed in Step 1.6) as CSS variables, applies a CSS reset, and sets `color-scheme: dark`. Outputs: `ThemeProvider.tsx`, `reset.css`, integration test rendering a child that reads `--color-bg`. Done when the token-preview page renders in the dark palette.

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
