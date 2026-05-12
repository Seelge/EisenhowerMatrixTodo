/**
 * Build-info constants injected by Vite at build time (Step 9.7).
 *
 * `vite.config.ts` defines three compile-time literals:
 *  - `__EMT_VERSION__`: package.json `version`.
 *  - `__EMT_COMMIT_SHA__`: `git rev-parse HEAD` or `GITHUB_SHA` /
 *    `VITE_GIT_SHA` env override.
 *  - `__EMT_BUILD_TIME__`: ISO timestamp at build time.
 *
 * Dev runs without an explicit `git rev-parse` fall back to
 * `"unknown"` so the About panel still renders sanely.
 */
declare const __EMT_VERSION__: string;
declare const __EMT_COMMIT_SHA__: string;
declare const __EMT_BUILD_TIME__: string;

export interface BuildInfo {
  readonly version: string;
  readonly commitSha: string;
  readonly buildTime: string;
}

export function getBuildInfo(): BuildInfo {
  return {
    version: typeof __EMT_VERSION__ === 'string' ? __EMT_VERSION__ : '0.0.0',
    commitSha: typeof __EMT_COMMIT_SHA__ === 'string' ? __EMT_COMMIT_SHA__ : 'unknown',
    buildTime: typeof __EMT_BUILD_TIME__ === 'string' ? __EMT_BUILD_TIME__ : '',
  };
}
