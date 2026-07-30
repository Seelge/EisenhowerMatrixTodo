# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 22 — Light mode — **done** (committing). Implementable design TODOs closed.

### Session summary

| Phase | Commit | Notes |
|-------|--------|--------|
| 19 | `ad2f448` | Global tag rename/delete |
| 20 | `2ce4859` → fixed in 21 | About shortcuts; visual layout contract |
| 21 | `cd95b83` | Field-level conflict merge |
| 22 | (this) | Light theme palette + Appearance radios |

### Privacy / API

- Theme prefs in local meta IDB only.
- No network, telemetry, or external APIs.
- `rewrite-email.sh` untracked.

### Remaining open (not implementable here)

- **TODO 1** — real Android pinch smoke (human + device).
- **TODO 11** — recurrence (design spike first).
- **Step 11.6** — PWA screenshots + GPG release tag (user).

## How to resume

1. Read this file + `design-input-new.md`.
2. Next product work: recurrence design, or ship 11.6.
