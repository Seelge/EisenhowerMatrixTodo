# Design input (refreshed post-Phase-12)

This document supersedes `design-input.md`. It captures the *intended* design
of the Eisenhower Matrix Todo PWA as of the v0.1 candidate state (Phase 12
landed; Step 11.6 pending the manual release tag). It is rewritten from an
Android-app-design perspective — every surface and gesture is described against
Material 3 phone conventions first, with desktop fallback called out where it
diverges. The original `design-input.md` predates ten rounds of post-deploy
feedback; this rewrite folds those decisions into the body rather than as
historical footnotes, and surfaces unresolved issues / next steps as explicit
`TODO` sections.

> **Naming.** `view1`, `view2`, `view3`, `view4` are the four screens.
> "First release" / "later release" refer to product milestones.

---

## 1. Product framing

A personal task manager built around Eisenhower's Urgent × Important matrix.
Installable as a PWA on Android (primary target) and Windows Chrome
(secondary), with no native distribution and no server of our own — the user's
data lives on-device by default and can be mirrored to Google Tasks or
Microsoft To-Do later.

### Design ethos

- **Minimal futuristic neon on near-black.** A focused, "command-deck" feel —
  the matrix is a workspace, not a checklist. Each quadrant has a single
  load-bearing colour drawn as a thin neon border — the only ornament on the
  surface.
- **Touch-first, keyboard-complete.** Phone in portrait is the primary form
  factor; everything reachable by tap must also be reachable by Tab + arrow +
  Enter, and every drag has a "Move to" menu equivalent.
- **Material 3 behaviour, custom skin.** We follow M3 for touch-target
  sizing (≥ 48 dp), motion curves and durations, focus rings, ripple-like
  feedback, and dialog patterns — but the M3 colour system is replaced
  wholesale by the palette in § 4. No MUI or @material-3 components.
- **Local-first.** Every write commits to IndexedDB synchronously; remote
  sync is opportunistic background work. The app is fully usable offline.

### Non-goals (first release)

- iOS / Safari, Linux, Apple-platform browsers.
- Reminders, push notifications, badges.
- Recurrence (will land later; data model already reserves space).
- Subtasks, attachments, comments.
- Multi-user / sharing.
- Telemetry / analytics.
- ~~Light mode.~~ (Phase 22 — optional via Appearance.)
- Multi-locale i18n (strings wrapped from day one, but only English ships).

---

## 2. Information architecture

```
┌──────────────────────────────────────────┐
│  Eisenhower Matrix Todo (PWA shell)      │
│                                          │
│  ┌─ view1: Matrix ─────────────────────┐ │
│  │  ┌──────┐ ┌──────┐                  │ │
│  │  │ Q2   │ │ Q1   │   ← top = Important
│  │  └──────┘ └──────┘                  │ │
│  │  ┌──────┐ ┌──────┐                  │ │
│  │  │ Q4   │ │ Q3   │   ← right = Urgent
│  │  └──────┘ └──────┘                  │ │
│  │  [+ FAB]                [⚙ Settings]│ │
│  └─────────────────────────────────────┘ │
│                                          │
│     zoom (pinch / Ctrl+wheel / Enter)    │
│                  ↕                       │
│  ┌─ view2: Single quadrant ────────────┐ │
│  │  ┌──────────────────────────────┐   │ │
│  │  │  Q_n  (full bleed + edges)   │   │ │
│  │  │  ┌──── task list ────────┐   │   │ │
│  │  │  │  • task                │   │   │ │
│  │  │  └────────────────────────┘   │   │ │
│  │  └──────────────────────────────┘   │ │
│  │  [+ FAB]                [⚙ Settings]│ │
│  └─────────────────────────────────────┘ │
│                                          │
│  view3 (overlay over view1 or view2)     │
│   ├─ bottom sheet on phone               │
│   └─ ~480 px right side panel on desktop │
│                                          │
│  view4: /options  (full-screen surface)  │
│   ├─ Backends                            │
│   ├─ Account                             │
│   ├─ Appearance                          │
│   ├─ Defaults                            │
│   ├─ Data                                │
│   └─ About                               │
└──────────────────────────────────────────┘
```

### Route shape

| Route                        | View    | Notes                              |
| ---------------------------- | ------- | ---------------------------------- |
| `/`                          | view1   | Matrix                             |
| `/q/:quadrant`               | view2   | One of Q1–Q4                       |
| `/?task=:id` / `/q/Q2?task=` | view3   | Overlay over either lower view     |
| `/options[/...]`             | view4   | Sub-routes per group               |

Browser back/forward is part of the spec: every state transition that
crosses a view boundary pushes history. The view-state store mirrors the URL
(URL is source of truth, store is a projection) so deep links round-trip.

---

## 3. Form factors and breakpoints

### Phone portrait (primary, ≤ 540 px wide)

- 2 × 2 matrix fills the viewport edge-to-edge with `--space-sm` padding and
  `--space-xs` gap. Each cell is roughly `(viewport_w − 20px) / 2` on the short edge.
- view3 mounts as a Material 3 **bottom sheet** with a scrim. The matrix
  remains visible above the sheet, dimmed.
- QuickComposer (FAB → +) mounts as a bottom sheet. The picker sits *above*
  the title input so it remains visible when the soft-keyboard rises.
- Touch keyboard handling: `interactive-widget=resizes-content` viewport meta
  + `navigator.virtualKeyboard.overlaysContent = false` on supported
  browsers; Visual Viewport API fallback elsewhere. The sheet lifts itself by
  `keyboardInset` so the actions never sit behind the IME.

### Phone landscape

Not a first-class target, but must not crash. Matrix scales to the new aspect
and side-panel breakpoint kicks in if width > 720 px.

### Tablet / desktop (≥ 720 px wide)

- Matrix uses `--space-md` padding and `--space-sm` gap; cells get larger and titles can
  sit on one line.
- view3 mounts as a **right side panel** (~480 px wide) without a scrim. The
  matrix or focused quadrant remains fully interactive in the area to the
  left of the panel.
- QuickComposer also opens as a side panel.
- The same `+` (FAB) and `⚙` (Settings) affordances apply; mouse hover state
  is added but not required.

### Installed PWA

`display: standalone` on both Android and Windows. Top-of-window safe-area
insets are respected; the Settings button anchors top-right with
`max(--space-sm, env(safe-area-inset-top/right))`, mirroring the FAB rule at
bottom-right. The address bar is gone in standalone mode, so the matrix gets
the entire viewport.

---

## 4. Visual language

### 4.1 Colour palette (dark default; light optional)

| Token              | Hex       | Role                                              | Contrast vs `--color-bg` |
| ------------------ | --------- | ------------------------------------------------- | ------------------------ |
| `--color-bg`       | `#0A0E14` | App background (near-black, slight blue cast)     | —                        |
| `--color-surface`  | `#121821` | Cards, sheets, panels                             | —                        |
| `--color-surface-elevated` | `#1A2230` | Elevated chrome (modal, hover, tag chip)   | —                        |
| `--color-text-primary` | `#E6EDF3` | Primary text                                  | 16.4 : 1 (AAA)           |
| `--color-text-secondary` | `#8B96A5` | Captions, meta, empty notes                 | 6.5 : 1 (AA)             |
| `--color-accent`   | `#3DF1FF` | Focus rings, active states; doubles as Q2 colour  | 14.0 : 1 (AAA)           |
| `--color-q1` (Do)         | `#FF3370` | Important + Urgent                         | 5.5 : 1 (AA)             |
| `--color-q2` (Schedule)   | `#3DF1FF` | Important, not Urgent                      | 14.0 : 1 (AAA)           |
| `--color-q3` (Delegate)   | `#FFB800` | Urgent, not Important                      | 11.2 : 1 (AAA)           |
| `--color-q4` (Delete)     | `#A7B4C4` | Neither — intentionally muted              | 9.2 : 1 (AAA)            |
| `--color-error`           | `#FF3370` | Destructive / failure (shares Q1 hue)      | 5.5 : 1 (AA)             |

Quadrant colours double as chrome tokens via `--glow-q{n}` (aliases of
`--color-q{n}`). Phase 15 replaced soft outer/inset halos with **1 px solid
neon borders** on the `Glow` frame, FAB, picker, neighbor edges, high-priority
dot ring, and menus. Palette swaps and per-quadrant overrides still cascade
through the token aliases (no hex literals duplicated in component CSS).

### 4.2 Neon frame system

Every quadrant cell wears its colour as a **1 px neon border** (no soft halo).
The same token lights the drop-target on hover-while-dragging and the
"pinch-out from this quadrant" highlight that fades over 220 ms after
returning to view1. The active **drop indicator** is the per-quadrant border
colour at full strength plus a 2 px primary-text outline so the receiving
cell reads clearly against the underlying surface.

### 4.3 Typography

System sans for UI; system mono reserved for `notes` field rendering only.
Sizes: `xs 12 / sm 14 / md 16 / lg 20 / xl 24 / display 32` px. Weights:
regular 400 / medium 500 / bold 700. Cell titles are `lg medium` with
`letter-spacing: 0.01em`; the quadrant view's main heading is `xl medium`.

Card titles: `md regular` clamped to two lines with `overflow-wrap: anywhere`
so a single very long word breaks rather than overflows the column. Meta
(due + tags) is `sm`, secondary colour.

### 4.4 Spacing & radius

8-pt scale: `xs 4 / sm 8 / md 16 / lg 24 / xl 32 / 2xl 48 / 3xl 64` px. Radii:
`sm 4 / md 8 / lg 16 / pill 9999` px. The matrix cell uses `md` corner radius
implicitly via the Glow primitive's frame; cards use `md`; chips and the cell
reset button use `pill`.

### 4.5 Motion

M3-style: short `120 ms`, medium `220 ms`, long `320 ms`.
Easings: `standard cubic-bezier(0.2, 0, 0, 1)` (most UI),
`emphasized (0.3, 0, 0, 1)` (zoom transitions),
`decelerated`, `accelerated` for entry / exit.

`prefers-reduced-motion: reduce` collapses all motion durations to `0s` via
the design-system tokens.css media block, and `ZoomController` selects an
instant transition through `useReducedMotion`. State transitions still complete
identically in both modes — only duration differs.

### 4.6 Layering (z-index)

`base 0 / quadrantEdge 10 / fab 100 / sheet 200 / modal 300 / snackbar 400 /
tooltip 500`. The TaskCardMenu portal lives at `tooltip` so it always escapes
its cell's overflow box; sheets and side panels live at `sheet`; the conflict
modal at `modal`; the undo snackbar at `snackbar`.

---

## 5. view1 — Eisenhower matrix (the home screen)

### Layout

```
+----------+----------+
|  Q2 cyan |  Q1 red  |   top row = Important
| Schedule |    Do    |
+----------+----------+
|  Q4 grey |  Q3 amber|   right col = Urgent
|  Delete  | Delegate |
+----------+----------+
```

- 2 × 2 CSS grid filling the viewport (gap `--space-sm` desktop /
  `--space-xs` ≤540 px). `.emt-matrix` has `overflow: hidden`;
  each cell scrolls its own task list (`overflow-y: auto`) independently.
- The **axis labels** ("Important ↑" / "Urgent →") that the original design
  reserved space for are **removed**. The verb-labelled cells (Do, Schedule,
  Delegate, Delete) already imply the axes, and the gutter the axis strips
  ate was unaffordable on a 360 px portrait screen.
- Each cell wears its quadrant's 1 px neon border, with a header strip carrying
  the quadrant name and (only when at least one card in the cell carries a
  manual rank) a small "Reset" pill.

### Task card

```
+-----------------------------------------+----+
| ●  Two-line clamped title….              | ⋮  |
|    Today · ui · backend                  |    |
+-----------------------------------------+----+
```

- 10 px priority dot at left (`none` empty-ring / `low` muted / `normal`
  accent / `high` Q1 + 1 px neon ring).
- Title clamped to 2 lines via `-webkit-line-clamp: 2` + `overflow-wrap:
  anywhere`. No more 3-character truncation on narrow viewports.
- Meta row: due-date + tag chips. Due dates use relative labels
  ("Overdue", "Today", "Tomorrow", "This weekend", "Next week") when the
  date lands in a named bucket (`data-due-bucket`), otherwise the
  locale-formatted absolute date. Overdue uses `--color-error`; today uses
  `--color-accent`. Done tasks keep muted meta regardless of bucket.
- Tap target: the entire `.emt-task-card__open` (the card minus the kebab) is
  a real `<button>` and opens view3.
- Kebab (`⋮`): a 32 px-wide column on the right of the card. Tapping it opens
  the **TaskCardMenu** as a popover **portalled to `document.body`** so it
  escapes the cell's overflow clip. The popover position is measured from
  the trigger's bounding rect and flips upward if it would otherwise fall
  below the viewport. Items: Mark complete / Reopen, Delete (undo snackbar),
  "Move to Q*" (excluding current) — keyboard alternative to drag.

### Drag-and-drop

- dnd-kit with `PointerSensor (distance: 5)` so a tap is still a click and
  only a > 5 px move starts a drag, plus `KeyboardSensor` (Space to grab,
  arrows to move, Space again to drop, Esc to cancel).
- A `MatrixCell` is a single drop target (cross-quadrant move). Every
  `TaskCard` is *also* a drop target (intra-quadrant reorder via fractional
  ranks in the `taskOrder` IDB store). Dropping onto a card resolves to "land
  above this card" via the card's rect; the card's own `useDroppable` is
  disabled while it is the dragged item so dnd-kit never resolves a drop
  onto itself.
- Drop indicator: the receiving cell's per-quadrant neon border at full
  strength + a 2 px white outline. The dragged card stays fully opaque at 0.85 alpha
  (`data-dragging='true'`) and gets `z-index: 1` so the cell's overflow box
  doesn't clip it mid-drag. `layoutId` is dropped from the dragged node while
  `isDragging` so framer-motion's shared-layout morph and dnd-kit's
  `transform` don't fight (no jitter).
- Optimistic cache mutation on drag-end; rollback on adapter error.

### Floating action button + quick composer

- 56 dp circular FAB at bottom-right, safe-area-padded, with a `+` glyph.
- Opens **QuickComposer**: title input + 2 × 2 mini-picker (uses the same
  per-quadrant glow). Submit disabled while the trimmed title is empty.
  Esc or scrim click cancels.
- On phones the composer is a bottom sheet that lifts itself above the
  software keyboard (§ 3); on desktop it's the right side panel.
- The pre-selected quadrant comes from `useNewTaskQuadrant()`
  (Defaults panel) so the user can pre-bias it.

### Settings button

A 48 dp Material-style gear icon anchored top-right of the matrix surface,
respecting safe-area-inset-top/-right. Tap navigates to `/options`. The
button has `aria-label="Settings"` and is reachable by Tab. It is the only
way for a user to reach view4 short of typing the URL.

### Pinch-to-zoom

- Two-finger pinch-in on view1 navigates to view2 with the **quadrant under
  the gesture midpoint at gesture start** focused. Captured at gesture
  *start* so the destination doesn't shift while the user spreads.
- `touch-action: pan-y` on the matrix, cells, and lists keeps vertical
  scroll working while denying the browser its native pinch-zoom. Cards
  themselves use `touch-action: none` so a vertical drag becomes a
  dnd-kit drag.

### Mouse wheel

- Plain wheel scrolls within whichever cell list the cursor is over.
- `Ctrl + wheel-up` zooms into the cell under the cursor; `Ctrl + wheel-down`
  on view2 returns to view1. The wheel handler is bound on `window` with
  `{ passive: false }` so the browser's native font-scaling page-zoom never
  fires when we wanted to navigate.

### Keyboard

- Tab into a cell, Enter to zoom in, Esc to zoom out.
- Arrow keys move focus between cells in visual space:
  `Q2 →ArrowRight→ Q1`, `Q1 →ArrowDown→ Q3`, etc.
- `+` / `-` zoom in (defaults to Q1 if no cell is focused) / out.
- Modifier-combinations (Ctrl/Cmd/Alt) are reserved for `Ctrl+wheel` and
  browser shortcuts and don't fire view-state nav.

---

## 6. view2 — Single quadrant

### Layout

The focused quadrant fills the viewport with its glow border and a 24 px
inner padding to make room for the **neighbour strips**.

```
+========================================+
|                  TOP STRIP             |   ← orthogonal neighbour
| L                                    R |
| E   +─ quadrant frame ───────────+    I |
| F   │                            │    G |
| T   │       task list            │    H |
|     │                            │    T |
| S   │                            │    |
| T   +────────────────────────────+    S |
| R                                     T |
| I                                     R |
| P                  BOTTOM STRIP        |
+========================================+
                              ╲ diagonal corner triangle
```

- **Two orthogonal neighbour strips** light up the two shared edges with the
  neighbour quadrants' colours at 40 % opacity. The remaining two edges face
  the matrix outside and stay clean.
- A **diagonal corner zone** sits in the shared corner of the two strips,
  clipped to a triangle. Dropping a card here moves it to the *diagonal*
  quadrant directly — no zoom-out + zoom-in detour. The corner has a full
  24 × 24 hit area; the visual is the triangle.
- Strips and corner are pure decoration via `pointer-events: none`; they are
  dnd-kit `useDroppable` targets nonetheless because collision detection
  works off droppable rects, not pointer events. This keeps stray taps from
  triggering moves.
- Each strip is **inset 24 px** at its corner-facing end so the strips never
  overlap with the diagonal corner (the precondition for deterministic
  drop resolution).

### Edge-precedence rule

A drop falling exactly on a strip/corner boundary resolves by **which
rectangle's centre the pointer is closer to** — i.e. the smaller area (the
24 × 24 corner) wins inside its bounding box; the strip wins everywhere else
along the edge. The corner's clipped visual hints the diagonal direction
without claiming a larger target than its hit area.

### Swipe to switch focus

- Horizontal / vertical pointer-drag *off* a card and *off* the task list
  scroll area switches focus to the geometrically adjacent quadrant. Threshold:
  50 px distance, 1.5× dominance ratio, ≤ 400 ms gesture (flick), 300 ms
  cooldown between flicks.
- Pointer-type-agnostic: the same handler responds to mouse-drag-from-frame.
- Pinch-out anywhere on view2 returns to view1; the previously-focused cell
  lights up for 600 ms after the morph so the user can locate where they
  came from.

### Empty state

When the focused quadrant has zero tasks, the list area shows the muted-grey
"Nothing here yet." note centred vertically (no illustration). The
neighbour strips and corner remain present so drag-in still works.

### FAB and Settings

Same as view1: the FAB creates into the focused quadrant (the 2 × 2 picker
inside QuickComposer is omitted in view2 — the focus implies the
destination). The Settings gear sits top-right with the same anchor rule.

---

## 7. view3 — Task focus

### Surface

- **Phone**: bottom sheet, 100 % width, > 50 % height, with a scrim. Closes
  on Esc, scrim tap, or the sheet's drag-down handle.
- **Desktop**: right side panel, exactly 480 px wide, no scrim. Closes on
  Esc *or* on click anywhere outside the panel (matrix, FAB, axis labels —
  all routes through `closeViewState`). This is required because a desktop
  user is already mousing and shouldn't have to reach for Esc to dismiss.

Both surfaces share initial focus, focus trap, restore-on-close, and Escape
binding via the design-system `useDialogBehavior`. The underlying view stays
visible (sheet: dimmed, side panel: fully interactive). Closing routes the
user back to whichever view (view1 or view2) they came from via the
`openedFromZoom` field in `ViewState`.

### Field editors

Single column, top-to-bottom:

1. **Title** — single-line text input; debounced 300 ms commit.
2. **Notes** — markdown textarea with optional preview toggle.
3. **Due date** — `DueDatePicker` quick-row + native `<input type="date">`.
   Quick-pick presets: **Today / Tomorrow / This weekend / Next week / No
   date**. Today and Tomorrow are 1-tap each. "Weekend" computes the upcoming
   Saturday in the user's locale.
4. **Due time** (optional) — `<input type="time">` next to the date.
   Rendered always but `disabled` until a date exists, so keyboard focus and
   surrounding layout don't reflow as the date is cleared.
5. **Priority** — segmented control (radio group): None / Low / Normal /
   High. The priority dot in the matrix card reflects this immediately.
6. **Quadrant** — 2 × 2 picker with the current selection highlighted.
   Changing it moves the task; the matrix below reflects the move.
7. **Backend** — dropdown of registered backends. Switching triggers
   `migrateTask` (create on target, delete on source, with rollback) and
   shows a progress indicator. Conflict during migration → conflict modal.
8. **Status** — large complete checkbox + a destructive trash icon. Trash
   dispatches `useDeleteTask` and shows a 5 s undo snackbar; let it expire
   and the delete commits. **The card disappears from the matrix
   synchronously** on click (optimistic), reappears on undo.

### Backend-unsupported field hints

Each field declares which backends support it (via `BackendCapabilities`).
An info icon appears next to a field whose value won't natively round-trip
on the active backend — it will still be encoded into `notes` per the
adapter contract, but the user gets a hint that the round-trip is lossy if
they're switching backends.

---

## 8. view4 — Options

Full-screen surface at `/options`. Renders a list of groups; tapping a group
pushes `/options/:group` onto history. Internal back button + browser back
both return to the index list.

### Groups

1. **Backends** — list of registered backends with sync status, connect /
   disconnect actions, and a "default backend for new tasks" radio. Google
   and Microsoft rows render disabled with "Coming later" until those
   adapters land.
2. **Account** — connected identity per backend with sign-out. Local
   backend renders informational copy (no account).
3. **Appearance** — theme locked to Dark (disabled radio). **Per-quadrant
   colour overrides**: each quadrant gets a colour-picker swatch + a "Reset"
   button. Overrides persist to a `prefs` IDB store and merge into the theme
   on read.
4. **Defaults** — default quadrant for new tasks (drives the FAB →
   QuickComposer pre-selection); default secondary sort (due date / created
   / title).
5. **Data** — Export all tasks (across backends) to JSON; Import from JSON;
   Clear local cache (does not affect remote backends).
6. **About** — version, build commit SHA, link to source.

---

## 9. Backend architecture

### Adapter interface

A single `BackendAdapter` TypeScript interface that every storage backend
implements:

- `list(quadrant?)`
- `get(id)`
- `create(draft)` → returns the canonical `Task`
- `update(id, patch)`
- `delete(id)` (idempotent)
- `changesSince(cursor)` → `{ changes, nextCursor }` for sync

A parameterized contract test suite (`runAdapterContract`) lives in
`backend-core` and runs against every adapter so each backend is verified
against the same expectations.

### Canonical task model

| Field         | Type                                 | Notes                                         |
| ------------- | ------------------------------------ | --------------------------------------------- |
| `id`          | branded `TaskId`                     | UUID                                          |
| `backendId`   | branded `BackendId`                  | Which adapter owns this task                  |
| `title`       | string (required)                    |                                               |
| `notes`       | markdown string                      |                                               |
| `dueDate`     | ISO date (optional)                  |                                               |
| `dueTime`     | ISO time (optional)                  | Only meaningful when `dueDate` is set         |
| `priority`    | `'none' | 'low' | 'normal' | 'high'` |                                               |
| `quadrant`    | `'Q1' | 'Q2' | 'Q3' | 'Q4'`          |                                               |
| `status`      | `'open' | 'done'`                    |                                               |
| `completedAt` | ISO datetime (optional)              |                                               |
| `createdAt`   | ISO datetime                         |                                               |
| `updatedAt`   | ISO datetime                         |                                               |
| `tags`        | string[]                             |                                               |

Manual rank (per-quadrant ordering) is **not** part of `Task`. It lives in a
separate `taskOrder` IDB store keyed by `(backendId, taskId)` with a
fractional `rank` — manual order is a UI concern, not a remote-syncable
property.

### Field mapping table

| Canonical    | Google Tasks                  | Microsoft To-Do            |
| ------------ | ----------------------------- | -------------------------- |
| `id`         | `id`                          | `id`                       |
| `title`      | `title`                       | `title`                    |
| `notes`      | `notes` (plain)               | `body.content`             |
| `dueDate`    | `due` (date only)             | `dueDateTime`              |
| `dueTime`    | encoded in `notes`            | `dueDateTime`              |
| `priority`   | encoded in `notes`            | `importance`               |
| `quadrant`   | one list per quadrant         | one list per quadrant      |
| `status`     | `status`                      | `status`                   |
| `completedAt`| `completed`                   | `completedDateTime`        |
| `createdAt`  | derived from `updated`        | `createdDateTime`          |
| `updatedAt`  | `updated`                     | `lastModifiedDateTime`     |

Cross-quadrant moves on Google / Microsoft regenerate IDs (delete + create);
this is documented and accepted to keep the native apps' UX clean.

### Sync engine

- Local-first writes commit to IndexedDB immediately and queue in an
  `outbox` store.
- `flush(backendId?)` replays the queue against the adapter with exponential
  backoff + jitter (max 5 retries, max 60 s delay).
- `pull(backendId)` reads `changesSince(cursor)` and applies remote changes
  to the local cache. Tasks edited locally since the cursor surface as
  `ConflictRecord`s.
- The default sync trigger set: app focus, online event, manual "Sync now"
  button in the Backends panel.

### Conflict resolution

Whole-record local-vs-remote choice. The resolver opens a centered modal
with both records side-by-side and the differing fields highlighted; the
user picks "Keep local" or "Keep remote". Multiple conflicts queue and are
presented one at a time. While a user is mid-action (drag, composing) the
queue waits; a small badge on the sync-status icon hints that conflicts are
pending.

### Backend authentication

OAuth 2.0 PKCE in-browser. Refresh tokens stored in IndexedDB (origin-isolated).
Single account per backend.

### First-run flow

- Start on the **local (IndexedDB)** backend.
- Seed three sample tasks: one in Q1 (Do), one in Q2 (Schedule), one
  completed in Q4 (Delete) — so the matrix is immediately legible.
- Dismissible "Connect Google Tasks / Microsoft To-Do" banner. Dismissal
  persists.

---

## 10. Accessibility

### Contrast

All palette ratios are AA against both `--color-bg` and `--color-surface`
(see § 4.1). Q4 → AAA.

### Keyboard

Every flow is fully reachable by keyboard:

- Tab cycles through cells / FAB / Settings on view1; through neighbour
  strips, list, FAB, Settings on view2.
- Arrow keys: cell focus on view1; menu navigation in TaskCardMenu and
  QuadrantPicker (WAI-ARIA radio group with roving tabindex).
- Enter zooms into a focused cell; Esc zooms out / closes view3.
- Space-to-grab drag is honoured by dnd-kit's KeyboardSensor; "Move to"
  menu (TaskCardMenu) is the equivalent affordance and is explicitly
  documented as the required a11y fallback.
- `+` / `-` mirror the wheel zoom.

### Screen-reader smoke tested on NVDA (Windows) and TalkBack (Android Chrome)
for all four views.

### Reduced motion

`prefers-reduced-motion: reduce` zeros every motion duration in
`tokens.css` and `ZoomController` switches to an instant transition. The
skeleton shimmer animation also collapses. State transitions complete
identically; only animation duration differs.

### Icons

Every icon-only button (FAB, kebab, gear, info-hint, undo, close, back)
carries an `aria-label`. Lint is configured with `eslint-plugin-jsx-a11y` to
enforce this at write time.

---

## 11. Cross-cutting UX

### Time zones

Dates are stored as ISO strings in the user's local zone at creation; they
are displayed in the user's current local zone at read time. No multi-zone
awareness in the first release. Relative-date bucketing ("Today",
"Tomorrow", "This weekend", "Next week") is computed against the current
locale's start-of-week and day-of-week.

### Loading / error / empty states

Standardised primitives from the design system:

- **Skeleton** — pulsing dark rectangles while a list is loading.
- **ErrorBanner** — inline banner with a Retry CTA on query failure.
- **EmptyNote** — single muted-grey line, centred in the available space.

Every list-bearing view uses all three.

### Notifications / reminders

Deferred. The data model has `dueDate` + `dueTime` but no `notifyAt`.

### Telemetry

None.

---

## 12. Technology snapshot

- **TypeScript** everywhere; strict mode + `noUncheckedIndexedAccess` +
  `exactOptionalPropertyTypes`.
- **React 18 + Vite** for the app.
- **Zustand** for app state (view-state store; defaults; busy flags).
- **TanStack Query** for backend cache and sync orchestration.
- **dnd-kit** for accessible drag-and-drop (touch + mouse + keyboard).
- **Framer Motion** for the zoom morph and shared-layout transitions.
- **pnpm workspaces** for the monorepo:
  - `app`, `design-system`, `backend-core`, `backend-local-indexeddb`,
    `backend-inmemory` (test fixture), `backend-google` (stub),
    `backend-microsoft` (stub).
- **Vitest** for unit/component tests; **Playwright** for e2e.
- **PWA**: `vite-plugin-pwa`, Workbox precaches the app shell;
  `manifest.webmanifest` ships 192 / 512 / maskable icons.

### Distribution

Manual install via Chrome's "Install" affordance on Android and Windows.
Hosted from **GitHub Pages** on push to `main` via the `Deploy` workflow.
No app-store presence in the first release.

---

# TODO — issues & improvements (open for next phase)

The sections below are unresolved items spotted while writing this rewrite
(or surfaced by Phase 12 feedback but not yet acted on). They are not part
of the first-release plan but should be discussed before v0.2 work starts.

## TODO 1 — Pinch-zoom on Android: real-device confirmation owed ⏳ external

Step 12.8 fixed the snap reliability in code. Unit tests cover
`pointermove` snap. **Still needs a human on a real Android device**
(recording into `docs/release-screenshots/` + `RELEASE.md`). Cannot be
closed from CI alone.

## TODO 2 — Settings button visibility on busy cells ✅

**Done (Phase 13).** Kept the floating gear and added a pill scrim
(`color-mix` bg + `backdrop-filter: blur`) on `.emt-matrix__settings` /
`.emt-quadrant__settings`. Search button reuses the same treatment.

## TODO 3 — Sync-status surface is missing ✅

**Done (Phase 13, v0.1-shaped).** `SyncStatusChip` top-left on view1/view2:
- `Local` (faint) when online — only the IndexedDB backend ships in v0.1
- `Offline` when `navigator.onLine` is false
- `N conflict(s)` badge driven by `useConflictStatusStore` (written by
  the conflict resolver queue)

`syncing` / `queued (N)` / remote-error states land with Google/MS
adapters; the chip's `data-sync-status` discriminator is ready for them.

## TODO 4 — Quick composer is title-only ✅ (partial)

**Done (Phase 13):** "More options…" disclosure reveals DueDatePicker +
priority segmented control. Tag autocomplete landed in Phase 18 (TODO 5).

## TODO 5 — Tags have no first-class surface ✅ (MVP + autocomplete)

**Done (Phase 14 + Phase 18).**

- view3 `TagsField` — add/remove chips; Enter/comma commit; backspace on
  empty input removes last chip; **Phase 18** combobox suggests inventory.
- Matrix + quadrant `TagFilterBar` — chips with counts; toggle filter
  client-side (`useTagFilterStore`).
- QuickComposer more-options — comma-separated tags on create with the
  same autocomplete (token-aware last segment).
- Options → Tags — inventory; tap applies filter and navigates home.

**Phase 19:** Options → Tags supports Filter / Rename / Delete. Rename
and delete plan bulk `tags` patches across matching tasks (case-insensitive
merge on collision). Active matrix filter updates or clears with the edit.

## TODO 6 — Search ✅

**Done (Phase 13).** Search button next to Settings; overlay matches
title/notes/tags; `/` and Ctrl/Cmd+K hotkeys; matching cards get
`data-search-match` highlight without changing zoom. Arrow keys + Enter
navigate results.

## TODO 7 — view2 swipe vs. list scroll on a populated quadrant ✅

**Done (Phase 13).** List exclusion is overflow-aware: non-scrollable
lists accept swipe starts; overflowing lists still protect scroll.
Covered by unit tests that mock `scrollHeight` / `clientHeight`.

## TODO 8 — Diagonal corner is invisible without dragging ✅

**Done (Phase 13).** Resting opacity 0.55 + decorative corner glyph
(`↖↗↙↘`), `aria-hidden` on the host.

## TODO 9 — Soft-keyboard nudge on view3 ✅ (partial)

**Done (Phase 13):** `.emt-task-view__body` is `flex: 1; overflow-y: auto`
so fields scroll under the keyboard-aware sheet max-height. Field
re-order (toggles to bottom) still open if real-device smoke shows pain.

## TODO 10 — Light mode ✅

**Done (Phase 22).**

- Explicit opt-in via Appearance → Theme (Dark default; no
  `prefers-color-scheme` auto-switch).
- Separate light palette: pale surfaces + **deeper** quadrant/accent
  hues for AA on white (`lightColors` in design-system tokens).
- Persisted as `appearance:scheme` in meta IDB; ThemeProvider sets
  `data-emt-theme` + CSS vars. Per-quadrant overrides still apply on top.

## TODO 11 — Recurrence model ⏳ deferred (design)

Still open product decisions before UI work:

- Completing one occurrence when the next was already edited → prefer
  user edits; new occurrence inherits only untouched fields.
- Google Tasks has no native recurrence → store RRULE in `notes` as
  `<!--emt:rrule:…-->` (same pattern as priority encoding).
- Adapter `capabilities.recurrence` already exists; Task model has no
  first-class field yet.

Not shipping in this pass — needs a dedicated design spike.

## TODO 12 — Per-cell loading skeleton count ✅

**Done (Phase 13).** Module-level last-count map per quadrant, written
from an effect when tasks resolve; skeleton strip length uses that
count (clamped 1–6 / 1–8).

## TODO 13 — Discoverability of intra-quadrant reorder ✅

**Done (Phase 13).** `ReorderHint` shows once per session when a cell /
quadrant has > 1 task and no manual ranks; dismiss writes
`sessionStorage`. Disappears automatically once the user reorders
(`hasManualRank`). Kebab "Reorder…" modal still open if needed.

## TODO 14 — Conflict modal: field-level resolution ✅

**Done (Phase 21).**

- Per-field pick (tap local/remote value); Apply selection.
- Whole-record Keep local / Keep remote remain.
- `ConflictResolution` may be `{ merged: Task }`; sync engine writes
  cache + updates outbox payload.
- Pure `buildMergedTask` / `resolutionFromFieldPicks` in backend-core.

## TODO 15 — Tests: visual regression coverage ✅ (smoke)

**Done (Phase 20, smoke).** CI-stable layout/chrome contract on the seeded
matrix (`e2e/visual-smoke.spec.ts`): four cells, ≥phone geometry, 1px Q1
neon border + dark palette tokens. Pixel goldens skipped (font metrics
differ local vs GHA); Docker-matched baselines optional later.

## TODO 16 — Matrix scannability (due urgency + shell) ✅

**Done (Phase 17).**

- Task cards: `data-due-bucket` + Overdue/Today styling; overdue label.
- Matrix grid gap tightened (`sm` / `xs` on narrow).
- `n` hotkey opens QuickComposer (ignored while typing / search / task sheet).
- design-input §4.1–4.2 + audits aligned with thin neon borders.

## TODO 17 — Tag autocomplete from inventory ✅

**Done (Phase 18).**

- Pure `suggestTags` (+ comma-token helpers) over `collectTagCounts`.
- Shared `TagSuggestInput` combobox on view3 TagsField + QuickComposer.
- Escape closes listbox only; free-text path unchanged.
- Options global rename/delete landed in Phase 19 (TODO 18).

## TODO 18 — Global tag rename / delete ✅

**Done (Phase 19).**

- Pure `renameTagInList` / `planTagRename` / `planTagDelete`.
- Options → Tags row actions: Filter, Rename (inline), Delete (confirm).
- Active tag filter stays coherent after rename/delete.
- Local adapter writes only; one invalidate of `['tasks']` after the batch.

## TODO 19 — Keyboard shortcuts in About ✅

**Done (Phase 20).** About panel lists `n`, search, zoom, arrows, Space-drag.

## TODO 20 — Optimistic status / move / priority ✅

**Done (Phase 23).** `useUpdateTask` applies `applyOptimisticPatch` in
`onMutate` (rollback on error). Completing a task with hide-completed
on removes the card immediately; menu moves match DnD snappiness.

## TODO 21 — Data panel safety + honest import ✅

**Done (Phase 24).** Clear-local requires explicit confirm. Import
summary includes fallback count + missing backend ids via
`formatImportSummary`. (taskOrder still device-local — import mints
new ids.)

## TODO 22 — Composer due time + default priority ✅

**Done (Phase 25).** QuickComposer more-options: due time (when date
set). Options → Defaults: default priority; composer follows until the
user overrides.

## TODO 23 — Connect banner CTA + skip link ✅

**Done (Phase 26).** Banner styled; "Open Backends" → `/options/backends`.
`SkipLink` → `#emt-main` on matrix / quadrant / options.
