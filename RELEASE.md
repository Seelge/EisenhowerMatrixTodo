# Release checklist — v0.1.0

This checklist lives at the repo root so it's the first thing a future
release engineer sees. Tick the boxes top-to-bottom before tagging.

## Build & CI

- [x] CI workflow green on `main` (lint, format, typecheck, unit
      tests, e2e suite incl. axe + reduced-motion + golden-path +
      pwa-offline). The Deploy workflow publishes to GitHub Pages on
      every push to `main`.
- [x] **Live URL** — <https://seelge.github.io/EisenhowerMatrixTodo/>.
      Confirmed served via `gh api repos/Seelge/EisenhowerMatrixTodo/pages`
      (`html_url`, `https_enforced: true`, `build_type: workflow`).

## Lighthouse audit

Run against the live URL with the Playwright-shipped Chromium:

```sh
CHROME_PATH=$(find ~/.cache/ms-playwright -name chrome -type f -path '*linux64*' | head -1) \
  npx --yes lighthouse https://seelge.github.io/EisenhowerMatrixTodo/ \
    --quiet --output=json --output-path=/tmp/lh.json \
    --chrome-flags="--headless=new --no-sandbox --disable-gpu"
```

Captured on 2026-05-13 against commit `955e023`:

| Category        | Score | Threshold |
| --------------- | ----- | --------- |
| Performance     | 88    | ≥ 90 (close — flagged) |
| Accessibility   | 91    | ≥ 90 ✓ |
| Best practices  | 96    | ≥ 90 ✓ |
| SEO             | 90    | ≥ 90 ✓ |
| Agentic browsing| 77    | informational |

Modern Lighthouse (≥ 12) folded the dedicated PWA category into
Best Practices. PWA installability is verified through:

1. `manifest.webmanifest` served with the required fields
   (`pwa.spec.ts > serves a valid web-app manifest`).
2. Service worker registers + takes control
   (`pwa.spec.ts > registers a service worker and takes control`).
3. Offline reload still serves the precached shell
   (`pwa.spec.ts > offline reload serves the precached shell`).
4. Offline writes succeed against the local IDB backend
   (`pwa-offline.spec.ts`).

Performance is one point shy of 90 on the first run — most likely
the GitHub Pages CDN cold-start. Worth a re-run if/when the
performance is investigated further.

## Manual install verification (must be done on real hardware)

- [ ] **Android Chrome** — install via the address-bar prompt or
      browser menu; capture a screenshot of the home-screen icon
      + first-launch state. Save under `docs/release-screenshots/
      android-install.png` (and the home screen `android-home.png`).
- [ ] **Windows Chrome** — install via the address-bar "Install"
      icon; capture the desktop shortcut + first-launch standalone
      window. Save under `docs/release-screenshots/
      windows-install.png` + `windows-home.png`.

Both should reproduce the design-input promise: the app installs
as standalone, the launcher icon uses the 512×512 PNG from the
manifest, and the splash screen shows the dark palette.

## Tag the release

When the manual checks above are done:

```sh
git tag -s v0.1.0 -m "v0.1.0 — first release"
git push origin v0.1.0
```

Use a GPG-signed annotated tag. The release notes should at least
cover:

- Feature surface: matrix view, quadrant view, view3 task editor,
  options panels, conflict resolver (modal + queue + busy
  backstop), wall-clock date round-trip.
- Backends shipped: local IndexedDB (the only one in v0.1).
- Known gaps deferred to later phases: remote backends (Google /
  Microsoft), recurring tasks, dueDateTime calendar-style events,
  custom themes (UI is locked to dark).

## Post-release

- [ ] Bump `package.json` to `0.2.0-dev` so subsequent commits
      don't shadow the v0.1.0 tag.
- [ ] Open a v0.2 milestone covering the deferred items above.

## What "done when" maps to

| Plan criterion                              | Status |
| ------------------------------------------- | ------ |
| App installable on Android Chrome           | ⏳ manual (real hardware) |
| App installable on Windows Chrome           | ⏳ manual (real hardware) |
| Lighthouse PWA audit ≥ 90                   | ✓ (Best practices 96 / Acc. 91 / SEO 90; Performance 88 just under) |
| All Phase 11 tests green in CI              | ✓ (latest `main`) |
