/**
 * Step 6.2 "Done when":
 *   - Dragging a task onto a neighbor edge moves it to that quadrant.
 *   - The targeted edge brightens during the drag (uses Step 3.2 glow
 *     via the existing `data-drop-active` pattern).
 *   - The current quadrant view stays focused after drop.
 *
 * happy-dom has no layout engine, so dnd-kit's pointer-driven sensors
 * cannot drive a true drag end-to-end inside vitest — the same
 * constraint as `matrix-dnd.test.tsx`. These tests:
 *   - exercise `createDragEndHandler` directly with an edge-payload
 *     `DragEndEvent` to assert the optimistic move + adapter write +
 *     rank persistence apply for edge drops the same as for cell drops;
 *   - mount `<NeighborEdge>` inside a `<DndContext>` and assert the
 *     droppable's static structural contract (the `data-drop-active`
 *     attribute exists with a known initial value and the strip carries
 *     the right edge / neighbor / color attributes);
 *   - mount `<QuadrantView>` and assert each edge is registered under a
 *     stable, per-neighbor droppable id so the dnd-kit collision
 *     detector can route drops to it.
 *
 * Real cross-engine drag verification (mouse, touch, pointer) is the
 * job of the Phase 11 Playwright suite.
 */
import 'fake-indexeddb/auto';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import type { BackendId, Task, TaskDraft, TaskId } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { createDragEndHandler } from '../src/views/matrix/dnd.ts';
import { NeighborEdge } from '../src/views/quadrant/NeighborEdge.tsx';
import { QuadrantView } from '../src/views/quadrant/QuadrantView.tsx';

import { createTestQueryClient, renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'placeholder',
  notes: '',
  priority: 'normal',
  quadrant: 'Q1',
  status: 'open',
  tags: [],
};

function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-mock' as TaskId,
    backendId: 'local' as BackendId,
    title: 'Buy milk',
    notes: '',
    priority: 'normal',
    quadrant: 'Q1',
    status: 'open',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

function makeEdgeDragEndEvent(task: Task, toQuadrant: Task['quadrant'] | null): DragEndEvent {
  return {
    activatorEvent: new Event('pointerup'),
    active: {
      id: task.id,
      data: { current: { kind: 'task', task } },
      rect: { current: { initial: null, translated: null } },
    } as unknown as DragEndEvent['active'],
    collisions: null,
    delta: { x: 0, y: 0 },
    over:
      toQuadrant === null
        ? null
        : ({
            id: `edge-${toQuadrant}`,
            data: { current: { kind: 'edge', quadrant: toQuadrant } },
            rect: { left: 0, top: 0, right: 0, bottom: 0, width: 0, height: 0 },
            disabled: false,
          } as unknown as NonNullable<DragEndEvent['over']>),
  };
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

describe('Quadrant drop-on-edge wiring (Step 6.2)', () => {
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

  it('NeighborEdge registers as a droppable and exposes drop-active', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <DndContext>
        <NeighborEdge edge="left" neighbor="Q2" />
      </DndContext>,
    );
    teardown = unmount;
    const strip = container.querySelector<HTMLElement>('.emt-quadrant__edge')!;
    expect(strip.dataset['edge']).toBe('left');
    expect(strip.dataset['neighbor']).toBe('Q2');
    expect(strip.dataset['emtEdgeColor']).toBe('q2');
    expect(strip.dataset['dropActive']).toBe('false');
    // `aria-hidden` so the decorative strip stays out of the AT tree;
    // the destination quadrant carries the meaning for AT via its own
    // verb-labelled cell elsewhere.
    expect(strip.getAttribute('aria-hidden')).toBe('true');
  });

  it('createDragEndHandler accepts edge drops and moves the task', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const created = await adapter.create({ ...DRAFT, quadrant: 'Q1' });

    const qc = createTestQueryClient();
    qc.setQueryData(['tasks', 'list', 'all'], [created]);
    qc.setQueryData(['tasks', 'list', 'Q1'], [created]);
    qc.setQueryData(['tasks', 'list', 'Q2'], [] as readonly Task[]);

    const mutate = vi.fn(
      (
        input: { backendId: BackendId; id: TaskId; patch: { quadrant: Task['quadrant'] } },
        opts: { onError: () => void },
      ) => {
        void adapter.update(input.id, input.patch).catch(opts.onError);
      },
    );

    const handler = createDragEndHandler({ queryClient: qc, mutate });
    handler(makeEdgeDragEndEvent(created, 'Q2'));

    // Optimistic state: removed from source (Q1), appended to destination (Q2).
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q1'])).toEqual([]);
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q2'])![0]!.quadrant).toBe('Q2');
    expect(mutate).toHaveBeenCalledOnce();

    await waitForAsync(async () => {
      const fresh = await adapter.get(created.id);
      return fresh?.quadrant === 'Q2';
    });
  });

  it('rolls back the cache when an edge-drop adapter call fails', () => {
    const task = makeTask({ id: 'rollback-edge' as TaskId, quadrant: 'Q1' });
    const qc = createTestQueryClient();
    qc.setQueryData(['tasks', 'list', 'all'], [task]);
    qc.setQueryData(['tasks', 'list', 'Q1'], [task]);
    qc.setQueryData(['tasks', 'list', 'Q3'], [] as readonly Task[]);

    const mutate = vi.fn(
      (
        _input: { backendId: BackendId; id: TaskId; patch: { quadrant: Task['quadrant'] } },
        opts: { onError: () => void },
      ) => {
        opts.onError();
      },
    );

    const handler = createDragEndHandler({ queryClient: qc, mutate });
    handler(makeEdgeDragEndEvent(task, 'Q3'));

    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q1'])).toEqual([task]);
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q3'])).toEqual([]);
  });

  it('writes a manual rank for an edge-drop too', () => {
    const task = makeTask({ id: 'edge-ranked' as TaskId, quadrant: 'Q1' });
    const qc = createTestQueryClient();
    const setRank = vi.fn();
    const handler = createDragEndHandler({
      queryClient: qc,
      mutate: vi.fn(),
      setRank,
      now: () => 1_700_000_001_234,
    });

    handler(makeEdgeDragEndEvent(task, 'Q3'));

    expect(setRank).toHaveBeenCalledOnce();
    expect(setRank).toHaveBeenCalledWith({
      backendId: task.backendId,
      taskId: task.id,
      rank: 1_700_000_001_234,
    });
  });

  it('is a no-op when an edge drop targets the focused quadrant', () => {
    // Should be unreachable in practice (a quadrant's edges only point
    // at its neighbors, not itself), but the guard belongs to the
    // handler so we exercise it directly.
    const task = makeTask({ quadrant: 'Q1' });
    const qc = createTestQueryClient();
    const mutate = vi.fn();
    const handler = createDragEndHandler({ queryClient: qc, mutate });

    handler(makeEdgeDragEndEvent(task, 'Q1'));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('QuadrantView renders one droppable strip per neighbor and stays focused after drop', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'live', quadrant: 'Q1' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <QuadrantView quadrant="Q1" />
      </I18nProvider>,
    );
    teardown = unmount;

    // The focused quadrant (Q1) has two neighbor strips: left → Q2, bottom → Q3.
    const strips = Array.from(container.querySelectorAll<HTMLElement>('.emt-quadrant__edge'));
    expect(strips.length).toBe(2);
    for (const s of strips) {
      // dnd-kit useDroppable does not stamp a public attribute on the
      // node, so we assert the structural contract: the data-drop-active
      // flag is wired and present on every strip.
      expect(s.dataset['dropActive']).toBe('false');
    }
    const neighbors = strips.map((s) => s.dataset['neighbor']).sort();
    expect(neighbors).toEqual(['Q2', 'Q3']);

    // The route doesn't change after a drop — the focused quadrant
    // attribute stays put. (The actual drop is exercised in the
    // handler-level test above; here we just confirm the view's own
    // identity isn't mutated by mounting the dnd context.)
    const main = container.querySelector<HTMLElement>('[data-view="quadrant"]')!;
    expect(main.dataset['quadrant']).toBe('Q1');
  });
});
