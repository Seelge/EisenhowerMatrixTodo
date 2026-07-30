/**
 * Global hotkey: `n` opens QuickComposer when not typing (Phase 17).
 * Mirrors SearchHotkeys; skipped on Options routes and while search is open.
 */
import { useEffect, type ReactNode } from 'react';

import { useViewStateStore } from '../../state/view-state.js';
import { isOptionsPath } from '../options/options-routing.js';
import { useSearchStore } from '../search/search-store.js';
import { isTextEditingTarget } from '../zoom/keyboard.js';

import { useComposerStore } from './composer-store.js';

export function ComposerHotkeys(): ReactNode {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent): void => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isTextEditingTarget(e.target)) return;
      if (useComposerStore.getState().open) return;
      if (useSearchStore.getState().open) return;
      const path = useViewStateStore.getState().internalPath;
      if (isOptionsPath(path)) return;
      // Don't stack over the task sheet.
      if (useViewStateStore.getState().state.focusedTaskId !== undefined) return;
      e.preventDefault();
      useComposerStore.getState().openComposer();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);
  return null;
}
