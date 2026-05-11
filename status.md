# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Last completed:** Step 7.2 — Touch pinch.

Two-pointer pinch detection now drives view1 ↔ view2 navigation. Pure helpers live in `packages/app/src/views/zoom/pinch.ts` (`distance`, `midpoint`, `resolvePinchDirection`, `quadrantAtPoint`); thresholds are `inThreshold: 1.3`, `outThreshold: 0.77`, `minInitialDistance: 40 px`. `quadrantAtPoint` maps a viewport-relative point inside the matrix rect to the canonical Q2/Q1/Q4/Q3 layout (top-left/top-right/bottom-left/bottom-right); the rect-center tie resolves to Q3.

`packages/app/src/views/zoom/usePinchGesture.ts` wraps the helpers in a React hook that tracks pointer ids, snapshots the initial finger distance + midpoint + host bounding rect when the second pointer lands, and finalizes on pointerup. It also exposes `hasMultiPointer()` so callers can suppress single-pointer gestures (swipe / drag) while a pinch is in flight. Refs for the consumer's callback / options are written inside `useEffect` to satisfy `react-hooks/refs`.

`MatrixView` spreads the hook's handlers onto its `<main>` and navigates to `/q/<Qn>` on pinch-in using `quadrantAtPoint(midpoint, rect)`. The midpoint is captured at gesture start, so the destination quadrant doesn't shift while the user spreads their fingers.

`QuadrantView` adds the same handlers and additionally wires `pinch.onPointerMove` so the pointer positions stay current. The pinch-out path navigates back to `{ zoom: 'matrix' }` (constructed cleanly to satisfy `exactOptionalPropertyTypes`) and forwards any open `focusedTaskId` / `openedFromZoom`. The existing swipe handler now reads `pinch.hasMultiPointer()` and clears its `pendingGesture` whenever a second pointer lands or the lifted pointer was part of a pinch — that way a fast finger-1 drift during a pinch can't bleed into a phantom swipe.

`packages/app/src/views/zoom/highlight.ts` is a tiny Zustand store with a 600 ms TTL (`PINCH_HIGHLIGHT_MS`). `MatrixCell` reads it via `usePinchHighlight(quadrant)` and toggles `data-pinch-highlight="true"` on the Glow. `matrix.css` adds an outline + brightness rule for that attribute, transitioning back via the existing motion tokens.

Tests:
- `packages/app/test/matrix-pinch.test.tsx` covers (a) the pure helpers — direction classification at the thresholds, deadzone, min-initial-distance, midpoint→quadrant mapping; (b) `MatrixView` integration — synthetic two-pointer pinch-in centred on each of the four quadrant midpoints navigates to the right `/q/<Qn>`; (c) `QuadrantView` integration — pinch-out returns to `/`, sets `usePinchHighlightStore.active = previous`, and the active value clears after `PINCH_HIGHLIGHT_MS`; (d) regressions: pinch-in from view2 is a no-op, and a pinch suppresses an otherwise-qualifying swipe on the same touch. Happy-dom doesn't compute layout, so the host's `getBoundingClientRect` is stubbed to a 400×400 rect.

Verification completed:
- `pnpm --filter @emt/app exec tsc` passes.
- `pnpm lint` passes.
- `pnpm format:check` passes after `pnpm format`.
- `pnpm test` passes: 51 files / 345 tests.
- `pnpm --filter @emt/app build` passes. Production build: 395.38 KB JS / 11.13 KB CSS.
- `pnpm e2e` passes: 4 tests.

**Next:** Step 7.3 — Mouse wheel. `Ctrl + wheel` toggles zoom; plain wheel scrolls within the focused element. Wheel-up = zoom in, wheel-down = zoom out. Wire a wheel handler into `ZoomController`, ensure plain-wheel scrolling inside a cell is unaffected, and assert `Ctrl + wheel-up` on view1 zooms into the cell under the cursor while `Ctrl + wheel-down` on view2 returns to view1.

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
