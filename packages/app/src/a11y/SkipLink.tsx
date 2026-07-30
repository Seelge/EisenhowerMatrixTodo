/**
 * Skip-to-content link for keyboard users (Phase 26 / a11y audit).
 * Visually hidden until focused; targets `#emt-main` on matrix,
 * quadrant, and options shells.
 */
import type { ReactNode } from 'react';

import { useT } from '../i18n/provider.js';

import './skip-link.css';

export function SkipLink(): ReactNode {
  const t = useT();
  return (
    <a className="emt-skip-link" href="#emt-main" data-action="skip-to-content">
      {t('app.a11y.skipToContent')}
    </a>
  );
}
