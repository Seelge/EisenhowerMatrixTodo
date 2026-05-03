# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 0.4 — Vitest setup. Vitest 4 with workspace projects: root `vitest.config.ts` discovers `packages/*/vitest.config.ts`. Each of the 7 packages has its own minimal vitest config (named project) and a `test/smoke.test.ts`. Scripts `test` (= `vitest run`), `test:unit` (alias), `test:watch`. All 7 smoke tests pass; lint, format:check, typecheck still clean.

**Next:** Step 0.5 — Playwright skeleton in `packages/app` (config, empty `e2e/` dir, root `e2e` and `e2e:install` scripts).

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
