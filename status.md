# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 19 — Global tag rename/delete — **done**. Next: Phase 20.

### What landed (Phase 19)

1. `renameTagInList` / `planTagRename` / `planTagDelete` pure helpers.
2. Options → Tags: Filter / Rename (inline) / Delete (confirm) per row.
3. Active matrix filter updates on rename and clears on delete.
4. Local adapter batch writes + `['tasks']` invalidate; unit tests.

### Privacy / API

- Bulk tag edits are local IndexedDB adapter updates only.
- No network, telemetry, or external APIs.
- `rewrite-email.sh` remains untracked.

### Next

1. Phase 20 — About keyboard shortcuts + Playwright visual smoke (TODO 15).
2. Phase 21 — Field-level conflict resolution (TODO 14).
3. Phase 22 — Light mode (TODO 10).
4. Document external: TODO 1 device smoke, TODO 11 recurrence.

## Earlier

- Phase 18: tag autocomplete — `eab5e60`
- Phase 17: due urgency + gap + `n` — `7a12062`

## Pending external actions (user)

Step 11.6 / v0.1.0 screenshots + GPG tag. TODO 1 real-device pinch smoke.
