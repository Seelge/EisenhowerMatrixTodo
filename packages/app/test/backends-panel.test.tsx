/**
 * Step 9.2 — BackendsPanel.
 *
 * "Done when":
 *  - Default selection persists across remounts: clicking the radio
 *    invokes `registry.setDefault` (which the registry stores in the
 *    shared meta), and reopening the panel pre-selects that backend.
 *  - The UI surfaces a last-sync label for the local backend; the
 *    "Coming later" Google / Microsoft placeholder rows are present
 *    and their Connect buttons are disabled.
 */
import 'fake-indexeddb/auto';
import { InMemoryAdapter } from '@emt/backend-inmemory';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { BackendsPanel } from '../src/views/options/BackendsPanel.tsx';

import { renderWithQueryClient } from './query-render.tsx';

async function waitForAsync(
  check: () => Promise<boolean> | boolean,
  timeoutMs = 1500,
): Promise<void> {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('BackendsPanel — Step 9.2', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
  });

  it('lists registered backends, the future placeholders, and the local last-sync label', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <BackendsPanel />
      </I18nProvider>,
    );
    teardown = unmount;
    await waitForAsync(
      () => container.querySelectorAll('[data-list="backends-active"] li').length > 0,
    );

    expect(container.querySelectorAll('[data-list="backends-active"] li')).toHaveLength(1);
    expect(container.querySelectorAll('[data-list="backends-future"] li')).toHaveLength(2);

    // Local backend's last-sync label is the "Always in sync" string.
    expect(container.textContent).toMatch(/always in sync/i);

    // Future rows render disabled Connect buttons.
    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-list="backends-future"] button'),
    );
    expect(buttons).toHaveLength(2);
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });

  it('selecting a different default persists across re-mounts', async () => {
    // Register a second backend so there are two radio choices.
    const { registry } = await getBackends();
    const remote = new InMemoryAdapter({ id: 'remote', displayName: 'Remote' });
    registry.register(remote);

    const first = await renderWithQueryClient(
      <I18nProvider>
        <BackendsPanel />
      </I18nProvider>,
    );
    teardown = first.unmount;
    await waitForAsync(
      () => first.container.querySelectorAll('input[name="default-backend"]').length === 2,
    );

    const remoteRadio = first.container.querySelector<HTMLInputElement>(
      'input[name="default-backend"][value="remote"]',
    )!;
    expect(remoteRadio.checked).toBe(false);

    await act(async () => {
      remoteRadio.click();
    });
    await waitForAsync(() => remoteRadio.checked);

    // Re-read defaultId from the registry — that is what persists, not
    // the React component state.
    expect(registry.getDefault()?.describe().id).toBe('remote');

    first.unmount();
    teardown = undefined;

    // Re-mount the panel; the second render should pre-select Remote.
    const second = await renderWithQueryClient(
      <I18nProvider>
        <BackendsPanel />
      </I18nProvider>,
    );
    teardown = second.unmount;
    await waitForAsync(
      () =>
        second.container.querySelector<HTMLInputElement>(
          'input[name="default-backend"][value="remote"]',
        )?.checked === true,
    );
  });
});
