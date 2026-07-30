/**
 * SyncStatusChip (TODO 3) — online/offline + conflict badge.
 */
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { useConflictStatusStore } from '../src/views/conflict/conflict-status.ts';
import { SyncStatusChip } from '../src/views/sync/SyncStatusChip.tsx';

import { renderToContainer } from './render.ts';

describe('SyncStatusChip — TODO 3', () => {
  let teardown: (() => void) | undefined;
  let online = true;

  beforeEach(() => {
    online = true;
    vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
    useConflictStatusStore.setState({ pendingCount: 0 });
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    vi.restoreAllMocks();
    useConflictStatusStore.setState({ pendingCount: 0 });
  });

  it('renders Local when online with no conflicts', async () => {
    const { container, unmount } = await renderToContainer(
      <I18nProvider>
        <SyncStatusChip />
      </I18nProvider>,
    );
    teardown = unmount;
    const chip = container.querySelector<HTMLElement>('[data-sync-status]')!;
    expect(chip.dataset['syncStatus']).toBe('local');
    expect(chip.textContent).toContain('Local');
  });

  it('renders Offline when navigator.onLine is false', async () => {
    online = false;
    const { container, unmount } = await renderToContainer(
      <I18nProvider>
        <SyncStatusChip />
      </I18nProvider>,
    );
    teardown = unmount;
    // Force a re-subscribe snapshot by dispatching the event.
    await act(async () => {
      window.dispatchEvent(new Event('offline'));
    });
    const chip = container.querySelector<HTMLElement>('[data-sync-status]')!;
    expect(chip.dataset['syncStatus']).toBe('offline');
    expect(chip.textContent).toContain('Offline');
  });

  it('renders conflict count when the resolver queue is non-empty', async () => {
    useConflictStatusStore.setState({ pendingCount: 2 });
    const { container, unmount } = await renderToContainer(
      <I18nProvider>
        <SyncStatusChip />
      </I18nProvider>,
    );
    teardown = unmount;
    const chip = container.querySelector<HTMLElement>('[data-sync-status]')!;
    expect(chip.dataset['syncStatus']).toBe('conflict');
    expect(chip.dataset['conflictCount']).toBe('2');
    expect(chip.textContent).toContain('2 conflicts');
  });
});
