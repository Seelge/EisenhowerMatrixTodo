# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 16 — Completed-task hygiene & card actions.

**Previous (this session):** Phase 15 — Thin neon borders (glow halos → 1px neon lines). Landed as its own commit before Phase 16.

### Phase 16 goal

Done tasks stay in matrix cells forever (strikethrough only), so real use fills the board with noise. Card kebab is Move-only — Complete/Delete require opening view3.

Ship:

1. **`hideCompleted` default** (default **on**) in `useDefaultsStore` / meta IDB; Options → Defaults toggle.
2. **Matrix + view2** filter out `status === 'done'` when hide is on (after tag filter). Search still finds done tasks.
3. **Empty copy** in matrix cells when zero *visible* tasks (reuse muted empty note).
4. **Card menu:** Mark complete / Reopen, Delete (5s undo snackbar + optimistic cache, same as view3), existing Move to Q*.
5. Unit tests for filter helper, defaults persistence, menu actions.

### Privacy / API

- No new network. Pref lives in local meta IDB only.
- Delete/complete reuse existing adapter mutations.
- No telemetry.

### Done when

- [ ] Hide completed default + Defaults panel
- [ ] Matrix/view2 filter + empty state
- [ ] Card menu Complete/Reopen/Delete
- [ ] Unit tests green
- [ ] Privacy audit clean → commit + push

## Earlier

- Phase 15: thin neon borders (tokens, Glow, FAB/picker/edges/priority).
- Phase 14: tags surface — `2a3f48c`.
- Phase 13: search, sync chip, composer, swipe — `8379f06`.

## Pending external actions (user)

Step 11.6 / v0.1.0 still needs real-device PWA screenshots + signed tag.

## Open TODOs

`design-input-new.md`: TODO 1 (device smoke), 10 (light mode), 11 (recurrence), 14 (field-level conflict), 15 (visual regression). Tag autocomplete / global rename-delete deferred. Neon design-input §4.2 wording may still mention soft halos — update when convenient.

## How to resume

1. Read this file + `design-input-new.md`.
2. Finish Phase 16 checklist above if incomplete; else light mode design or 11.6.
