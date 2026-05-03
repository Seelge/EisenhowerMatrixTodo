# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 0.5 — Playwright skeleton. `@playwright/test@1.59.1` installed in `@emt/app`, `playwright.config.ts` (Chromium-only, baseURL `http://localhost:4173`), `e2e/smoke.spec.ts` with a server-less assertion. Root scripts `e2e` and `e2e:install`. Two deviations from plan documented inline as Notes on the step: (a) replaced the `.gitkeep` with a real smoke test because Playwright has no pass-with-no-tests mode; (b) `e2e:install` carries `PLAYWRIGHT_HOST_PLATFORM_OVERRIDE=ubuntu24.04-x64` because Playwright doesn't prebuild for ubuntu26.04 (this WSL env). All checks (lint, format:check, typecheck, test, e2e) green.

**Next:** Step 0.6 — CI workflow (`.github/workflows/ci.yml` running install + lint + typecheck + test).

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
