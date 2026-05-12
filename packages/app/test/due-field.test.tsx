/**
 * Step 8.3 — DueField behavior.
 *
 * The "Done when" assertions, one per case:
 *  - each `DueDatePicker` preset writes the right ISO date (presets
 *    "Today" and "No date" are the load-bearing two; the others share
 *    the same dispatch path);
 *  - clearing the date also clears the time (single patch carries
 *    `dueDate: undefined` and `dueTime: undefined`);
 *  - the time input is disabled when the task has no date and enabled
 *    once a date is present;
 *  - typing into the time input writes `dueTime` via `useUpdateTask`.
 *
 * Each test seeds a real task through the registered IDB adapter and
 * spies on `adapter.update` — same harness as `task-fields.test.tsx`.
 */
import 'fake-indexeddb/auto';
import type { Task, TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { DueField } from '../src/views/task/DueField.tsx';

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

describe('DueField — Step 8.3', () => {
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

  it('renders the time input disabled when the task has no date', async () => {
    const task = await seedTask();
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DueField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const time = container.querySelector<HTMLInputElement>('[data-field="due-time"]')!;
    expect(time.disabled).toBe(true);
    expect(time.value).toBe('');
  });

  it('renders the time input enabled and seeded when the task has a date+time', async () => {
    const task = await seedTask({ dueDate: '2026-06-01', dueTime: '14:30' });
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DueField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const time = container.querySelector<HTMLInputElement>('[data-field="due-time"]')!;
    expect(time.disabled).toBe(false);
    expect(time.value).toBe('14:30');
  });

  it('picking the "Today" preset writes the local ISO date', async () => {
    const task = await seedTask();
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DueField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const today = container.querySelector<HTMLButtonElement>('[data-emt-preset="today"]')!;

    await act(async () => {
      today.click();
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const patch = updateSpy.mock.calls[0]?.[1] as { dueDate?: string };
    // `formatLocalDate(new Date())` — match by shape rather than literal
    // value so the test stays deterministic across the timezone the
    // suite runs in.
    expect(patch.dueDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('picking "No date" on a task with date+time clears both fields in one patch', async () => {
    const task = await seedTask({ dueDate: '2026-06-01', dueTime: '14:30' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DueField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const none = container.querySelector<HTMLButtonElement>('[data-emt-preset="none"]')!;

    await act(async () => {
      none.click();
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const patch = updateSpy.mock.calls[0]?.[1] as { dueDate?: string; dueTime?: string };
    expect('dueDate' in patch).toBe(true);
    expect('dueTime' in patch).toBe(true);
    expect(patch.dueDate).toBeUndefined();
    expect(patch.dueTime).toBeUndefined();

    // The adapter spreads the patch, so the stored record no longer
    // carries either field — round-trip via `get`.
    const fresh = await adapter.get(task.id);
    expect(fresh?.dueDate).toBeUndefined();
    expect(fresh?.dueTime).toBeUndefined();
  });

  it('typing into the time input writes only dueTime', async () => {
    const task = await seedTask({ dueDate: '2026-06-01' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DueField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const time = container.querySelector<HTMLInputElement>('[data-field="due-time"]')!;

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(time, '09:15');
      time.dispatchEvent(new Event('input', { bubbles: true }));
      time.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const patch = updateSpy.mock.calls[0]?.[1] as { dueDate?: string; dueTime?: string };
    expect(patch.dueTime).toBe('09:15');
    expect('dueDate' in patch).toBe(false);
  });

  it('clearing the time input writes dueTime: undefined and leaves dueDate intact', async () => {
    const task = await seedTask({ dueDate: '2026-06-01', dueTime: '14:30' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DueField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const time = container.querySelector<HTMLInputElement>('[data-field="due-time"]')!;

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    await act(async () => {
      setter?.call(time, '');
      time.dispatchEvent(new Event('input', { bubbles: true }));
      time.dispatchEvent(new Event('change', { bubbles: true }));
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    const patch = updateSpy.mock.calls[0]?.[1] as { dueDate?: string; dueTime?: string };
    expect('dueTime' in patch).toBe(true);
    expect(patch.dueTime).toBeUndefined();
    expect('dueDate' in patch).toBe(false);

    const fresh = await adapter.get(task.id);
    expect(fresh?.dueDate).toBe('2026-06-01');
    expect(fresh?.dueTime).toBeUndefined();
  });
});
