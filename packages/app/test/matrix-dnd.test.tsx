/**
 * Step 5.5 "Done when":
 *   - Mouse drag works on desktop (TouchSensor variant covers Android).
 *   - Visual drop indicator on the receiving cell.
 *   - Optimistic update + rollback on adapter error.
 *
 * happy-dom has no layout engine, so dnd-kit's sensors that depend on
 * measured droppable rects (Pointer, Touch, Keyboard) cannot drive a
 * full drag end-to-end inside vitest. Instead these tests:
 *   - exercise `createDragEndHandler` directly with synthesized
 *     `DragEndEvent`s — the same handler that `<DndContext>` invokes;
 *   - render `<MatrixCell>` inside a `<DndContext>` to assert the
 *     droppable is wired and `data-drop-active` flips when an "over"
 *     condition is simulated by dispatching a fake drag move (via
 *     dnd-kit's `monitor` API); when that's not feasible, we assert
 *     the static structural contract (the data attribute exists with
 *     a known initial value).
 *   - render `<TaskCard>` inside a `<DndContext>` and assert the
 *     dnd-kit attributes (`role`, `aria-roledescription`, `tabindex`)
 *     and the draggable id surface on the rendered button.
 *
 * Real cross-engine drag verification (mouse, touch) is the job of the
 * Phase 11.4 golden-path Playwright spec; that's where the "works on
 * desktop" / "works on Android" checks land for keeps.
 */
import 'fake-indexeddb/auto';
import { DndContext, type DragEndEvent } from '@dnd-kit/core';
import type { BackendId, Task, TaskDraft, TaskId } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { createDragEndHandler } from '../src/views/matrix/dnd.ts';
import { MatrixCell } from '../src/views/matrix/MatrixCell.tsx';
import { MatrixView } from '../src/views/matrix/MatrixView.tsx';
import { TaskCard } from '../src/views/matrix/TaskCard.tsx';

import { createTestQueryClient, renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'placeholder',
  notes: '',
  priority: 'normal',
  quadrant: 'Q2',
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
    quadrant: 'Q2',
    status: 'open',
    createdAt: '2026-05-08T00:00:00.000Z',
    updatedAt: '2026-05-08T00:00:00.000Z',
    tags: [],
    ...overrides,
  };
}

function makeDragEndEvent(task: Task, toQuadrant: Task['quadrant'] | null): DragEndEvent {
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
            id: `cell-${toQuadrant}`,
            data: { current: { kind: 'cell', quadrant: toQuadrant } },
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

describe('Matrix drag-and-drop wiring (Step 5.5)', () => {
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

  it('TaskCard publishes its dnd-kit draggable attributes on the wrapper', async () => {
    const task = makeTask({ id: 'card-1' as TaskId });
    const { container, unmount } = await renderWithQueryClient(
      <DndContext>
        <TaskCard task={task} />
      </DndContext>,
    );
    teardown = unmount;
    const card = container.querySelector<HTMLElement>('.emt-task-card')!;
    // dnd-kit applies aria-roledescription="draggable" + tabindex via
    // the `attributes` spread on the wrapper (no longer a button after
    // Step 5.6's restructure — see `TaskCard.tsx` for the rationale).
    expect(card.getAttribute('aria-roledescription')).toBe('draggable');
    expect(card.tabIndex).toBe(0);
    expect(card.dataset['dragging']).toBe('false');
  });

  it('MatrixCell registers as a droppable and exposes a drop-active flag', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DndContext>
          <MatrixCell quadrant="Q3" />
        </DndContext>
      </I18nProvider>,
    );
    teardown = unmount;
    const cell = container.querySelector<HTMLElement>('[data-quadrant="Q3"]')!;
    // Initial state: not drop-active. The flag flips to 'true' when
    // the dnd-kit monitor reports `isOver`; verifying that path
    // requires layout, so it lives in the Playwright suite.
    expect(cell.dataset['dropActive']).toBe('false');
    // Ref attached: the dnd-kit `useDroppable` ref is the same node
    // that carries the data-quadrant attribute, since `Glow` forwards
    // its ref. We verify that the cell still renders the task list
    // container (and is therefore really the same node) below.
    expect(cell.querySelector('.emt-matrix__cell-list')).not.toBeNull();
  });

  it('createDragEndHandler moves the task and writes through the adapter', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const created = await adapter.create({ ...DRAFT, quadrant: 'Q2' });

    const qc = createTestQueryClient();
    qc.setQueryData(['tasks', 'list', 'all'], [created]);
    qc.setQueryData(['tasks', 'list', 'Q2'], [created]);
    qc.setQueryData(['tasks', 'list', 'Q1'], [] as readonly Task[]);

    const mutate = vi.fn(
      (
        input: { backendId: BackendId; id: TaskId; patch: { quadrant: Task['quadrant'] } },
        opts: { onError: () => void },
      ) => {
        // Pretend `useUpdateTask` has run successfully — it would
        // adapter.update + invalidate. Mirror the adapter call here so
        // the assertion below is meaningful.
        void adapter.update(input.id, input.patch).catch(opts.onError);
      },
    );

    const handler = createDragEndHandler({ queryClient: qc, mutate });
    handler(makeDragEndEvent(created, 'Q1'));

    // Optimistic state is in place synchronously.
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q2'])).toEqual([]);
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q1'])![0]!.quadrant).toBe('Q1');
    expect(mutate).toHaveBeenCalledOnce();

    await waitForAsync(async () => {
      const fresh = await adapter.get(created.id);
      return fresh?.quadrant === 'Q1';
    });
  });

  it('rollback restores the cache when the mutation fails', () => {
    const task = makeTask({ id: 'rollback' as TaskId, quadrant: 'Q2' });
    const qc = createTestQueryClient();
    qc.setQueryData(['tasks', 'list', 'all'], [task]);
    qc.setQueryData(['tasks', 'list', 'Q2'], [task]);
    qc.setQueryData(['tasks', 'list', 'Q1'], [] as readonly Task[]);

    const mutate = vi.fn(
      (
        _input: { backendId: BackendId; id: TaskId; patch: { quadrant: Task['quadrant'] } },
        opts: { onError: () => void },
      ) => {
        // Simulate adapter failure — handler registered the rollback
        // closure as `onError`, so invoking it should restore the
        // cache to its pre-drop state.
        opts.onError();
      },
    );

    const handler = createDragEndHandler({ queryClient: qc, mutate });
    handler(makeDragEndEvent(task, 'Q1'));

    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q2'])).toEqual([task]);
    expect(qc.getQueryData<readonly Task[]>(['tasks', 'list', 'Q1'])).toEqual([]);
  });

  it('is a no-op when over is null or the drop target is the same quadrant', () => {
    const task = makeTask({ quadrant: 'Q2' });
    const qc = createTestQueryClient();
    const mutate = vi.fn();
    const handler = createDragEndHandler({ queryClient: qc, mutate });

    handler(makeDragEndEvent(task, null));
    handler(makeDragEndEvent(task, 'Q2'));

    expect(mutate).not.toHaveBeenCalled();
  });

  it('MatrixView mounts the DndContext and seeds appear in their cells', async () => {
    // Sanity check that wiring the DndContext doesn't break the basic
    // render — the rest of the drag pipeline is covered above.
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'Q2-task', quadrant: 'Q2' });
    await adapter.create({ ...DRAFT, title: 'Q1-task', quadrant: 'Q1' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixView />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitForAsync(() => container.querySelectorAll('.emt-task-card').length === 2);

    const q2Card = container
      .querySelector<HTMLElement>('[data-quadrant="Q2"]')!
      .querySelector<HTMLElement>('.emt-task-card__title');
    const q1Card = container
      .querySelector<HTMLElement>('[data-quadrant="Q1"]')!
      .querySelector<HTMLElement>('.emt-task-card__title');
    expect(q2Card?.textContent).toBe('Q2-task');
    expect(q1Card?.textContent).toBe('Q1-task');
  });
});
