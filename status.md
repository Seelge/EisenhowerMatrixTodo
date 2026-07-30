# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 14 — Tags surface (TODO 5).

**Next implementation step (this session):** Give tags a first-class UI so they are no longer write-once-only via adapters/import.

### Phase 14 goal

Tags already live on the canonical `Task` model and render as chips on cards, but users could not add, remove, or filter by them. Ship:

1. **view3 `TagsField`** — chip list + input (Enter/comma); `useUpdateTask({ tags })`.
2. **Matrix + quadrant filter bar** — chips with counts; active filter hides non-matching cards client-side (`useTagFilterStore`, session-only).
3. **QuickComposer “More options”** — optional comma-separated tags on create.
4. **Options → Tags** — inventory of tags in use; tap applies filter and returns to matrix.
5. Pure helpers unit-tested (`normalize` / `merge` / `collect` / `filter`).

### Privacy / API

- No new network calls. Tags stay in IndexedDB via existing local adapter.
- Filter state is in-memory Zustand only (cleared on reload).
- No telemetry, no external tag APIs.

### Done when

- [x] Tags editable in view3
- [x] Filter bar on view1/view2
- [x] Composer + Options panel
- [x] Unit tests green
- [x] Privacy audit clean → commit + push

## Earlier

Phase 13 (search, sync chip, composer expand, swipe, etc.) — see `git log` / prior `status.md` history via commits.

## Pending external actions (user)

Step 11.6 / v0.1.0 still needs real-device PWA screenshots + signed tag.

## Open TODOs

`design-input-new.md`: TODO 1 (device smoke), 10 (light mode), 11 (recurrence), 14 (field-level conflict), 15 (visual regression). Global tag rename/delete deferred.

## How to resume

1. Read this file + `design-input-new.md`.
2. Next code: light mode design, or visual regression, or ship 11.6.
