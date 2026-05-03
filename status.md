# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 0.3 — ESLint + Prettier. Flat config in `eslint.config.js` with typescript-eslint, eslint-plugin-import-x (used in place of the older `eslint-plugin-import` because flat-config support is more reliable), React + react-hooks + jsx-a11y scoped to `packages/app` and `packages/design-system`, eslint-config-prettier last. Prettier configured (singleQuote, trailingComma all, printWidth 100). `*.md` is in `.prettierignore` so authored docs (`design-input.md`, `plan.md`, `status.md`, `README.md`) are not reformatted. Root scripts `lint`, `format`, `format:check`. `pnpm lint --max-warnings 0` and `pnpm format:check` both clean.

**Next:** Step 0.4 — Vitest setup (workspace-level config, smoke test per package, root `test` script).

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
