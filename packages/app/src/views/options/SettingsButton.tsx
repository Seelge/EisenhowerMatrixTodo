/**
 * SettingsButton — shell entry point into view4 (Options).
 *
 * Step 12.11: previously the only way to reach `/options` was to type
 * the URL by hand. This wraps the design-system `IconButton` (48 × 48,
 * meets the Material touch-target spec) with a gear glyph and pushes
 * the options route via `useViewStateStore.navigateRaw` so browser
 * back/forward keep working.
 *
 * Positioning lives at the call site (`.emt-matrix__settings` /
 * `.emt-quadrant__settings`) so each shell can anchor it in its own
 * coordinate space, mirroring the FAB convention.
 */
import { IconButton } from '@emt/design-system';
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useViewStateStore } from '../../state/view-state.js';

import { OPTIONS_INDEX_PATH } from './options-routing.js';

export interface SettingsButtonProps {
  className?: string;
}

export function SettingsButton({ className }: SettingsButtonProps): ReactNode {
  const t = useT();
  const open = (): void => {
    useViewStateStore.getState().navigateRaw(OPTIONS_INDEX_PATH);
  };
  return (
    <IconButton
      type="button"
      className={className}
      data-action="open-options"
      aria-label={t('app.options.open')}
      onClick={open}
    >
      <GearIcon />
    </IconButton>
  );
}

function GearIcon(): ReactNode {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M19.43 12.98c.04-.32.07-.64.07-.98s-.03-.66-.07-.98l2.11-1.65a.5.5 0 0 0 .12-.64l-2-3.46a.5.5 0 0 0-.61-.22l-2.49 1a7.03 7.03 0 0 0-1.69-.98l-.38-2.65A.5.5 0 0 0 14 2h-4a.5.5 0 0 0-.49.42l-.38 2.65c-.61.25-1.17.58-1.69.98l-2.49-1a.5.5 0 0 0-.61.22l-2 3.46a.5.5 0 0 0 .12.64L4.57 11.02c-.04.32-.07.65-.07.98s.03.66.07.98l-2.11 1.65a.5.5 0 0 0-.12.64l2 3.46c.14.24.42.34.61.22l2.49-1c.52.4 1.08.73 1.69.98l.38 2.65c.05.24.26.42.49.42h4c.24 0 .44-.18.49-.42l.38-2.65c.61-.25 1.17-.58 1.69-.98l2.49 1c.23.09.49 0 .61-.22l2-3.46a.5.5 0 0 0-.12-.64l-2.11-1.65zM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7z" />
    </svg>
  );
}
