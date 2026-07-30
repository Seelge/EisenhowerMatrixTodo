/**
 * SearchButton — shell entry into the in-app search overlay (TODO 6).
 *
 * Sits next to the Settings gear on view1/view2. Positioning is owned
 * by the call-site class (`.emt-matrix__search` / `.emt-quadrant__search`).
 */
import { IconButton } from '@emt/design-system';
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';

import { useSearchStore } from './search-store.js';

export interface SearchButtonProps {
  className?: string;
}

export function SearchButton({ className }: SearchButtonProps): ReactNode {
  const t = useT();
  return (
    <IconButton
      type="button"
      className={className}
      data-action="open-search"
      aria-label={t('app.search.open')}
      onClick={() => useSearchStore.getState().openSearch()}
    >
      <SearchIcon />
    </IconButton>
  );
}

function SearchIcon(): ReactNode {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M15.5 14h-.79l-.28-.27A6.47 6.47 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
    </svg>
  );
}
