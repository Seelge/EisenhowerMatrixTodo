/**
 * Step 8.5 — QuadrantField behavior.
 *
 * "Done when": picking a different quadrant updates the task and
 * (because `useUpdateTask` invalidates the `['tasks']` cache subtree
 * on success) the matrix below reflects the move. The matrix-reflection
 * half is covered structurally by the existing `useUpdateTask` cache
 * invalidation contract — we assert that the adapter write fires with
 * the right `quadrant` patch and that the persisted record carries
 * the new value, which is sufficient given the queries layer already
 * invalidates and refetches.
 *
 * Also asserts:
 *  - the current quadrant is `aria-checked` on mount;
 *  - clicking the current quadrant is a no-op (no write);
 *  - keyboard arrow navigation from the QuadrantPicker writes through.
 */
import 'fake-indexeddb/auto';
import type { Task, TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { QuadrantField } from '../src/views/task/QuadrantField.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'Task',
  notes: '',
  priority: 'normal',
  quadrant: 'Q2',
  status: 'open',
  tags: [],
};

async function seedTask(overrides: Partial<TaskDraft> = {}): Promise<Task> {
  const { registry } = await getBackends();
  const adapter = registry.list()[0]!;
  return adapter.create({ ...DRAFT, ...overrides });
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

describe('QuadrantField — Step 8.5', () => {
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

  it('marks the current quadrant aria-checked', async () => {
    const task = await seedTask({ quadrant: 'Q2' });
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const q2 = container.querySelector<HTMLButtonElement>('[data-emt-quadrant="q2"]')!;
    expect(q2.getAttribute('aria-checked')).toBe('true');
  });

  it('picking a different quadrant writes the patch and persists it', async () => {
    const task = await seedTask({ quadrant: 'Q2' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const q1 = container.querySelector<HTMLButtonElement>('[data-emt-quadrant="q1"]')!;

    await act(async () => {
      q1.click();
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ quadrant: 'Q1' });

    const fresh = await adapter.get(task.id);
    expect(fresh?.quadrant).toBe('Q1');
  });

  it('clicking the current quadrant does not write', async () => {
    const task = await seedTask({ quadrant: 'Q3' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const q3 = container.querySelector<HTMLButtonElement>('[data-emt-quadrant="q3"]')!;

    await act(async () => {
      q3.click();
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('arrow-key navigation writes through useUpdateTask', async () => {
    const task = await seedTask({ quadrant: 'Q2' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    // QuadrantPicker's keydown listener lives on the radiogroup. Q2 in
    // the picker's spatial layout is top-left; ArrowRight moves to Q1.
    const group = container.querySelector<HTMLDivElement>('[role="radiogroup"]')!;
    await act(async () => {
      group.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
      );
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ quadrant: 'Q1' });
  });
});
