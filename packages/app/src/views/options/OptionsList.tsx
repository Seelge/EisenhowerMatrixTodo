/**
 * OptionsList — group index for view4 (Step 9.1).
 *
 * Renders a button per group; clicking pushes `/options/:group`
 * via the parent's `onSelect` callback (which routes through the
 * view-state store's `navigateRaw` so browser back/forward work).
 */
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';

import { OPTIONS_GROUPS, type OptionsGroup } from './options-routing.js';

export interface OptionsListProps {
  onSelect: (group: OptionsGroup) => void;
}

const TITLE_KEY: Record<OptionsGroup, StringKey> = {
  backends: 'app.options.group.backends',
  account: 'app.options.group.account',
  appearance: 'app.options.group.appearance',
  defaults: 'app.options.group.defaults',
  tags: 'app.options.group.tags',
  data: 'app.options.group.data',
  about: 'app.options.group.about',
};

const SUMMARY_KEY: Record<OptionsGroup, StringKey> = {
  backends: 'app.options.group.backends.summary',
  account: 'app.options.group.account.summary',
  appearance: 'app.options.group.appearance.summary',
  defaults: 'app.options.group.defaults.summary',
  tags: 'app.options.group.tags.summary',
  data: 'app.options.group.data.summary',
  about: 'app.options.group.about.summary',
};

export function OptionsList({ onSelect }: OptionsListProps): ReactNode {
  const t = useT();
  return (
    <ul className="emt-options__list" data-options-list="">
      {OPTIONS_GROUPS.map((group) => (
        <li key={group} className="emt-options__list-item">
          <button
            type="button"
            className="emt-options__list-button"
            data-options-group={group}
            onClick={() => onSelect(group)}
          >
            <span className="emt-options__list-title">{t(TITLE_KEY[group])}</span>
            <span className="emt-options__list-summary">{t(SUMMARY_KEY[group])}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
