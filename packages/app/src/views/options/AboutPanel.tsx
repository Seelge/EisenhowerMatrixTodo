/**
 * AboutPanel — view4 / About group (Step 9.7).
 *
 * Renders the build info Vite injected at compile time (see
 * `src/build-info.ts`): version, commit SHA, build timestamp.
 * Also links to the source-of-truth GitHub repo.
 *
 * Falls back to `"unknown"` for the SHA when neither
 * `git rev-parse HEAD` nor the `GITHUB_SHA` / `VITE_GIT_SHA`
 * env override is available — dev runs in a non-git container
 * still render sanely.
 */
import type { ReactNode } from 'react';

import { getBuildInfo } from '../../build-info.js';
import { useT } from '../../i18n/provider.js';

const SOURCE_URL = 'https://github.com/Seelge/EisenhowerMatrixTodo';

function shortSha(sha: string): string {
  return sha === 'unknown' ? sha : sha.slice(0, 7);
}

export function AboutPanel(): ReactNode {
  const t = useT();
  const info = getBuildInfo();
  return (
    <div className="emt-about-panel" data-options-panel="about" data-options-group="about">
      <dl className="emt-about-panel__list">
        <div className="emt-about-panel__row">
          <dt className="emt-about-panel__term">{t('app.options.about.version')}</dt>
          <dd className="emt-about-panel__value" data-field="version">
            {info.version}
          </dd>
        </div>
        <div className="emt-about-panel__row">
          <dt className="emt-about-panel__term">{t('app.options.about.commit')}</dt>
          <dd className="emt-about-panel__value" data-field="commit">
            <code>{shortSha(info.commitSha)}</code>
          </dd>
        </div>
        {info.buildTime !== '' && (
          <div className="emt-about-panel__row">
            <dt className="emt-about-panel__term">{t('app.options.about.builtAt')}</dt>
            <dd className="emt-about-panel__value" data-field="built-at">
              {info.buildTime}
            </dd>
          </div>
        )}
      </dl>
      <a
        className="emt-about-panel__source"
        href={SOURCE_URL}
        target="_blank"
        rel="noopener noreferrer"
        data-action="source"
      >
        {t('app.options.about.source')}
      </a>
    </div>
  );
}
