/**
 * Step 9.3 — AccountPanel for the local-only state.
 *
 * "Done when": UI renders correctly for the local-only state — one
 * active row (the local backend, no account required), two disabled
 * future-backend rows.
 */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting } from '../src/state/backends.ts';
import { AccountPanel } from '../src/views/options/AccountPanel.tsx';

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

describe('AccountPanel — Step 9.3', () => {
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

  it('renders one active row with informational copy and two future placeholders', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <AccountPanel />
      </I18nProvider>,
    );
    teardown = unmount;
    await waitForAsync(
      () => container.querySelectorAll('[data-list="accounts-active"] li').length > 0,
    );
    expect(container.querySelectorAll('[data-list="accounts-active"] li')).toHaveLength(1);
    expect(container.querySelectorAll('[data-list="accounts-future"] li')).toHaveLength(2);
    expect(container.textContent).toMatch(/no account/i);

    const buttons = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-list="accounts-future"] button'),
    );
    expect(buttons).toHaveLength(2);
    expect(buttons.every((b) => b.disabled)).toBe(true);
  });
});
