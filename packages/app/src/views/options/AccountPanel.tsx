/**
 * AccountPanel — view4 / Account group (Step 9.3).
 *
 * Today the only registered backend is the local IDB, which has no
 * concept of an account — there's nothing to sign out of. The panel
 * therefore renders informational copy for the local row, and
 * disabled placeholder rows for Google / Microsoft until those
 * adapters ship.
 *
 * The structure mirrors `BackendsPanel` deliberately so the eventual
 * remote rows can subscribe to the same registry plumbing.
 */
import type { BackendDescriptor } from '@emt/backend-core';
import { Button } from '@emt/design-system';
import { useEffect, useState, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { getBackends } from '../../state/backends.js';

const FUTURE_BACKENDS: readonly { id: string; nameKey: StringKey }[] = [
  { id: 'google', nameKey: 'app.options.backends.future.google' },
  { id: 'microsoft', nameKey: 'app.options.backends.future.microsoft' },
];

export function AccountPanel(): ReactNode {
  const t = useT();
  const [backends, setBackends] = useState<readonly BackendDescriptor[]>([]);

  useEffect(() => {
    let active = true;
    void getBackends().then(({ registry }) => {
      if (!active) return;
      setBackends(registry.list().map((a) => a.describe()));
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="emt-account-panel" data-options-panel="account" data-options-group="account">
      <ul className="emt-account-panel__list" data-list="accounts-active">
        {backends.map((b) => (
          <li key={b.id} className="emt-account-panel__row" data-backend-id={b.id}>
            <span className="emt-account-panel__name">{b.displayName}</span>
            <span className="emt-account-panel__status" data-status="account">
              {t('app.options.account.local')}
            </span>
          </li>
        ))}
      </ul>
      <ul className="emt-account-panel__list" data-list="accounts-future">
        {FUTURE_BACKENDS.map((f) => (
          <li
            key={f.id}
            className="emt-account-panel__row emt-account-panel__row--future"
            data-backend-id={f.id}
          >
            <span className="emt-account-panel__name">{t(f.nameKey)}</span>
            <Button variant="tonal" disabled>
              {t('app.options.account.signOut')}
            </Button>
            <span className="emt-account-panel__status">
              {t('app.options.backends.comingLater')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
