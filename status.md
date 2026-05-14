# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Next:** Phase 12 — Post-deployment feedback batch (`plan.md` § Phase 12), continuing from **Step 12.7**. Ten discrete steps logged after the v0.1 deploy was tried in desktop Chrome (view1 + view2) and Android Firefox in portrait. Each step is sized for a single session and the `Done when` block stands on its own — pick whichever step is most relevant and start there. Suggested ordering is the plan order (bugs → layout → gestures → palette), but the steps are otherwise independent.

Quick index:
- **12.1** — ✅ DnD correctness: delete is immediate, intra-quadrant reorder works, no card jitter during drag.
- **12.2** — ✅ view2 neighbour-edge drop precedence (diagonal becomes reachable).
- **12.3** — ✅ `TaskCardMenu` rendered as a portal popover so the kebab menu isn't clipped by the cell.
- **12.4** — ✅ view3 dismisses on click-outside, not just Esc.
- **12.5** — ✅ Card readability on narrow viewports (no 3-char truncation at 360 px).
- **12.6** — ✅ Remove the "Important" / "Urgent" axis labels to reclaim space.
- **12.7** — Quick-composer keyboard-aware layout on Android.
- **12.8** — Pinch-zoom snap into view2 on mobile browsers (Android Firefox).
- **12.9** — Ctrl+wheel zoom hijack prevention (suppress browser font-scale on desktop).
- **12.10** — Brighter neon palette refresh.

**In progress (frozen on user manual steps):** Step 11.6 — Release checklist & GitHub Pages live. Autonomous portion complete:

- Live URL: <https://seelge.github.io/EisenhowerMatrixTodo/> (the `Deploy` workflow publishes on every push to `main`).
- Lighthouse against the live site (modern Lighthouse ≥ 12 has dropped the dedicated PWA category — installability now lives inside Best Practices): Performance 88, Accessibility 91, Best Practices 96, SEO 90. PWA installability also re-verified by `pwa.spec.ts` + `pwa-offline.spec.ts` in CI.
- `RELEASE.md` scaffold landed with the checklist, scores, live URL, and the exact `git tag -s v0.1.0 …` invocation.

Phase 12 should probably land before v0.1.0 is tagged, since several items are real bugs (12.1, 12.5).

**Last completed:** Step 12.6 — removed the "Important ↑" / "Urgent →" axis-label strips. The verb-labelled cells already imply the axes, and the strips ate space the cells needed on narrow viewports. `MatrixView.tsx` no longer renders the two `.emt-matrix__axis` spans; `matrix.css` dropped the `.emt-matrix__axis*` rules and the asymmetric axis-gutter padding (`.emt-matrix` is now uniform `--space-md`, `--space-sm` at the narrow breakpoint), so the 2×2 grid fills the surface. The `app.matrix.axis.important` / `…urgent` i18n keys are removed. `matrix-view.test.tsx`'s "renders both axis labels" test is replaced with one asserting no `.emt-matrix__axis*` element renders. Cell order / keyboard focus order unchanged. `design-input.md`'s view1 line annotated to note the Phase 12 removal.

**Earlier:** Step 12.5 — card readability on narrow viewports. CSS-only. `.emt-task-card__title` swapped its single-line `white-space: nowrap` clip for a two-line clamp (`-webkit-line-clamp: 2` + `overflow-wrap: anywhere`), so a title that was getting snipped after 2-3 chars on a 360 px portrait screen now wraps across two readable lines. A `@media (max-width: 540px)` block in `matrix.css` + `task-card.css` reclaims horizontal space at that breakpoint (matrix padding `md sm`, grid gap `sm`, cell padding `sm`, card open-button padding `sm` / column-gap `xs`). New e2e `card-readability.spec.ts` runs at 360×720 and asserts the Q1 seed title renders over two lines (`boundingBox().height > 28`). Note: `golden-path.spec.ts` showed a pre-existing flake (`boundingBox()` null right after `toBeVisible()` passed — framer-motion entry-animation timing, unrelated to this step's CSS); it passes on retry and CI runs with `retries: 2`. Step 12.6 removes the axis strips and reclaims the rest of the matrix padding.

**Earlier still:** Step 12.4 — view3 dismiss on click-outside. The desktop side panel (`SidePanel`) has no scrim, so view3 was dismissable only by Escape. `useDialogBehavior` (design-system) gained an opt-in `DialogBehaviorOptions.closeOnOutsidePointer`: when set, a `document` `pointerdown` outside the dialog root routes through `onClose`. `SidePanel` opts in; `Sheet` doesn't (its scrim already handles it, so the narrow-viewport variant is unchanged). No `TaskView` logic change — its existing `onClose` already routes through `closeViewState`. Tests: `sheet.test.tsx` covers the SidePanel inside/outside pointerdown contract; `task-view.test.tsx` covers the full integration (click on the quadrant behind the panel closes view3 and preserves zoom; click inside the panel doesn't). **Note for future design-system changes:** the app imports `@emt/design-system` from its built `dist/`, so `tsc -b` (or `pnpm typecheck`) must run before `pnpm test` picks up design-system source edits — CI already orders typecheck before test.

**Earlier still:** Step 12.3 — `TaskCardMenu` as a portal popover. The kebab menu used to render inline (`position: absolute` within the card), so in view1 cells it was clipped to the cell's `overflow` box — often only the first item showed. It now renders through `createPortal` to `document.body` with `position: fixed` at `--layer-tooltip`; a `useLayoutEffect` measures the trigger's bounding rect and writes `left`/`top`/`visibility` straight onto the node (DOM write, not React state — keeps the lint rule happy and lands before paint), flipping the popover above the trigger when a card near the viewport bottom would push it off-screen. The menu starts `visibility: hidden` in CSS so it never flashes unplaced. Dismissal: outside-click and Escape as before, plus a new `onBlur` focus-loss guard (microtask-deferred `document.activeElement` check so arrow-key navigation between items doesn't trip it), plus scroll/resize-while-open dismissal. Roving keyboard nav unchanged. Tests in `task-card-menu.test.tsx` updated to look the menu up via `document` (it's portalled now) with new cases for the portal-mount contract and the focus-loss guard. `MatrixCell.tsx` untouched.

**Earlier still:** Step 12.2 — view2 neighbour drop-edge precedence. The focused quadrant's two orthogonal neighbour strips used to span the full edge and overlapped in a 24×24 corner square (non-deterministic drop) while the diagonal quadrant was unreachable. Fix in `views/quadrant/NeighborEdge.tsx` + `quadrant.css` + `QuadrantView.tsx`: a new `DIAGONALS` map gives each focused quadrant its diagonal neighbour + shared corner; `NeighborEdge` takes a `corner` prop and emits `data-inset` so each strip is pulled back 24 px at its corner-facing end; a new `DiagonalCorner` component renders a 24×24 corner drop zone (visual clipped to a triangle via `clip-path`, full-square hit area) reusing `DroppableEdgeData` so `createDragEndHandler` routes it with no handler change. Drops now resolve purely by region. Tests added in `quadrant-dnd.test.tsx`: `DiagonalCorner` structural contract, the `data-inset` attribute, a handler test routing a corner drop to the diagonal quadrant, and a `QuadrantView` assertion that exactly one corner zone renders.

**Earlier still:** Step 12.1 — DnD correctness sweep: optimistic delete (`applyOptimisticDelete` in `views/matrix/dnd.ts`, removes the card synchronously, rolls back on undo), intra-quadrant reorder (each `TaskCard` is also a `kind: 'card'` droppable; `computeReorderRank` writes a fractional rank via `useSetTaskRank`), and no drag jitter (`TaskCard` drops its `layoutId` while `isDragging`).

Earlier history (incl. Step 11.5 PWA offline e2e) lives in `git log --oneline` and the ✅ markers on `plan.md` step headings.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

The following items are required to close **Step 11.6** in `plan.md` (Release checklist & GitHub Pages live) and ship v0.1. Phase 12 fixes should land first — several are real bugs that would block a clean release.

1. **Install the PWA on Android Chrome** and capture screenshots into `docs/release-screenshots/android-install.png` + `…/android-home.png`. The address-bar prompt should offer "Install"; the home-screen icon should use the 512×512 PNG from the manifest.
2. **Install the PWA on Windows Chrome** and capture screenshots into `docs/release-screenshots/windows-install.png` + `…/windows-home.png`. The address-bar "Install" icon should produce a desktop shortcut + standalone window.
3. **Tag v0.1.0 with your GPG key.** Exact invocation (also in `RELEASE.md`):

   ```sh
   git tag -s v0.1.0 -m "v0.1.0 — first release"
   git push origin v0.1.0
   ```

   The release-notes outline (feature surface, shipped backends, deferred items) is in `RELEASE.md` under "Tag the release".

4. **Post-release housekeeping** once the tag is pushed: bump `package.json` to `0.2.0-dev` and open a v0.2 milestone covering the deferred items (remote backends, recurring tasks, `dueDateTime`, custom themes). Outline in `RELEASE.md` § Post-release.

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. Find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin. If resuming inside Phase 12, pick any step that's still un-ticked — they're independent.
