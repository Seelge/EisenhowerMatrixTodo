# Status

Live handoff document for cross-session continuity. Updated at the start and end of every session.

## Current activity

**Phase:** Implementation.

**In progress:** Step 11.6 — Release checklist & GitHub Pages live (closes Phase 11). Autonomous portion complete:

- Live URL: <https://seelge.github.io/EisenhowerMatrixTodo/> (the `Deploy` workflow publishes on every push to `main`).
- Lighthouse against the live site (modern Lighthouse ≥ 12 has dropped the dedicated PWA category — installability now lives inside Best Practices): Performance 88, Accessibility 91, Best Practices 96, SEO 90. PWA installability is also re-verified by the e2e suite (`pwa.spec.ts` + `pwa-offline.spec.ts`, both green in CI).
- `RELEASE.md` scaffold landed with the checklist, scores, live URL, and the exact `git tag -s v0.1.0 …` invocation.

Remaining work is user-driven — see **Pending external actions** below.

**Last completed:** Step 11.5 — PWA install + offline e2e. `packages/app/e2e/pwa-offline.spec.ts` covers the offline loop within one page session: confirm a seed task online; `setOffline(true)` + reload → shell + seed task survive; create a task while offline → it lands in Q2 directly via the local IDB adapter; reconnect → page still healthy, offline-created task remains. Outbox-flush-on-reconnect is a no-op at v0.1 (only the local backend is registered). CI run `25823960061` + Deploy `25823963195` green on `main`.

Earlier history lives in `git log --oneline` and the ✅ markers on `plan.md` step headings.

## Environment notes

- Node 24.15.0 installed via fnm (binary at `~/.local/bin/fnm`, manager dir `~/.local/share/fnm`). fnm init appended to `~/.zshrc` and `~/.bashrc` so future shells pick it up automatically.
- pnpm 10.33.2 activated via Corepack and pinned in root `package.json` `packageManager`.
- Repo pins Node major in `.node-version` (`24`).

## Pending external actions (user)

The following items are required to fully close **Step 11.6** in `plan.md` (Release checklist & GitHub Pages live) and ship v0.1:

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
3. Find the next un-checked step in `plan.md` (or whatever the most recent commit subject points at) and begin.
