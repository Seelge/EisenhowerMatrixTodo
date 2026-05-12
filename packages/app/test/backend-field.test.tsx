/**
 * Step 8.6 — BackendField behavior.
 *
 * "Done when":
 *  - Migration success: target adapter holds the new task; view3
 *    stays open under the new `backendId` (asserted via the
 *    view-state store carrying the freshly-issued target task id).
 *  - Target-create failure: the inline error banner appears; the
 *    source backend still holds the original task; the URL is not
 *    rewritten.
 *  - Partial failure (source-delete after target-create succeeded):
 *    the migration is logically committed (target task exists, URL
 *    flips), AND the warning snackbar fires.
 *
 * Two backends are seeded by registering an extra in-memory adapter
 * into the running registry. The fake "remote" carries an id /
 * displayName distinct from the local IDB adapter so the dropdown
 * surfaces both rows.
 */
import 'fake-indexeddb/auto';
import type { BackendId, Task, TaskDraft } from '@emt/backend-core';
import { InMemoryAdapter } from '@emt/backend-inmemory';
import { SnackbarProvider } from '@emt/design-system';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import { BackendField } from '../src/views/task/BackendField.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'Task',
  notes: '',
  priority: 'normal',
  quadrant: 'Q2',
  status: 'open',
  tags: [],
};

async function seedTwoBackendsAndTask(): Promise<{
  task: Task;
  localId: BackendId;
  remoteId: BackendId;
  remote: InMemoryAdapter;
}> {
  const { registry } = await getBackends();
  const local = registry.list()[0]!;
  const localId = local.describe().id;

  const remote = new InMemoryAdapter({ id: 'remote', displayName: 'Remote' });
  registry.register(remote);
  const remoteId = remote.describe().id;

  const task = await local.create(DRAFT);
  return { task, localId, remoteId, remote };
}

async function waitForAsync(
  check: () => Promise<boolean> | boolean,
  timeoutMs = 2000,
): Promise<void> {
  const start = Date.now();
  while (!(await check())) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

function changeSelect(select: HTMLSelectElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  setter?.call(select, value);
  select.dispatchEvent(new Event('change', { bubbles: true }));
}

function wrap(node: React.ReactNode): React.ReactNode {
  return (
    <I18nProvider>
      <SnackbarProvider>{node}</SnackbarProvider>
    </I18nProvider>
  );
}

describe('BackendField — Step 8.6', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    // Reset the view-state URL so test cross-talk on `focusedTaskId`
    // doesn't bleed across cases.
    window.history.replaceState(null, '', '/');
    useViewStateStore.getState().syncFromUrl();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
  });

  it('lists registered backends and preselects the task backend', async () => {
    const { task, localId, remoteId } = await seedTwoBackendsAndTask();
    const { container, unmount } = await renderWithQueryClient(wrap(<BackendField task={task} />));
    teardown = unmount;
    // The effect runs synchronously enough that options are populated
    // by the next paint; wait if needed.
    await waitForAsync(() => container.querySelectorAll('option').length === 2);
    const select = container.querySelector<HTMLSelectElement>('[data-field="backend"]')!;
    expect(select.value).toBe(localId);
    const values = Array.from(select.options).map((o) => o.value);
    expect(values).toContain(localId);
    expect(values).toContain(remoteId);
  });

  it('success path: target adapter holds the new task and view-state flips focusedTaskId', async () => {
    const { task, remote, remoteId } = await seedTwoBackendsAndTask();
    // Open view3 over the original task so the store has a focusedTaskId
    // we can observe flipping.
    useViewStateStore.getState().replace({ zoom: 'matrix', focusedTaskId: task.id });

    const { container, unmount } = await renderWithQueryClient(wrap(<BackendField task={task} />));
    teardown = unmount;
    await waitForAsync(() => container.querySelectorAll('option').length === 2);
    const select = container.querySelector<HTMLSelectElement>('[data-field="backend"]')!;

    await act(async () => {
      changeSelect(select, remoteId);
    });

    await waitForAsync(async () => (await remote.list()).length > 0);
    const remoteTasks = await remote.list();
    expect(remoteTasks).toHaveLength(1);
    expect(remoteTasks[0]?.title).toBe(task.title);

    // URL focusedTaskId rewritten to the new target task id.
    await waitForAsync(
      () => useViewStateStore.getState().state.focusedTaskId === remoteTasks[0]?.id,
    );
  });

  it('target-create failure: error banner appears and the source is untouched', async () => {
    const { task, remote, remoteId } = await seedTwoBackendsAndTask();
    const { registry } = await getBackends();
    const local = registry.list()[0]!;
    vi.spyOn(remote, 'create').mockRejectedValue(new Error('boom'));

    const { container, unmount } = await renderWithQueryClient(wrap(<BackendField task={task} />));
    teardown = unmount;
    await waitForAsync(() => container.querySelectorAll('option').length === 2);
    const select = container.querySelector<HTMLSelectElement>('[data-field="backend"]')!;

    await act(async () => {
      changeSelect(select, remoteId);
    });

    await waitForAsync(() => container.querySelector('[role="alert"]') !== null);
    expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/migrate/i);

    // Source still has the task; remote has nothing.
    expect(await local.get(task.id)).toBeDefined();
    expect(await remote.list()).toHaveLength(0);
  });

  it('partial failure: target holds the task, view-state flips, snackbar warns', async () => {
    const { task, remote, remoteId } = await seedTwoBackendsAndTask();
    const { registry } = await getBackends();
    const local = registry.list()[0]!;
    vi.spyOn(local, 'delete').mockRejectedValue(new Error('source delete refused'));
    useViewStateStore.getState().replace({ zoom: 'matrix', focusedTaskId: task.id });

    const { container, unmount } = await renderWithQueryClient(wrap(<BackendField task={task} />));
    teardown = unmount;
    await waitForAsync(() => container.querySelectorAll('option').length === 2);
    const select = container.querySelector<HTMLSelectElement>('[data-field="backend"]')!;

    await act(async () => {
      changeSelect(select, remoteId);
    });

    await waitForAsync(async () => (await remote.list()).length > 0);
    const remoteTasks = await remote.list();
    expect(remoteTasks).toHaveLength(1);

    // URL still flips to the new id — migration is logically committed.
    await waitForAsync(
      () => useViewStateStore.getState().state.focusedTaskId === remoteTasks[0]?.id,
    );

    // Snackbar appears with a "lingered" warning. The provider renders
    // `Snackbar` inside the same tree, so query the container.
    await waitForAsync(() => /lingered/i.test(container.textContent ?? ''));
  });
});
