/**
 * Integration tests for the task query / mutation hooks. Mounts a tiny
 * harness component, invokes the hooks, and asserts both the hook
 * state (`data`, `isSuccess`) and the underlying IndexedDB state.
 */
import 'fake-indexeddb/auto';
import type { Task, TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act, useState, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useCreateTask, useDeleteTask, useTasks, useUpdateTask } from '../src/queries/tasks.ts';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';

import { renderWithQueryClient } from './query-render.tsx';

function freshIdb(): void {
  globalThis.indexedDB = new IDBFactory();
}

const SAMPLE_DRAFT: TaskDraft = {
  title: 'Sample',
  notes: '',
  priority: 'normal',
  quadrant: 'Q2',
  status: 'open',
  tags: [],
};

async function waitFor(check: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('task query hooks', () => {
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

  it('useTasks lists tasks across registered backends', async () => {
    // Seed via the registry directly so the test is independent of
    // `useCreateTask` working.
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...SAMPLE_DRAFT, title: 'A' });
    await adapter.create({ ...SAMPLE_DRAFT, title: 'B', quadrant: 'Q3' });

    let listed: readonly Task[] | undefined;
    function Probe(): ReactNode {
      const q = useTasks();
      listed = q.data;
      return <span data-status={q.status} />;
    }
    const handle = await renderWithQueryClient(<Probe />);
    teardown = handle.unmount;

    await waitFor(() => listed?.length === 2);
    const titles = listed!.map((t) => t.title).sort();
    expect(titles).toEqual(['A', 'B']);
  });

  it('useTasks(quadrant) filters', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...SAMPLE_DRAFT, title: 'A', quadrant: 'Q1' });
    await adapter.create({ ...SAMPLE_DRAFT, title: 'B', quadrant: 'Q4' });

    let listed: readonly Task[] | undefined;
    function Probe(): ReactNode {
      const q = useTasks('Q4');
      listed = q.data;
      return null;
    }
    const handle = await renderWithQueryClient(<Probe />);
    teardown = handle.unmount;

    await waitFor(() => listed !== undefined && listed.length === 1);
    expect(listed![0]!.title).toBe('B');
  });

  it('useCreateTask + useTasks: creating invalidates and re-fetches the list', async () => {
    let createdId: string | undefined;
    let listed: readonly Task[] | undefined;
    function Probe(): ReactNode {
      const q = useTasks();
      const create = useCreateTask();
      listed = q.data;
      const [didMutate, setDidMutate] = useState(false);
      if (q.isSuccess && !didMutate) {
        setDidMutate(true);
        create.mutate({ draft: SAMPLE_DRAFT }, { onSuccess: (t) => (createdId = t.id) });
      }
      return null;
    }
    const handle = await renderWithQueryClient(<Probe />);
    teardown = handle.unmount;

    await waitFor(() => createdId !== undefined && (listed?.length ?? 0) === 1);
    expect(listed![0]!.id).toBe(createdId);
    expect(listed![0]!.title).toBe(SAMPLE_DRAFT.title);
  });

  it('useUpdateTask updates a task in place', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const created = await adapter.create(SAMPLE_DRAFT);

    let listed: readonly Task[] | undefined;
    let mutator: ReturnType<typeof useUpdateTask> | undefined;
    function Probe(): ReactNode {
      listed = useTasks().data;
      mutator = useUpdateTask();
      return null;
    }
    const handle = await renderWithQueryClient(<Probe />);
    teardown = handle.unmount;

    await waitFor(() => listed?.length === 1);

    await act(async () => {
      await mutator!.mutateAsync({
        backendId: created.backendId,
        id: created.id,
        patch: { status: 'done' },
      });
    });

    await waitFor(() => listed?.[0]?.status === 'done');
  });

  it('useDeleteTask removes a task', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const created = await adapter.create(SAMPLE_DRAFT);

    let listed: readonly Task[] | undefined;
    let mutator: ReturnType<typeof useDeleteTask> | undefined;
    function Probe(): ReactNode {
      listed = useTasks().data;
      mutator = useDeleteTask();
      return null;
    }
    const handle = await renderWithQueryClient(<Probe />);
    teardown = handle.unmount;

    await waitFor(() => listed?.length === 1);

    await act(async () => {
      await mutator!.mutateAsync({ backendId: created.backendId, id: created.id });
    });

    await waitFor(() => listed?.length === 0);
  });

  it('useUpdateTask against an unregistered backend rejects', async () => {
    let mutator: ReturnType<typeof useUpdateTask> | undefined;
    function Probe(): ReactNode {
      mutator = useUpdateTask();
      return null;
    }
    const handle = await renderWithQueryClient(<Probe />);
    teardown = handle.unmount;

    await waitFor(() => mutator !== undefined);
    await expect(
      mutator!.mutateAsync({
        backendId: 'nope' as Task['backendId'],
        id: 'x' as Task['id'],
        patch: { title: 'never' },
      }),
    ).rejects.toThrow(/Unknown backend/);
  });
});
