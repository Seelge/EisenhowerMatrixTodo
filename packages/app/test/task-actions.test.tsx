/**
 * Step 8.8 — TaskActions delete + undo.
 *
 * "Done when":
 *  - clicking trash → snackbar appears; `deleteTask` is NOT yet
 *    invoked. View3 closes (focusedTaskId drops out of view-state).
 *  - clicking Undo within the window → snackbar dismisses; `deleteTask`
 *    is NOT invoked; view-state's `focusedTaskId` restored.
 *  - letting the snackbar timer expire → `deleteTask` runs and the
 *    persisted task is gone.
 *
 * Tests pass a short `snackbarDuration` so the timer-expiry case
 * doesn't have to wait five real seconds.
 */
import 'fake-indexeddb/auto';
import type { Task, TaskDraft } from '@emt/backend-core';
import { SnackbarProvider } from '@emt/design-system';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { useViewStateStore } from '../src/state/view-state.ts';
import { TaskActions } from '../src/views/task/TaskActions.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'Task',
  notes: '',
  priority: 'normal',
  quadrant: 'Q2',
  status: 'open',
  tags: [],
};

async function seedTask(): Promise<Task> {
  const { registry } = await getBackends();
  const adapter = registry.list()[0]!;
  return adapter.create(DRAFT);
}

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

function wrap(node: React.ReactNode): React.ReactNode {
  return (
    <I18nProvider>
      <SnackbarProvider>{node}</SnackbarProvider>
    </I18nProvider>
  );
}

describe('TaskActions — Step 8.8', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    window.history.replaceState(null, '', '/');
    useViewStateStore.getState().syncFromUrl();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    __resetBackendsCacheForTesting();
  });

  it('clicking trash closes view3 and shows the snackbar without deleting yet', async () => {
    const task = await seedTask();
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const deleteSpy = vi.spyOn(adapter, 'delete');

    useViewStateStore.getState().replace({ zoom: 'matrix', focusedTaskId: task.id });
    expect(useViewStateStore.getState().state.focusedTaskId).toBe(task.id);

    const { container, unmount } = await renderWithQueryClient(
      wrap(<TaskActions task={task} snackbarDuration={10000} />),
    );
    teardown = unmount;
    const trash = container.querySelector<HTMLButtonElement>('[data-field="delete"]')!;

    await act(async () => {
      trash.click();
    });

    // View-state's focusedTaskId dropped immediately.
    expect(useViewStateStore.getState().state.focusedTaskId).toBeUndefined();
    // Snackbar's message appears in the same React tree (provider
    // renders Snackbar as a sibling).
    expect(container.textContent).toMatch(/task deleted/i);
    // No adapter delete yet.
    await new Promise((r) => setTimeout(r, 40));
    expect(deleteSpy).not.toHaveBeenCalled();
    // Original task still on the source.
    expect(await adapter.get(task.id)).toBeDefined();
  });

  it('clicking Undo cancels the delete and restores focusedTaskId', async () => {
    const task = await seedTask();
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const deleteSpy = vi.spyOn(adapter, 'delete');

    useViewStateStore.getState().replace({ zoom: 'matrix', focusedTaskId: task.id });

    const { container, unmount } = await renderWithQueryClient(
      wrap(<TaskActions task={task} snackbarDuration={10000} />),
    );
    teardown = unmount;
    const trash = container.querySelector<HTMLButtonElement>('[data-field="delete"]')!;

    await act(async () => {
      trash.click();
    });

    // Find the Undo button on the snackbar — it shares the same root.
    const undo = Array.from(container.querySelectorAll('button')).find((b) =>
      /undo/i.test(b.textContent ?? ''),
    );
    expect(undo).toBeDefined();

    await act(async () => {
      undo!.click();
    });

    // Snackbar gone, focused task restored, no delete called.
    expect(useViewStateStore.getState().state.focusedTaskId).toBe(task.id);
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(await adapter.get(task.id)).toBeDefined();
  });

  it('letting the snackbar expire commits the delete', async () => {
    const task = await seedTask();
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const deleteSpy = vi.spyOn(adapter, 'delete');

    useViewStateStore.getState().replace({ zoom: 'matrix', focusedTaskId: task.id });

    const { container, unmount } = await renderWithQueryClient(
      wrap(<TaskActions task={task} snackbarDuration={50} />),
    );
    teardown = unmount;
    const trash = container.querySelector<HTMLButtonElement>('[data-field="delete"]')!;

    await act(async () => {
      trash.click();
    });

    // Wait for the (50 ms) timer to fire and `useDeleteTask` to settle.
    await waitForAsync(() => deleteSpy.mock.calls.length > 0, 2000);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy.mock.calls[0]?.[0]).toBe(task.id);

    // Task is gone from storage. The query layer's invalidation also
    // means matrix views would re-fetch — out of scope here, but the
    // primary contract (delete fires) is verified.
    await waitForAsync(async () => (await adapter.get(task.id)) === undefined);
  });
});
