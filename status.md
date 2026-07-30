# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phases 27–29 — **done** (committing).

### Session summary

| Phase | Notes |
|-------|--------|
| 27 | `applyTaskPatch` + `null` clear on optional fields |
| 28 | Notes Edit/Preview Markdown (safe subset, no deps) |
| 29 | Light-theme axe e2e on matrix |

### Privacy / API

- No network/telemetry. MD preview is client-only HTML escape + subset.
- `rewrite-email.sh` untracked.

### Remaining open (not implementable here)

- **TODO 1** — real Android pinch smoke (human + device).
- **TODO 11** — recurrence (design spike first).
- **Step 11.6** — PWA screenshots + GPG release tag (user).

## How to resume

1. Read this file + `design-input-new.md`.
2. Next: recurrence design, or ship 11.6.
