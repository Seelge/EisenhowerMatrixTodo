# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 31 — **done** (committing). Data-loss + a11y + mutation polish after full-project analysis.

### Shipped (TODOs 34–45)

| TODO | Notes |
|------|--------|
| 34 | Snackbar `pagehide` commits pending undo actions |
| 35 | Atomic replace-import (create-then-clear + create rollback) |
| 36 | `useUpdateTask` surfaces `app.task.save.failed` |
| 37 | Cross-quadrant `setRank` only on mutate success |
| 38 | TitleField blocks empty title |
| 39 | Rank cleanup on delete / clear / replace |
| 40 | Tag bulk rename/delete rollback |
| 41 | Conflict modal `useDialogBehavior` |
| 42 | Status label Mark complete / Reopen |
| 43 | DueDatePicker labels, search quadrant i18n, file input a11y |
| 44 | Composer tags Enter commits token |
| 45 | Options panel stub cleanup |

### Privacy / API

- Local-only; no network/telemetry.
- `rewrite-email.sh` untracked.

### Remaining open (external / design)

- **TODO 1** — Android pinch smoke (human + device)
- **TODO 11** — recurrence design spike
- **Step 11.6** — PWA screenshots + GPG release tag

## How to resume

1. Only external/design items remain for product TODOs.
