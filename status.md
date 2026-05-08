# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 5.4 — Independent vertical scroll per cell.

`packages/app/src/views/matrix/matrix.css`: `.emt-matrix__cell-list` becomes `overflow-y: auto`, gaining its own scroll viewport. The flex chain that makes it work was already in place (the `Glow` cell is `flex: column`, and the list is `flex: 1; min-height: 0`); the new `overflow-y: auto` is the missing rule. A small `padding-right: var(--space-xs)` keeps the scroll gutter from crowding the cards. The matrix container itself gets `overflow: hidden` so it never grows past the viewport — that's the explicit "matrix container does not scroll" half of the plan's "Done when".

Scrollbar styling is dual-track for cross-engine consistency: Firefox / standards-track via `scrollbar-width: thin` + `scrollbar-color: var(--color-surface-elevated) transparent`; WebKit / Blink via `::-webkit-scrollbar*` pseudo-element rules with the same elevated-surface thumb color and a `:hover` lift to `--color-text-secondary`. Both ends use theme tokens — Step 9.4's per-quadrant color overrides will skin the scrollbar without code edits.

Test: `test/matrix-scroll.test.tsx` (2 cases). The novel bit is that happy-dom doesn't run a layout engine but *does* compute styles for rules attached via a real `<style>` element, so the test reads `matrix.css` from disk via `node:fs` and injects it before rendering. With that wiring `getComputedStyle` correctly returns `overflow: hidden` on `.emt-matrix` and `overflow-y: auto` on `.emt-matrix__cell-list`. happy-dom does not expose scrollbar-* properties or pseudo-element styles through computed style, so the second case asserts those rules at the source by regex on the loaded CSS string. Establishes the pattern (`readFileSync` + `<style>` injection) for future view-level CSS verification without spinning up Playwright.

261 vitest tests pass (was 259; +2). Typecheck clean, lint clean, format clean. Production build: 210.97 KB JS (unchanged) / 4.05 KB CSS (was 3.58 KB) — the bump is the new scroll + scrollbar block.

**Next:** Step 5.5 — Drag-and-drop between quadrants. `MatrixView` becomes a `DndContext`; each `MatrixCell` registers as `useDroppable`; each `TaskCard` becomes `useDraggable`. On drop, dispatch `useUpdateTask({ patch: { quadrant } })` with optimistic update + rollback on adapter error. Tests should cover mouse drag, touch drag, and the visual drop indicator on the receiving cell. dnd-kit isn't yet a dependency — first commit will add `@dnd-kit/core` to `packages/app/package.json`.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

None.

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. Find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
