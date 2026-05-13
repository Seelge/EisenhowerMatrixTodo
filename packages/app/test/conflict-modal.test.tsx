/**
 * Step 10.1 — ConflictModal rendering + choice.
 *
 * "Done when": opening the modal with a synthetic `ConflictRecord`
 * shows both sides and allows choosing.
 */
import type { BackendId, ConflictRecord, Task, TaskId } from '@emt/backend-core';
import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { ConflictModal } from '../src/views/conflict/ConflictModal.tsx';

import { renderWithQueryClient } from './query-render.tsx';

function task(overrides: Partial<Task>): Task {
  return {
    id: ('id-' + Math.random().toString(36).slice(2)) as TaskId,
    backendId: 'local' as BackendId,
    title: 'Default',
    notes: '',
    priority: 'normal',
    quadrant: 'Q2',
    status: 'open',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

describe('ConflictModal — Step 10.1', () => {
  let teardown: (() => void) | undefined;

  afterEach(() => {
    teardown?.();
    teardown = undefined;
  });

  it('renders both sides with differing fields and resolves on click', async () => {
    const local = task({ title: 'Local title', quadrant: 'Q1', dueDate: '2026-06-01' });
    const remote = task({
      id: local.id,
      title: 'Remote title',
      quadrant: 'Q3',
      dueDate: '2026-07-15',
    });
    const record: ConflictRecord = {
      local,
      remote,
      differingFields: ['title', 'quadrant', 'dueDate'],
    };
    const onResolve = vi.fn();
    const onCancel = vi.fn();

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <ConflictModal open record={record} onResolve={onResolve} onCancel={onCancel} />
      </I18nProvider>,
    );
    teardown = unmount;

    // Both columns rendered with each differing value visible.
    expect(container.querySelector('[data-side="local"][data-field="title"]')?.textContent).toBe(
      'Local title',
    );
    expect(container.querySelector('[data-side="remote"][data-field="title"]')?.textContent).toBe(
      'Remote title',
    );
    expect(container.querySelector('[data-side="local"][data-field="quadrant"]')?.textContent).toBe(
      'Q1',
    );
    expect(
      container.querySelector('[data-side="remote"][data-field="quadrant"]')?.textContent,
    ).toBe('Q3');

    // Click Keep Remote → onResolve receives 'remote'.
    const keepRemote = container.querySelector<HTMLButtonElement>('[data-action="keep-remote"]')!;
    await act(async () => {
      keepRemote.click();
    });
    expect(onResolve).toHaveBeenCalledWith('remote');
  });

  it('does not render when open is false', async () => {
    const onResolve = vi.fn();
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <ConflictModal
          open={false}
          record={{
            local: task({}),
            remote: task({}),
            differingFields: [],
          }}
          onResolve={onResolve}
        />
      </I18nProvider>,
    );
    teardown = unmount;
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('Escape fires onCancel', async () => {
    const onCancel = vi.fn();
    const { unmount } = await renderWithQueryClient(
      <I18nProvider>
        <ConflictModal
          open
          record={{
            local: task({}),
            remote: task({ title: 'Other' }),
            differingFields: ['title'],
          }}
          onResolve={vi.fn()}
          onCancel={onCancel}
        />
      </I18nProvider>,
    );
    teardown = unmount;

    await act(async () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onCancel).toHaveBeenCalled();
  });
});
