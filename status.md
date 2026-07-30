# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Phase 30 — **done** (committing). Reliability / a11y / data polish after full-project analysis.

### Shipped (TODOs 26–33)

| TODO | Notes |
|------|--------|
| 26 | Create/delete failure snackbars; delete-commit rolls cache back |
| 27 | Search `useDialogBehavior`; delete undo-window copy for SR |
| 28 | `parseExportFile` + Import (add) / Replace local |
| 29 | `encodeEmbeddedFields` / `decodeEmbeddedFields` in backend-core |
| 30 | Single `useTasks` list query + quadrant `select` |
| 31 | View3 field order + clear `completedAt` on reopen |
| 32 | Card menu Move up / Move down |
| 33 | README honest “usable local” status |

### Privacy / API

- Local-only; no network/telemetry.
- Notes encoding is pure string helpers (no I/O).
- `rewrite-email.sh` untracked.

### Remaining open (external / design)

- **TODO 1** — Android pinch smoke (human + device)
- **TODO 11** — recurrence design spike
- **Step 11.6** — PWA screenshots + GPG release tag

## How to resume

1. Only external/design items remain for product TODOs.
2. Optional next: SegmentedControl DS primitive, hide-completed chip on matrix, taskOrder in export v2.
