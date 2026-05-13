/**
 * Step 10.3 — Backstop for non-modal conflicts.
 *
 * "Done when": during an active drag, no modal appears; drag
 * completes; modal opens.
 *
 * The host's modal-open gate is driven by `useIsBusy()` (drag +
 * compose flags in the busy store). The test flips the dragging
 * flag manually rather than driving a real dnd-kit drag, since the
 * contract under test is "modal stays hidden while busy, opens on
 * idle" — not the wiring between DndContext events and the store
 * (covered by the matrix-dnd / quadrant-dnd suites once they assert
 * busy flips).
 */
import 'fake-indexeddb/auto';
import type { BackendId, ConflictRecord, Task, TaskId } from '@emt/backend-core';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { useBusyStore } from '../src/state/busy.ts';
import { ConflictResolverHost } from '../src/views/conflict/ConflictResolverHost.tsx';

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

interface FakeEngine {
  setConflictResolver: (r: (rec: ConflictRecord) => Promise<'local' | 'remote'>) => void;
  resolve: (rec: ConflictRecord) => Promise<'local' | 'remote'>;
}

function makeFakeEngine(): FakeEngine {
  let resolver: ((rec: ConflictRecord) => Promise<'local' | 'remote'>) | undefined;
  return {
    setConflictResolver(r) {
      resolver = r;
    },
    resolve(rec) {
      if (resolver === undefined) throw new Error('resolver not registered');
      return resolver(rec);
    },
  };
}

async function waitFor(check: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

describe('ConflictResolverHost — Step 10.3 backstop', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    useBusyStore.setState({ isDragging: false, isComposing: false });
  });

  afterEach(() => {
    teardown?.();
    teardown = undefined;
    useBusyStore.setState({ isDragging: false, isComposing: false });
  });

  it('keeps the modal closed while a drag is in progress, opens on release', async () => {
    const engine = makeFakeEngine();
    // Start in the dragging state so the host has the busy flag set
    // before the conflict arrives.
    useBusyStore.getState().setDragging(true);

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        {/* The fake engine satisfies the syncEngine prop's contract. */}
        <ConflictResolverHost
          syncEngine={engine as unknown as Parameters<typeof ConflictResolverHost>[0]['syncEngine']}
        />
      </I18nProvider>,
    );
    teardown = unmount;

    // Wait for the host's effect to register its resolver.
    await waitFor(() => container !== null);

    const record: ConflictRecord = {
      local: task({ title: 'Local' }),
      remote: task({ title: 'Remote' }),
      differingFields: ['title'],
    };
    const choicePromise = engine.resolve(record);

    // The conflict is enqueued, but the modal must not be visible
    // while the user is mid-drag.
    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    // Drag ends → the host re-renders and the modal opens for the
    // queued conflict.
    await act(async () => {
      useBusyStore.getState().setDragging(false);
    });
    await waitFor(() => container.querySelector('[role="dialog"]') !== null);

    // Choose to drain the queue (and avoid an unhandled promise).
    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-action="keep-local"]')!.click();
    });
    await expect(choicePromise).resolves.toBe('local');
  });

  it('treats composing the same way — modal stays hidden until the composer closes', async () => {
    const engine = makeFakeEngine();
    useBusyStore.getState().setComposing(true);

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <ConflictResolverHost
          syncEngine={engine as unknown as Parameters<typeof ConflictResolverHost>[0]['syncEngine']}
        />
      </I18nProvider>,
    );
    teardown = unmount;

    const choicePromise = engine.resolve({
      local: task({ title: 'A' }),
      remote: task({ title: 'B' }),
      differingFields: ['title'],
    });

    await new Promise((r) => setTimeout(r, 20));
    expect(container.querySelector('[role="dialog"]')).toBeNull();

    await act(async () => {
      useBusyStore.getState().setComposing(false);
    });
    await waitFor(() => container.querySelector('[role="dialog"]') !== null);

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-action="keep-remote"]')!.click();
    });
    await expect(choicePromise).resolves.toBe('remote');
  });
});
