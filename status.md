# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Planning.

**Last completed:** drafted `plan.md` skeleton + Phases 0–4 in full detail (foundation, contracts, backend, design system, app shell). Phases 5–11 are present as one-line stubs.

**Next:** expand Phases 5–11 (views, conflict UI, polish) to the same level of detail as Phases 0–4. After that, switch from planning mode to implementation, starting at Step 0.1.

## Pending external actions (user)

- **GitHub Pages** must be enabled on the repository before Step 0.7's `deploy.yml` will succeed. Workflow source: GitHub Actions; deploy target: `gh-pages` branch (or "GitHub Actions" source — to be finalized in Step 0.7).
- `design-input.md` has uncommitted edits (Session continuity section + later tweaks). Commit when convenient — `plan.md` references it.

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. If still in planning mode (per "Phase" above), continue from "Next" above.
4. If in implementation mode, find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
