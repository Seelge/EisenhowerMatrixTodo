# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**Next:** Phase 12 — Post-deployment feedback batch (`plan.md` § Phase 12). Ten discrete steps logged after the v0.1 deploy was tried in desktop Chrome (view1 + view2) and Android Firefox in portrait. Each step is sized for a single session and the `Done when` block stands on its own — pick whichever step is most relevant and start there. Suggested ordering is the plan order (bugs → layout → gestures → palette), but the steps are otherwise independent.

Quick index:
- **12.1** — DnD correctness: delete is immediate, intra-quadrant reorder works, no card jitter during drag.
- **12.2** — view2 neighbour-edge drop precedence (diagonal becomes reachable).
- **12.3** — `TaskCardMenu` rendered as a portal popover so the kebab menu isn't clipped by the cell.
- **12.4** — view3 dismisses on click-outside, not just Esc.
- **12.5** — Card readability on narrow viewports (no 3-char truncation at 360 px).
- **12.6** — Remove the "Important" / "Urgent" axis labels to reclaim space.
- **12.7** — Quick-composer keyboard-aware layout on Android.
- **12.8** — Pinch-zoom snap into view2 on mobile browsers (Android Firefox).
- **12.9** — Ctrl+wheel zoom hijack prevention (suppress browser font-scale on desktop).
- **12.10** — Brighter neon palette refresh.

**In progress (frozen on user manual steps):** Step 11.6 — Release checklist & GitHub Pages live. Autonomous portion complete:

- Live URL: <https://seelge.github.io/EisenhowerMatrixTodo/> (the `Deploy` workflow publishes on every push to `main`).
- Lighthouse against the live site (modern Lighthouse ≥ 12 has dropped the dedicated PWA category — installability now lives inside Best Practices): Performance 88, Accessibility 91, Best Practices 96, SEO 90. PWA installability also re-verified by `pwa.spec.ts` + `pwa-offline.spec.ts` in CI.
- `RELEASE.md` scaffold landed with the checklist, scores, live URL, and the exact `git tag -s v0.1.0 …` invocation.

Phase 12 should probably land before v0.1.0 is tagged, since several items are real bugs (12.1, 12.5).

**Last completed:** Step 11.5 — PWA install + offline e2e. `packages/app/e2e/pwa-offline.spec.ts` covers the offline loop within one page session: confirm a seed task online; `setOffline(true)` + reload → shell + seed task survive; create a task while offline → it lands in Q2 directly via the local IDB adapter; reconnect → page still healthy, offline-created task remains. Outbox-flush-on-reconnect is a no-op at v0.1 (only the local backend is registered). CI run `25823960061` + Deploy `25823963195` green on `main`.

Earlier history lives in `git log --oneline` and the ✅ markers on `plan.md` step headings.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

The following items are required to close **Step 11.6** in `plan.md` (Release checklist & GitHub Pages live) and ship v0.1. Phase 12 fixes should land first — several are real bugs that would block a clean release.

1. **Install the PWA on Android Chrome** and capture screenshots into `docs/release-screenshots/android-install.png` + `…/android-home.png`. The address-bar prompt should offer "Install"; the home-screen icon should use the 512×512 PNG from the manifest.
2. **Install the PWA on Windows Chrome** and capture screenshots into `docs/release-screenshots/windows-install.png` + `…/windows-home.png`. The address-bar "Install" icon should produce a desktop shortcut + standalone window.
3. **Tag v0.1.0 with your GPG key.** Exact invocation (also in `RELEASE.md`):

   ```sh
   git tag -s v0.1.0 -m "v0.1.0 — first release"
   git push origin v0.1.0
   ```

   The release-notes outline (feature surface, shipped backends, deferred items) is in `RELEASE.md` under "Tag the release".

4. **Post-release housekeeping** once the tag is pushed: bump `package.json` to `0.2.0-dev` and open a v0.2 milestone covering the deferred items (remote backends, recurring tasks, `dueDateTime`, custom themes). Outline in `RELEASE.md` § Post-release.

## Open questions / blockers

None.

## How to resume

1. Read `design-input.md`, `plan.md`, this file.
2. Run `git log --oneline -20` and `git status`.
3. Find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin. If resuming inside Phase 12, pick any step that's still un-ticked — they're independent.
