# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 18 — Tag autocomplete from inventory — **done**.

### What landed this session

**Phase 18:**
1. `suggestTags` / comma-token helpers (`incompleteTagQuery`, `committedTagsFromInput`, `applySuggestedTag`).
2. Shared `TagSuggestInput` combobox (listbox, arrows, Enter pick, Escape closes list only).
3. Wired into view3 `TagsField` + QuickComposer more-options tags.
4. Tests + a11y note; TODO 5/17 docs; rename/delete still open.

### Privacy / API

- Suggestions from local `useTasks()` / IndexedDB only. No network.
- No telemetry, no external APIs.
- `rewrite-email.sh` remains untracked.

### Done when

- [x] view3 + composer suggest existing tags
- [x] Exclude already-applied / committed tags
- [x] Escape does not dismiss sheet
- [x] Unit tests + privacy audit → commit + push

## Earlier

- Phase 17: due urgency + gap + `n` — `7a12062`
- Phase 16: hide completed + card actions — `d2e3082`
- Phase 15: neon borders — `e66b1f3`
- Phase 14: tags MVP — `2a3f48c`

## Pending external actions (user)

Step 11.6 / v0.1.0 still needs real-device PWA screenshots + signed tag.

## Open TODOs

`design-input-new.md`: TODO 1 (device smoke), 10 (light mode), 11 (recurrence), 14 (field-level conflict), 15 (visual regression). Tag **global rename/delete** (TODO 5 remainder).

## How to resume

1. Read this file + `design-input-new.md`.
2. Next candidates: Options tag rename/delete, keyboard shortcuts in About, visual regression smoke, or ship 11.6.
