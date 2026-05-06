/**
 * ResponsiveSurface — picks `<SidePanel>` (≥ breakpoint) or `<Sheet>`
 * (below) by viewport width. Default breakpoint 768 px.
 *
 * Subscribes to the matchMedia change event so the surface flips live
 * if the viewport is resized across the breakpoint (e.g., a tablet
 * rotated). Both branches share the same dialog API: `open`, `onClose`,
 * `aria-label`, children.
 */
import { useSyncExternalStore, type ReactNode } from 'react';

import { Sheet } from './Sheet.js';
import { SidePanel } from './SidePanel.js';

export interface ResponsiveSurfaceProps {
  open: boolean;
  onClose: () => void;
  'aria-label': string;
  children?: ReactNode;
  /** Min viewport width (in px) at which the side panel is used. Defaults to 768. */
  breakpoint?: number;
}

function subscribe(query: string, callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mq = window.matchMedia(query);
  mq.addEventListener('change', callback);
  return () => mq.removeEventListener('change', callback);
}

function getSnapshot(query: string): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia(query).matches;
}

function useMatchMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => subscribe(query, cb),
    () => getSnapshot(query),
    () => false,
  );
}

export function ResponsiveSurface({
  breakpoint = 768,
  ...rest
}: ResponsiveSurfaceProps): ReactNode {
  const isWide = useMatchMedia(`(min-width: ${breakpoint}px)`);
  return isWide ? <SidePanel {...rest} /> : <Sheet {...rest} />;
}
