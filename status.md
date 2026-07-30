# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 16 — Completed-task hygiene & card actions — **done**.

### What landed this session

**Phase 15** (`e66b1f3`): thin neon borders (soft glow → 1px neon lines).

**Phase 16:**
1. `hideCompleted` default **on** in `useDefaultsStore` / meta IDB `defaults:hideCompleted`.
2. Options → Defaults checkbox + hint.
3. Matrix + view2 filter via `filterCompletedTasks` (after tag filter). Search unchanged (still finds done tasks).
4. Matrix cell empty note when zero visible tasks.
5. Card kebab: Mark complete / Reopen, Delete (optimistic + 5s undo snackbar), Move to Q*.
6. Tests: sort filter, defaults persistence, menu complete/delete, matrix-cell hide.

### Privacy / API

- No new network. Pref is local meta IDB only.
- Complete/delete reuse existing adapter mutations.
- No telemetry, no external APIs.
- `rewrite-email.sh` remains untracked.

### Done when

- [x] Hide completed default + Defaults panel
- [x] Matrix/view2 filter + empty state
- [x] Card menu Complete/Reopen/Delete
- [x] Unit tests green (515)
- [x] Privacy audit clean → commit + push

## Earlier

- Phase 15: neon borders — `e66b1f3`
- Phase 14: tags — `2a3f48c`
- Phase 13: search/sync/composer/swipe — `8379f06`

## Pending external actions (user)

Step 11.6 / v0.1.0 still needs real-device PWA screenshots + signed tag.

## Open TODOs

`design-input-new.md`: TODO 1 (device smoke), 10 (light mode), 11 (recurrence), 14 (field-level conflict), 15 (visual regression). Tag autocomplete / global rename-delete. design-input §4.2 still mentions soft halos (docs drift).

## How to resume

1. Read this file + `design-input-new.md`.
2. Next: light mode design, tag intelligence, visual regression smoke, or ship 11.6.
