# Accessibility audit (Step 11.3)

This document records the WCAG 2.2 AA audit for the first release.
The authoritative regression coverage lives in two Playwright specs:

- `packages/app/e2e/a11y.spec.ts` runs `@axe-core/playwright` against
  view1, view2, view3, and view4 with the `wcag2a`, `wcag2aa`, and
  `wcag22aa` rule tags enabled. The assertion is **zero critical
  violations** per view; serious-impact findings are logged but do
  not fail the suite.
- `packages/app/e2e/reduced-motion.spec.ts` emulates
  `prefers-reduced-motion: reduce` and asserts (a) the matrix →
  quadrant zoom lands within 500 ms (no morph animation runs) and
  (b) the design-system skeleton's shimmer animation collapses to
  `0s` under the reduced-motion media block.

## Palette contrast (dark theme)

All ratios computed with the WCAG relative-luminance formula. AA
requires 4.5:1 for normal text and 3:1 for large text / non-text
contrast (icons, focus rings, etc.).

| Foreground             | Background          | Ratio  | Outcome  |
| ---------------------- | ------------------- | ------ | -------- |
| `--color-text-primary` (#e6edf3) | `--color-bg` (#0a0e14) | ≈ 16.4:1 | AAA |
| `--color-text-primary` | `--color-surface` (#121821) | ≈ 15.1:1 | AAA |
| `--color-text-secondary` (#8b96a5) | `--color-bg` | ≈ 6.5:1 | AA |
| `--color-text-secondary` | `--color-surface` | ≈ 5.9:1 | AA |
| `--color-accent` (#3df1ff) | `--color-bg` | ≈ 14.0:1 | AAA |
| `--color-q1` (#ff3370) | `--color-bg` | ≈ 5.5:1 | AA |
| `--color-q2` (#3df1ff) | `--color-bg` | ≈ 14.0:1 | AAA |
| `--color-q3` (#ffb800) | `--color-bg` | ≈ 11.2:1 | AAA |
| `--color-q4` (#a7b4c4) | `--color-bg` | ≈ 9.2:1 | AAA |
| `--color-error` (#ff3370) | `--color-bg` | ≈ 5.5:1 | AA |

> Refreshed Step 12.10: the four quadrant colours + the cyan accent
> were pushed toward higher saturation / luminance ("neon-brighter"
> palette). All ratios above are AA or better against both `--color-bg`
> and `--color-surface`. Q4 ticks up from AA → AAA at the same time.

The quadrant colors are also load-bearing for the matrix neon
borders (1 px solid frames via the `Glow` primitive). The border is
decorative chrome; the visual contrast that matters for AA is the
text/border colour against the underlying surface, captured above.

## Keyboard navigation

Verified in the e2e suite (`keyboard.spec.ts`):

- Tab into a matrix cell, Enter to zoom in, Esc to zoom out.
- Arrow keys move focus between cells in the visual layout
  (Q2 → Q1 → Q3 by ArrowRight then ArrowDown).
- The card kebab menu (Step 5.6 TaskCardMenu) takes Space to open,
  Arrow keys to navigate, Enter to commit.
- The QuadrantPicker (used in QuickComposer + view3 QuadrantField)
  is a WAI-ARIA radio group with roving tabindex; Arrow keys move
  selection + focus, Home/End jump to the ends, Esc closes.
- The PriorityField is a 4-option radio group with the same roving
  semantics as the QuadrantPicker.
- TagSuggestInput (Phase 18) is a combobox + listbox: ArrowUp/Down,
  Enter to pick, Escape closes the list only (does not dismiss the
  parent sheet).

## Surfaces & dialogs

`ResponsiveSurface` (the shared sheet / side-panel host for
QuickComposer and TaskView) routes through `useDialogBehavior`, which
delivers initial focus into the surface, traps focus inside while
open, restores focus on close, and binds Escape. The TaskView,
QuickComposer, and ConflictModal all rely on this plumbing.

## Reduced motion

`@media (prefers-reduced-motion: reduce)` in
`packages/design-system/src/tokens.css` zeros all motion durations.
Framer-motion entry/exit transitions in `ZoomController` already
collapse via `useReducedMotion` (`packages/design-system/src/useReducedMotion.ts`).
The skeleton shimmer in `Skeleton.tsx` is gated on the same media
query in `components.css`.

`reduced-motion.spec.ts` is the regression — covers both the zoom
morph and the skeleton.

## Screen reader smoke tests (manual)

Not yet executed on a fresh hardware setup — booked as a manual
follow-up before the v1 cut on:

- **NVDA + Firefox / Chromium on Windows.** Verify: view1 announces
  "Eisenhower Matrix" landmark; each cell reads its quadrant label;
  TAB navigates the kebab menus correctly; opening a task announces
  the dialog role + heading.
- **VoiceOver + Safari on macOS / VoiceOver + Safari on iOS.** Verify
  the same scope as NVDA plus the swipe-between-quadrants gesture in
  view2 (Step 6.3) — VoiceOver replaces the swipe gesture with its
  own rotor, so the route flip should still work via Tab + Enter
  alternatives.

Findings will be logged here when run.

## Patches applied during Step 11.3

None. The four axe-core sweeps came back with zero critical
violations on the as-is build — credit to the design-system
primitives' built-in role/label discipline and the keyboard work in
Phase 6.

## Follow-ups

- ~~Skip to content~~ — Phase 26: `SkipLink` → `#emt-main` on matrix,
  quadrant, and options.
- ~~Light theme axe~~ — Phase 29: e2e Appearance → Light + axe on view1.
- ~~Snackbar undo window~~ — Phase 30: delete message includes
  “Undo available for 5 seconds” (polite live region).
- ~~Search dialog behavior~~ — Phase 30: `useDialogBehavior` focus trap
  + restore on the search overlay.
- Manual NVDA / VoiceOver smoke still open before a store cut.
