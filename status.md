# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 1.1 — Canonical Task type. `packages/backend-core/src/task.ts` exports branded `TaskId` and `BackendId`, the `Quadrant` / `Priority` / `TaskStatus` literal unions, ISO date/time aliases, and the `Task` interface. Re-exported from package index. Type test in `test/task.test.ts` uses `expectTypeOf` to assert the `Task` shape, that branded ids are not assignable from bare strings, and that enum-like fields are constrained to their literal unions. 11 tests pass; lint/format/typecheck clean.

**Next:** Step 1.2 — `BackendAdapter` interface (operations: list, get, create, update, delete, changesSince) plus `Cursor`, `ChangeSet`, `BackendCapabilities`, `BackendDescriptor`.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

- **GitHub Pages**: enable GitHub Pages for this repository under Settings → Pages, source = "GitHub Actions". The committed `.github/workflows/deploy.yml` will fail until this is enabled. (`VITE_BASE_PATH` is set in the workflow from the repo name, so the URL will be `https://<user>.github.io/EisenhowerMatrixTodo/`.)
- `design-input.md` is now committed (the small guardrail edit from last planning session was bundled into the step 0.1 commit; not strictly clean diff hygiene but the change is intentional and small).

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. If still in planning mode (per "Phase" above), continue from "Next" above.
4. If in implementation mode, find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
