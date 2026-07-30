# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 21 — Field-level conflict + Phase 20 CI fix — **committing**.

### What landed

- **Phase 19** (`ad2f448`): global tag rename/delete.
- **Phase 20** (`2ce4859`): About shortcuts; visual smoke (pixel golden failed CI → layout/chrome contract).
- **Phase 21:** per-field conflict picks + `{ merged }` resolution in sync engine.

### Privacy / API

- Conflict merge is local cache/outbox only. No network/telemetry.
- `rewrite-email.sh` untracked.

### Next

1. Phase 22 — light mode (TODO 10).
2. Document external: TODO 1 device smoke, TODO 11 recurrence.

## Pending external actions (user)

Step 11.6 / v0.1.0 screenshots + GPG tag. TODO 1 real-device pinch smoke.
