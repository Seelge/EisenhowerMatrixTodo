# Eisenhower Matrix Todo

A PWA to-do app organized by the Eisenhower matrix (Important × Urgent). Pluggable backends, offline-first. Targets Chrome on Android and Windows. Minimal futuristic dark UI with glowing borders.

## Status

Early development. See [`plan.md`](./plan.md) for the phase / step roadmap and [`status.md`](./status.md) for live cross-session state.

The first release ships only the local (IndexedDB) backend. Google Tasks and Microsoft To-Do adapters slot in later behind the same `BackendAdapter` interface.

## Stack

- **PWA**: Vite 8 + `vite-plugin-pwa` (workbox)
- **UI**: React 18 + TypeScript (strict, with `noUncheckedIndexedAccess` and `verbatimModuleSyntax`)
- **State**: Zustand + TanStack Query (planned)
- **Drag & drop**: dnd-kit (planned)
- **Animation**: Framer Motion (planned)
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

- [`design-input.md`](./design-input.md) — design input that fed the implementation plan
- [`plan.md`](./plan.md) — phased step-by-step implementation plan
- [`status.md`](./status.md) — live cross-session handoff
