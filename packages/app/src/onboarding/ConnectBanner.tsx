/**
 * `<ConnectBanner />` — dismissible suggestion to connect Google Tasks
 * or Microsoft To-Do for cross-device sync. Visibility persists across
 * reloads via a meta-store flag.
 *
 * State machine:
 *  - `loading`   : the dismissed-flag read is in flight; render nothing
 *                  to avoid a flash of banner content the user already
 *                  dismissed.
 *  - `visible`   : flag absent → show the banner.
 *  - `dismissed` : flag present (set on click, or already persisted) →
 *                  render nothing.
 *
 * The CTA is intentionally just "Dismiss" until view4 (Options /
 * Backends panel) lands in phase 9; at that point the banner can grow
 * a "Connect" button that navigates to that panel.
 */
import { Button } from '@emt/design-system';
import { useEffect, useState, type ReactNode } from 'react';

import { useT } from '../i18n/provider.js';
import { getBackends } from '../state/backends.js';

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

  return (
    <div role="region" data-banner="connect" aria-label={t('app.connect.banner.label')}>
      <span>{t('app.connect.banner.message')}</span>
      <Button variant="text" onClick={dismiss}>
        {t('app.connect.banner.dismiss')}
      </Button>
    </div>
  );
}
