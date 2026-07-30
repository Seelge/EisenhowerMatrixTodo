# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 17 — Matrix scannability (due urgency + shell polish) — **done**.

### What landed this session

**Phase 17:**
1. Task cards: `data-due-bucket` from `relativeDateKey`; **Overdue** (`--color-error`) + **Today** (`--color-accent`); done tasks stay muted.
2. Matrix grid gap: `--space-sm` desktop / `--space-xs` ≤540 px.
3. Shared `useComposerStore` + `ComposerHotkeys`: **`n`** opens QuickComposer (not while typing, search open, task focused, or on Options).
4. Docs: design-input neon frames (§4.1–4.2, ethos, cards); a11y + loading/empty audits; TODO 16 marked done.

Earlier this branch tip also carried Phase 16 e2e/prettier follow-ups (`af398b8`, `06b9c10`).

### Privacy / API

- No new network. Due labels and composer hotkey are local UI only.
- No telemetry, no external APIs.
- `rewrite-email.sh` remains untracked.

### Done when

- [x] Overdue/today readable on cards
- [x] Gap tighten committed with Phase 17
- [x] `n` opens composer; ignored in inputs
- [x] design-input §4.2 matches neon implementation
- [x] Unit tests + privacy audit → commit + push

## Earlier

- Phase 16: hide completed + card complete/delete — `d2e3082` (+ e2e `06b9c10`)
- Phase 15: neon borders — `e66b1f3`
- Phase 14: tags — `2a3f48c`
- Phase 13: search/sync/composer/swipe — `8379f06`

## Pending external actions (user)

Step 11.6 / v0.1.0 still needs real-device PWA screenshots + signed tag.

## Open TODOs

`design-input-new.md`: TODO 1 (device smoke), 10 (light mode), 11 (recurrence), 14 (field-level conflict), 15 (visual regression). Tag autocomplete / global rename-delete (TODO 5 remainder).

## How to resume

1. Read this file + `design-input-new.md`.
2. Next candidates: tag autocomplete (± Options rename/delete), visual regression smoke, or ship 11.6.
