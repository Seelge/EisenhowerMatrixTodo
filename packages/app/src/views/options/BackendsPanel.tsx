/**
 * BackendsPanel — view4 / Backends group (Step 9.2).
 *
 * Lists registered backends with:
 *  - default-backend radio (`registry.setDefault(id)`); the selection
 *    persists across reloads via the meta store the registry was
 *    constructed with.
 *  - per-row "last sync" status. The local IDB backend writes
 *    directly with no sync-engine flush/pull, so its label is the
 *    "Always (local writes are direct)" string. Remote backends'
 *    cursor / timestamp wiring lands when their adapters do.
 *  - placeholder rows for Google Tasks and Microsoft To-Do labelled
 *    "Coming later" so the surface previews the eventual shape; the
 *    Connect actions are present but disabled.
 */
import type { BackendDescriptor, BackendId } from '@emt/backend-core';
import { Button } from '@emt/design-system';
import { useEffect, useState, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { getBackends } from '../../state/backends.js';

interface PanelState {
  readonly backends: readonly BackendDescriptor[];
  readonly defaultId: BackendId | undefined;
}

const FUTURE_BACKENDS: readonly { id: string; nameKey: StringKey }[] = [
  { id: 'google', nameKey: 'app.options.backends.future.google' },
  { id: 'microsoft', nameKey: 'app.options.backends.future.microsoft' },
];

export function BackendsPanel(): ReactNode {
  const t = useT();
  const [panel, setPanel] = useState<PanelState>({ backends: [], defaultId: undefined });

  const refresh = (): Promise<void> =>
    getBackends().then(({ registry }) => {
      setPanel({
        backends: registry.list().map((adapter) => adapter.describe()),
        defaultId: registry.getDefault()?.describe().id,
      });
    });

  useEffect(() => {
    let active = true;
    void getBackends().then(({ registry }) => {
      if (!active) return;
      setPanel({
        backends: registry.list().map((adapter) => adapter.describe()),
        defaultId: registry.getDefault()?.describe().id,
      });
    });
    return () => {
      active = false;
    };
  }, []);

  const onSelectDefault = async (id: BackendId): Promise<void> => {
    const { registry } = await getBackends();
    await registry.setDefault(id);
    await refresh();
  };

  return (
    <div className="emt-backends-panel" data-options-panel="backends" data-options-group="backends">
      <ul className="emt-backends-panel__list" data-list="backends-active">
        {panel.backends.map((b) => {
          const isDefault = panel.defaultId === b.id;
          return (
            <li key={b.id} className="emt-backends-panel__row" data-backend-id={b.id}>
              <label className="emt-backends-panel__radio">
                <input
                  type="radio"
                  name="default-backend"
                  value={b.id}
                  checked={isDefault}
                  onChange={() => {
                    void onSelectDefault(b.id);
                  }}
                  data-field="default-backend"
                />
                <span>{b.displayName}</span>
              </label>
              <span className="emt-backends-panel__status" data-status="last-sync">
                {t('app.options.backends.lastSync.local')}
              </span>
            </li>
          );
        })}
      </ul>
      <ul className="emt-backends-panel__list" data-list="backends-future">
        {FUTURE_BACKENDS.map((f) => (
          <li
            key={f.id}
            className="emt-backends-panel__row emt-backends-panel__row--future"
            data-backend-id={f.id}
          >
            <span className="emt-backends-panel__name">{t(f.nameKey)}</span>
            <Button variant="tonal" disabled>
              {t('app.options.backends.connect')}
            </Button>
            <span className="emt-backends-panel__status">
              {t('app.options.backends.comingLater')}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
