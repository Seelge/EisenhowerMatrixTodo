/**
 * AboutPanel — view4 / About group (Step 9.7 + Phase 20).
 *
 * Renders the build info Vite injected at compile time (see
 * `src/build-info.ts`): version, commit SHA, build timestamp.
 * Also links to the source-of-truth GitHub repo and lists keyboard
 * shortcuts so power-user hotkeys stay discoverable.
 *
 * Falls back to `"unknown"` for the SHA when neither
 * `git rev-parse HEAD` nor the `GITHUB_SHA` / `VITE_GIT_SHA`
 * env override is available — dev runs in a non-git container
 * still render sanely.
 */
import type { ReactNode } from 'react';

import { getBuildInfo } from '../../build-info.js';
import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';

const SOURCE_URL = 'https://github.com/Seelge/EisenhowerMatrixTodo';

const SHORTCUTS: readonly { readonly keys: string; readonly labelKey: StringKey }[] = [
  { keys: 'n', labelKey: 'app.options.about.shortcut.new' },
  { keys: '/ · Ctrl+K', labelKey: 'app.options.about.shortcut.search' },
  { keys: 'Enter', labelKey: 'app.options.about.shortcut.zoomIn' },
  { keys: 'Esc', labelKey: 'app.options.about.shortcut.zoomOut' },
  { keys: '+ / −', labelKey: 'app.options.about.shortcut.zoomKeys' },
  { keys: '← ↑ → ↓', labelKey: 'app.options.about.shortcut.arrows' },
  { keys: 'Space', labelKey: 'app.options.about.shortcut.drag' },
];

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
      <section
        className="emt-about-panel__shortcuts"
        data-section="shortcuts"
        aria-labelledby="emt-about-shortcuts-heading"
      >
        <h3 id="emt-about-shortcuts-heading" className="emt-about-panel__shortcuts-heading">
          {t('app.options.about.shortcuts')}
        </h3>
        <p className="emt-about-panel__shortcuts-note">{t('app.options.about.shortcuts.note')}</p>
        <ul className="emt-about-panel__shortcut-list">
          {SHORTCUTS.map((row) => (
            <li key={row.keys} className="emt-about-panel__shortcut-row">
              <kbd className="emt-about-panel__kbd">{row.keys}</kbd>
              <span className="emt-about-panel__shortcut-label">{t(row.labelKey)}</span>
            </li>
          ))}
        </ul>
      </section>
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
