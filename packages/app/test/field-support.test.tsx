/**
 * Step 8.7 — Backend-unsupported field hints.
 *
 * "Done when": switching to a less-capable backend mock surfaces the
 * hint on Priority and Due-time fields. Asserted by registering an
 * in-memory adapter with `capabilities: { dueTime: false, priority:
 * false, recurrence: false }`, seeding a task there, rendering both
 * fields, and checking that an `UnsupportedHint` (`[role="note"]`)
 * appears next to each.
 *
 * The opposite case (fully-capable backend) is also asserted so a
 * regression wouldn't sprout false hints on the default local backend.
 */
import 'fake-indexeddb/auto';
import type { Task, TaskDraft } from '@emt/backend-core';
import { InMemoryAdapter } from '@emt/backend-inmemory';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { DueField } from '../src/views/task/DueField.tsx';
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

describe('Backend-unsupported field hints — Step 8.7', () => {
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

  it('hides the hint when the active backend supports the field', async () => {
    const { registry } = await getBackends();
    const local = registry.list()[0]!;
    const task = await local.create({ ...DRAFT, dueDate: '2026-06-01' });
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
        <DueField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    // Wait a tick so the useEffect-driven resolution has had time to
    // confirm the capability. The hint should remain hidden.
    await new Promise((r) => setTimeout(r, 30));
    expect(container.querySelector('[data-emt-unsupported-hint]')).toBeNull();
  });

  it('shows the hint on Priority and Due-time when the backend lacks support', async () => {
    const { registry } = await getBackends();
    const lite = new InMemoryAdapter({
      id: 'lite',
      displayName: 'Lite',
      capabilities: { dueTime: false, priority: false, recurrence: false },
    });
    registry.register(lite);
    const task: Task = await lite.create({ ...DRAFT, dueDate: '2026-06-01' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <PriorityField task={task} />
        <DueField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;

    // The useEffect resolves asynchronously; wait until both hints
    // mount before asserting.
    await waitForAsync(() => container.querySelectorAll('[data-emt-unsupported-hint]').length >= 2);

    const hints = Array.from(container.querySelectorAll('[data-emt-unsupported-hint]'));
    expect(hints).toHaveLength(2);
    // role="note" — informational rather than interactive.
    expect(hints.every((h) => h.getAttribute('role') === 'note')).toBe(true);
    const text = hints.map((h) => h.textContent ?? '').join(' ');
    expect(text).toMatch(/priority/i);
    expect(text).toMatch(/time of day/i);
  });
});
