/**
 * OptionsView — root surface for view4 (Step 9.1).
 *
 * Dispatches between the group list (`/options`) and the per-group
 * panel (`/options/:group`) based on `useInternalPath()`. Group
 * panels mount as placeholder shells in this step; subsequent
 * Phase-9 steps fill them in (Backends, Account, Appearance,
 * Defaults, Data, About).
 *
 * Browser back/forward works for free: navigation between groups
 * uses `useViewStateStore.navigateRaw(...)`, which pushes history;
 * `popstate` re-syncs the store via the existing Router listener.
 */
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useInternalPath, useViewStateStore } from '../../state/view-state.js';

import { AccountPanel } from './AccountPanel.js';
import { AppearancePanel } from './AppearancePanel.js';
import { BackendsPanel } from './BackendsPanel.js';
import { DataPanel } from './DataPanel.js';
import { DefaultsPanel } from './DefaultsPanel.js';
import {
  OPTIONS_INDEX_PATH,
  optionsGroupPath,
  parseOptionsGroup,
  type OptionsGroup,
} from './options-routing.js';
import { OptionsList } from './OptionsList.js';
import './options-view.css';

const GROUP_TITLE_KEY: Record<OptionsGroup, StringKey> = {
  backends: 'app.options.group.backends',
  account: 'app.options.group.account',
  appearance: 'app.options.group.appearance',
  defaults: 'app.options.group.defaults',
  data: 'app.options.group.data',
  about: 'app.options.group.about',
};

export function OptionsView(): ReactNode {
  const t = useT();
  const internalPath = useInternalPath();
  const group = parseOptionsGroup(internalPath);

  const back = (): void => {
    useViewStateStore.getState().navigateRaw(OPTIONS_INDEX_PATH);
  };

  return (
    <section className="emt-options" data-view="options">
      <header className="emt-options__header">
        {group === undefined ? (
          <h1 className="emt-options__heading">{t('app.options.heading')}</h1>
        ) : (
          <>
            <button
              type="button"
              className="emt-options__back"
              onClick={back}
              data-action="options-back"
              aria-label={t('app.options.back')}
            >
              ←
            </button>
            <h1 className="emt-options__heading">{t(GROUP_TITLE_KEY[group])}</h1>
          </>
        )}
      </header>
      {group === undefined ? (
        <OptionsList
          onSelect={(g) => useViewStateStore.getState().navigateRaw(optionsGroupPath(g))}
        />
      ) : (
        <GroupPanel group={group} />
      )}
    </section>
  );
}

function GroupPanel({ group }: { group: OptionsGroup }): ReactNode {
  const t = useT();
  if (group === 'backends') {
    return <BackendsPanel />;
  }
  if (group === 'account') {
    return <AccountPanel />;
  }
  if (group === 'appearance') {
    return <AppearancePanel />;
  }
  if (group === 'defaults') {
    return <DefaultsPanel />;
  }
  if (group === 'data') {
    return <DataPanel />;
  }
  // Steps 9.3–9.7 fill the remaining groups in.
  return (
    <div className="emt-options__panel" data-options-group={group}>
      <p className="emt-options__panel-stub">{t('app.options.panel.placeholder')}</p>
    </div>
  );
}
