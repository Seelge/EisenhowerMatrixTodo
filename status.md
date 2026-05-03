# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 0.6 — CI workflow. `.github/workflows/ci.yml` triggers on push to `main` and PRs to `main`; runs install (`--frozen-lockfile`), lint (max-warnings 0), format:check, typecheck, test. Concurrency group cancels superseded runs on the same ref. Uses `pnpm/action-setup@v4` (pinned to 10.33.2) and `actions/setup-node@v4` reading `node-version-file: .node-version`. YAML syntax validated locally with python yaml.

**Next:** Step 0.7 — Vite PWA shell + GitHub Pages deploy workflow.

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
