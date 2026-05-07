/**
 * Placeholder route surface. Renders the home heading so `App` has
 * something visible behind the provider chain. Step 4.2 replaces this
 * with a real switch over `ViewState`.
 */
import type { ReactNode } from 'react';

import { useT } from './i18n/provider.js';

export function Routes(): ReactNode {
  const t = useT();
  return (
    <main>
      <h1>{t('app.home.heading')}</h1>
      <p>{t('app.home.placeholder')}</p>
    </main>
  );
}
