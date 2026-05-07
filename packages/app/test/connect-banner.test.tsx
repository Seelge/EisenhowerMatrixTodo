/**
 * Tests for the connect-banner. Verifies the loading→visible transition
 * after the dismissed-flag read resolves, the dismiss action persists,
 * and a remount with the flag already set renders nothing.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { act, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { strings } from '../src/i18n/strings.en.ts';
import {
  ConnectBanner,
  META_CONNECT_BANNER_DISMISSED_KEY,
} from '../src/onboarding/ConnectBanner.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';

import { renderToContainer } from './render.ts';

function freshIdb(): void {
  globalThis.indexedDB = new IDBFactory();
}

async function waitFor(check: () => boolean | Promise<boolean>, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

function Wrapped({ children }: { children: ReactNode }): ReactNode {
  return <I18nProvider>{children}</I18nProvider>;
}

describe('<ConnectBanner />', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    freshIdb();
    __resetBackendsCacheForTesting();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
  });

  it('appears on first run and disappears after Dismiss is clicked', async () => {
    const { container, unmount } = await renderToContainer(
      <Wrapped>
        <ConnectBanner />
      </Wrapped>,
    );
    teardown = unmount;

    // Loading state: empty until the dismissed-flag read resolves.
    expect(container.querySelector('[data-banner="connect"]')).toBeNull();
    await waitFor(() => container.querySelector('[data-banner="connect"]') !== null);

    expect(container.textContent).toContain(strings['app.connect.banner.message']);

    const dismissBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent === strings['app.connect.banner.dismiss'],
    );
    expect(dismissBtn).toBeDefined();

    await act(async () => {
      dismissBtn!.click();
    });

    expect(container.querySelector('[data-banner="connect"]')).toBeNull();

    // Persisted: the meta flag is set so a remount stays hidden.
    const { meta } = await getBackends();
    await waitFor(async () => (await meta.get(META_CONNECT_BANNER_DISMISSED_KEY)) === 'true');
  });

  it('a remount with the flag already set renders nothing visible', async () => {
    const { meta } = await getBackends();
    await meta.set(META_CONNECT_BANNER_DISMISSED_KEY, 'true');

    const { container, unmount } = await renderToContainer(
      <Wrapped>
        <ConnectBanner />
      </Wrapped>,
    );
    teardown = unmount;

    // Give the async meta read a chance to resolve. Even after it does,
    // the banner stays hidden because the flag is set.
    await new Promise((r) => setTimeout(r, 50));
    expect(container.querySelector('[data-banner="connect"]')).toBeNull();
  });
});
