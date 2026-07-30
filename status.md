# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 13 — post-Phase-12 UX polish (three improvement passes).

**Next:** Remaining open TODOs in `design-input-new.md` (tags surface, light mode, visual regression, remote backends), then pre-release manual items and **Step 11.6** (`v0.1.0` tag).

### Phase 13 landed this session

**Pass 1 — polish**

| TODO | Change |
|------|--------|
| 2 | Settings gear pill scrim (legible over Q1) |
| 4 | QuickComposer "More options…" → due + priority |
| 7 | view2 swipe when list is not scrollable |
| 8 | Diagonal corner glyph + higher resting opacity |
| 9 | TaskView body scrolls under soft keyboard |
| 12 | Skeleton count from last known task count |

**Pass 2 — search (TODO 6)**

- Search button + overlay (title/notes/tags)
- `/` and Ctrl/Cmd+K hotkeys
- Card highlight via `data-search-match` without zoom change

**Pass 3 — shell status + discoverability**

| TODO | Change |
|------|--------|
| 3 | `SyncStatusChip` top-left: Local / Offline / N conflicts |
| 13 | One-shot "Drag cards to reorder" hint (sessionStorage) |

Also: README stack no longer says Zustand/dnd-kit/Framer are "planned".

**Tests:** 500 unit tests green. Typecheck + eslint clean.

## Environment notes

- Prefer `bun` when `pnpm` is not on `PATH` (`./node_modules/.bin/vitest`, `tsc -b`).
- Repo still pins `packageManager: pnpm@10.33.2`.

## Pending external actions (user)

Unchanged from Step 11.6 — needed to ship v0.1.0:

1. Android + Windows PWA install screenshots → `docs/release-screenshots/`.
2. Tag `v0.1.0` with GPG (see `RELEASE.md`).
3. Real-device smoke: pinch-zoom (TODO 1) + QuickComposer keyboard.

## Open TODOs still open

See `design-input-new.md`: TODO 1 (device smoke), 5 (tags surface), 10 (light mode), 11 (recurrence), 14 (field-level conflict), 15 (visual regression). Tag autocomplete half of TODO 4.

## How to resume

1. Read `design-input-new.md`, this file.
2. `git log --oneline -20` / `git status`.
3. Next code work: tags filter/list, or ship 11.6 once manual checks land.
