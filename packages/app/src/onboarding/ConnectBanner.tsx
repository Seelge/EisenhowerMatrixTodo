/**
 * `<ConnectBanner />` — dismissible hint pointing at Options → Backends.
 * Visibility persists across reloads via a meta-store flag.
 *
 * State machine:
 *  - `loading`   : the dismissed-flag read is in flight; render nothing
 *                  to avoid a flash of banner content the user already
 *                  dismissed.
 *  - `visible`   : flag absent → show the banner.
 *  - `dismissed` : flag present (set on click, or already persisted) →
 *                  render nothing.
 *
 * "Open Backends" navigates to `/options/backends` (remote adapters are
 * still placeholders; the panel is the honest destination).
 */
import { Button } from '@emt/design-system';
import { useEffect, useState, type ReactNode } from 'react';

import { useT } from '../i18n/provider.js';
import { getBackends } from '../state/backends.js';
import { useViewStateStore } from '../state/view-state.js';
import { optionsGroupPath } from '../views/options/options-routing.js';

import './connect-banner.css';

/** Meta key under which the banner-dismissed flag is persisted. */
export const META_CONNECT_BANNER_DISMISSED_KEY = 'connectBannerDismissed';

type Visibility = 'loading' | 'visible' | 'dismissed';

export function ConnectBanner(): ReactNode {
  const t = useT();
  const [visibility, setVisibility] = useState<Visibility>('loading');

  useEffect(() => {
    let cancelled = false;
    void getBackends()
      .then(({ meta }) => meta.get(META_CONNECT_BANNER_DISMISSED_KEY))
      .then((value) => {
        if (cancelled) return;
        setVisibility(value === 'true' ? 'dismissed' : 'visible');
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (visibility !== 'visible') return null;

  const dismiss = (): void => {
    setVisibility('dismissed');
    void getBackends().then(({ meta }) => meta.set(META_CONNECT_BANNER_DISMISSED_KEY, 'true'));
  };

  const openBackends = (): void => {
    useViewStateStore.getState().navigateRaw(optionsGroupPath('backends'));
  };

  return (
    <div
      role="region"
      className="emt-connect-banner"
      data-banner="connect"
      aria-label={t('app.connect.banner.label')}
    >
      <span className="emt-connect-banner__message">{t('app.connect.banner.message')}</span>
      <div className="emt-connect-banner__actions">
        <Button variant="filled" data-action="connect-backends" onClick={openBackends}>
          {t('app.connect.banner.connect')}
        </Button>
        <Button variant="text" data-action="connect-dismiss" onClick={dismiss}>
          {t('app.connect.banner.dismiss')}
        </Button>
      </div>
    </div>
  );
}
