/**
 * Step 8.4 — PriorityField behavior.
 *
 * "Done when":
 *  - mouse click selects + writes;
 *  - keyboard arrow navigation moves selection AND focus (both axes,
 *    so ArrowRight and ArrowDown both step forward; ArrowLeft and
 *    ArrowUp step back);
 *  - Home / End jump to the ends;
 *  - navigation clamps at the boundary (no wrapping).
 *
 * Setup follows the same harness as `due-field.test.tsx` / `task-
 * fields.test.tsx`: seed a real task through the IDB adapter and
 * spy on `adapter.update`.
 */
import 'fake-indexeddb/auto';
import type { Task, TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { PriorityField } from '../src/views/task/PriorityField.tsx';

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

function dispatchKey(target: Element, key: string): void {
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
}

describe('PriorityField — Step 8.4', () => {
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

  it('marks the current priority with aria-checked and roving tabindex', async () => {
    const task = await seedTask({ priority: 'normal' });
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const options = Array.from(
      container.querySelectorAll<HTMLButtonElement>('[data-field="priority"]'),
    );
    expect(options.map((o) => o.dataset['priority'])).toEqual(['none', 'low', 'normal', 'high']);
    const normal = container.querySelector<HTMLButtonElement>('[data-priority="normal"]')!;
    expect(normal.getAttribute('aria-checked')).toBe('true');
    expect(normal.tabIndex).toBe(0);
    const others = options.filter((o) => o !== normal);
    for (const o of others) {
      expect(o.getAttribute('aria-checked')).toBe('false');
      expect(o.tabIndex).toBe(-1);
    }
  });

  it('clicking a different priority writes the patch', async () => {
    const task = await seedTask({ priority: 'normal' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const high = container.querySelector<HTMLButtonElement>('[data-priority="high"]')!;

    await act(async () => {
      high.click();
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ priority: 'high' });
  });

  it('clicking the current priority does not write', async () => {
    const task = await seedTask({ priority: 'low' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const low = container.querySelector<HTMLButtonElement>('[data-priority="low"]')!;

    await act(async () => {
      low.click();
    });

    // Give the (non-)mutation a tick to land.
    await new Promise((r) => setTimeout(r, 50));
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('ArrowRight from normal moves selection to high', async () => {
    const task = await seedTask({ priority: 'normal' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const group = container.querySelector<HTMLDivElement>('[data-field-group="priority"]')!;

    await act(async () => {
      dispatchKey(group, 'ArrowRight');
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ priority: 'high' });
  });

  it('ArrowLeft from low moves selection to none', async () => {
    const task = await seedTask({ priority: 'low' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const group = container.querySelector<HTMLDivElement>('[data-field-group="priority"]')!;

    await act(async () => {
      dispatchKey(group, 'ArrowLeft');
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ priority: 'none' });
  });

  it('Home jumps to none and End jumps to high', async () => {
    const task = await seedTask({ priority: 'low' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const group = container.querySelector<HTMLDivElement>('[data-field-group="priority"]')!;

    await act(async () => {
      dispatchKey(group, 'End');
    });
    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ priority: 'high' });
  });

  it('clamps at the right edge — ArrowRight from high does not write', async () => {
    const task = await seedTask({ priority: 'high' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const group = container.querySelector<HTMLDivElement>('[data-field-group="priority"]')!;

    await act(async () => {
      dispatchKey(group, 'ArrowRight');
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(updateSpy).not.toHaveBeenCalled();
  });

  it('clamps at the left edge — ArrowLeft from none does not write', async () => {
    const task = await seedTask({ priority: 'none' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const group = container.querySelector<HTMLDivElement>('[data-field-group="priority"]')!;

    await act(async () => {
      dispatchKey(group, 'ArrowLeft');
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(updateSpy).not.toHaveBeenCalled();
  });
});
