/**
 * useFieldSupport — does the active backend natively round-trip this
 * field? (Step 8.7.)
 *
 * Reads `BackendCapabilities` from the registered adapter and returns
 * `true` (supported) or `false` (will be encoded into `notes` by the
 * adapter on write per `design-input.md`). The hook resolves
 * asynchronously because `getBackends()` is async; until the first
 * resolution it returns `true` so the UI defaults to "no hint" rather
 * than flashing one for a frame.
 *
 * `useTask`'s `backendId` is the cache key — the hook also re-resolves
 * if the task migrates to a different backend (Step 8.6).
 */
import type { BackendCapabilities, BackendId } from '@emt/backend-core';
import { useEffect, useState } from 'react';

import { getBackends } from '../../state/backends.js';

export type FieldCapability = keyof BackendCapabilities;

export function useFieldSupport(backendId: BackendId, capability: FieldCapability): boolean {
  const [supported, setSupported] = useState(true);

  useEffect(() => {
    let active = true;
    void getBackends().then(({ registry }) => {
      if (!active) return;
      const adapter = registry.get(backendId);
      if (adapter === undefined) {
        setSupported(true);
        return;
      }
      setSupported(adapter.describe().capabilities[capability]);
    });
    return () => {
      active = false;
    };
  }, [backendId, capability]);

  return supported;
}
