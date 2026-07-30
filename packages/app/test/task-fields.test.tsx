/**
 * Step 8.2 — view3 field editors.
 *
 * The three editors (title, notes, status) all wire through
 * `useUpdateTask`. Tests:
 *  - title typed slowly persists through the adapter;
 *  - notes typed rapidly produce exactly one adapter write (debounce
 *    coalesces to 1 — the Step 8.2 "Done when" assertion);
 *  - toggling the status checkbox flips `task.status` immediately;
 *  - blur flushes the pending debounced value before the timer.
 *
 * Each test seeds a real `LocalIndexedDbAdapter` (via fake-indexeddb),
 * spies on `adapter.update`, then renders the field with the real
 * task. happy-dom's input pipeline doesn't fire `change` from a bare
 * `.value =` assignment, so the `setInputValue` helper goes through
 * the prototype setter — the same trick used by `quick-composer.test.tsx`.
 */
import 'fake-indexeddb/auto';
import type { Task, TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { NotesField } from '../src/views/task/NotesField.tsx';
import { StatusToggle } from '../src/views/task/StatusToggle.tsx';
import { TitleField } from '../src/views/task/TitleField.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'Original title',
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

function setInputValue(
  el: HTMLInputElement | HTMLTextAreaElement,
  value: string,
  ctor: typeof HTMLInputElement | typeof HTMLTextAreaElement,
): void {
  const setter = Object.getOwnPropertyDescriptor(ctor.prototype, 'value')?.set;
  setter?.call(el, value);
  el.dispatchEvent(new Event('input', { bubbles: true }));
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

describe('view3 field editors — Step 8.2', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    globalThis.indexedDB = new IDBFactory();
    __resetBackendsCacheForTesting();
    vi.useRealTimers();
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    vi.useRealTimers();
    __resetBackendsCacheForTesting();
  });

  it('TitleField seeds local state from the task title', async () => {
    const task = await seedTask({ title: 'Read book' });
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <TitleField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const input = container.querySelector<HTMLInputElement>('[data-field="title"]')!;
    expect(input.value).toBe('Read book');
  });

  it('TitleField commits the latest value after the debounce window', async () => {
    const task = await seedTask({ title: 'Old' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <TitleField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const input = container.querySelector<HTMLInputElement>('[data-field="title"]')!;

    await act(async () => {
      setInputValue(input, 'New title', HTMLInputElement);
    });
    // Local state reflects the edit immediately…
    expect(input.value).toBe('New title');
    // …but no adapter write has fired yet — the debounce timer is in
    // flight.
    expect(updateSpy).not.toHaveBeenCalled();

    // After the 300 ms window the commit lands once.
    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ title: 'New title' });

    // The persisted task carries the latest title.
    const fresh = await adapter.get(task.id);
    expect(fresh?.title).toBe('New title');
  });

  it('NotesField coalesces rapid keystrokes into a single adapter write', async () => {
    const task = await seedTask({ notes: '' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <NotesField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-field="notes"]')!;

    // Burst-type several intermediate values within one debounce window.
    const sequence = ['H', 'He', 'Hel', 'Hell', 'Hello'];
    for (const value of sequence) {
      await act(async () => {
        setInputValue(textarea, value, HTMLTextAreaElement);
      });
    }
    expect(textarea.value).toBe('Hello');
    expect(updateSpy).not.toHaveBeenCalled();

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    // The "Done when" assertion: N intermediate keystrokes collapse to
    // one adapter write carrying the final value.
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ notes: 'Hello' });
  });

  it('NotesField preview toggle renders markdown and hides the textarea', async () => {
    const task = await seedTask({ notes: '**bold** note' });
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <NotesField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    expect(container.querySelector('[data-field="notes"]')).not.toBeNull();
    const previewBtn = container.querySelector<HTMLButtonElement>('[data-action="notes-preview"]')!;
    await act(async () => {
      previewBtn.click();
    });
    expect(container.querySelector('[data-field="notes"]')).toBeNull();
    const preview = container.querySelector('[data-field="notes-preview"]')!;
    expect(preview.innerHTML).toContain('<strong>bold</strong>');
  });

  it('NotesField blur flushes the pending value before the timer', async () => {
    const task = await seedTask({ notes: 'before' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <NotesField task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const textarea = container.querySelector<HTMLTextAreaElement>('[data-field="notes"]')!;

    await act(async () => {
      setInputValue(textarea, 'after', HTMLTextAreaElement);
    });
    expect(updateSpy).not.toHaveBeenCalled();

    await act(async () => {
      textarea.dispatchEvent(new Event('blur', { bubbles: true }));
    });

    // Blur fires synchronously — no need to wait for the debounce.
    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy.mock.calls[0]?.[1]).toEqual({ notes: 'after' });
  });

  it('StatusToggle marks the task done and writes completedAt', async () => {
    const task = await seedTask({ status: 'open' });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <StatusToggle task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const checkbox = container.querySelector<HTMLInputElement>('[data-field="status"]')!;
    expect(checkbox.checked).toBe(false);

    await act(async () => {
      checkbox.click();
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    const patch = updateSpy.mock.calls[0]?.[1] as { status?: string; completedAt?: string };
    expect(patch.status).toBe('done');
    expect(typeof patch.completedAt).toBe('string');

    const fresh = await adapter.get(task.id);
    expect(fresh?.status).toBe('done');
  });

  it('StatusToggle reopens a completed task and clears completedAt', async () => {
    const completedAt = '2026-05-01T12:00:00.000Z';
    const task = await seedTask({ status: 'done', completedAt });
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const updateSpy = vi.spyOn(adapter, 'update');

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <StatusToggle task={task} />
      </I18nProvider>,
    );
    teardown = unmount;
    const checkbox = container.querySelector<HTMLInputElement>('[data-field="status"]')!;
    expect(checkbox.checked).toBe(true);

    await act(async () => {
      checkbox.click();
    });

    await waitForAsync(() => updateSpy.mock.calls.length > 0);
    const patch = updateSpy.mock.calls[0]?.[1] as { status?: string; completedAt?: string | null };
    expect(patch.status).toBe('open');
    expect(patch.completedAt).toBeNull();

    const fresh = await adapter.get(task.id);
    expect(fresh?.status).toBe('open');
    expect(fresh?.completedAt).toBeUndefined();
  });
});
