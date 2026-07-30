# Eisenhower Matrix Todo

A PWA to-do app organized by the Eisenhower matrix (Important × Urgent).
Pluggable backends, offline-first. Targets Chrome on Android and Windows.
Minimal futuristic UI with neon quadrant borders (dark default, optional light).

## Status

**Usable offline with the Local (IndexedDB) backend** — matrix, quadrant
zoom, task editor, search, tags, export/import, light theme, and PWA
install are implemented. Live demo:
[seelge.github.io/EisenhowerMatrixTodo](https://seelge.github.io/EisenhowerMatrixTodo/).

Not yet in this release:

- Google Tasks / Microsoft To-Do adapters (packages are stubs)
- Recurrence model (design open — see `design-input-new.md` TODO 11)
- App-store packaging / signed release cut (Step 11.6)

Track handoff in [`status.md`](./status.md) and the phase plan in
[`plan.md`](./plan.md).

## Stack

- **PWA**: Vite 8 + `vite-plugin-pwa` (workbox)
- **UI**: React 18 + TypeScript (strict, with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`)
- **State**: Zustand + TanStack Query
- **Drag & drop**: dnd-kit
- **Animation**: Framer Motion
- **Tests**: Vitest (unit), Playwright (e2e)
- **Monorepo**: pnpm workspaces with TypeScript project references
- **CI**: GitHub Actions
- **Hosting**: GitHub Pages

## Repo layout

| Package | Role |
|---|---|
| `packages/app` | Vite app: views, routing, app shell |
| `packages/backend-core` | Adapter interface, canonical task model, sync engine |
| `packages/backend-local-indexeddb` | First-release backend, browser-persistent |
| `packages/backend-inmemory` | Test fixture; not shipped in the UI |
| `packages/backend-google` | Google Tasks adapter (later release) |
| `packages/backend-microsoft` | Microsoft To-Do adapter (later release) |
| `packages/design-system` | Tokens and primitive components |

## Development

Requires Node 24 (pinned in `.node-version`) and pnpm 10 (pinned in `packageManager`).

```sh
pnpm install
pnpm typecheck
pnpm test
pnpm lint
pnpm format:check

pnpm e2e:install   # one-time — downloads Chromium for Playwright
pnpm e2e

pnpm --filter @emt/app dev      # dev server (http://localhost:5173)
pnpm --filter @emt/app build    # production build
pnpm --filter @emt/app preview  # serve the production build (http://localhost:4173)
```

## Documents

- [`design-input-new.md`](./design-input-new.md) — design + open TODOs
- [`plan.md`](./plan.md) — phased implementation plan
- [`status.md`](./status.md) — live cross-session handoff
- [`docs/a11y-audit.md`](./docs/a11y-audit.md) — accessibility notes
