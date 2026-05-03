# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 0.1 — pnpm workspace bootstrap. Root + 7 packages (`@emt/app`, `@emt/backend-core`, `@emt/backend-local-indexeddb`, `@emt/backend-inmemory`, `@emt/backend-google`, `@emt/backend-microsoft`, `@emt/design-system`). `pnpm install` and `pnpm -r ls --depth=-1` both green.

**Next:** Step 0.2 — TypeScript baseline (strict shared `tsconfig.base.json` + per-package `tsconfig.json` with project references; root `typecheck` script).

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

- **GitHub Pages** must be enabled on the repository before Step 0.7's `deploy.yml` will succeed (deferred until Step 0.7).
- `design-input.md` had uncommitted edits as of the last planning session — confirm they have been committed.

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. If still in planning mode (per "Phase" above), continue from "Next" above.
4. If in implementation mode, find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
