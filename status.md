# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 0.7 — Vite PWA shell + GitHub Pages deploy. Vite 8 + @vitejs/plugin-react + vite-plugin-pwa@1.2 in `@emt/app`. React 18.3 (with @types/react/react-dom). `vite.config.ts` reads `VITE_BASE_PATH` for production base; default `/EisenhowerMatrixTodo/`. `index.html`, `src/main.tsx` (StrictMode + createRoot), `src/App.tsx` (placeholder "Loading…"). `public/icons/{192,512,maskable-512}.png` are solid-color placeholders generated via Python stdlib. Build produces `dist/manifest.webmanifest` and `dist/sw.js`. App scripts: `dev`, `build`, `preview`. App tsconfig switched to `composite: false`, `noEmit: true`, `allowImportingTsExtensions: true`, with `vite/client`, `vite-plugin-pwa/client`, `node` types — Vite handles bundling, root `tsc -b` skips app, root `typecheck` script appends `pnpm --filter @emt/app exec tsc`. `.github/workflows/deploy.yml` builds + uploads + deploys to GitHub Pages on push to main. All checks green (lint, format:check, typecheck, unit test, e2e, build).

**Next:** Phase 1, Step 1.1 — Canonical Task type in `@emt/backend-core`.

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
