/**
 * Step 5.2 "Done when": component test renders all field permutations.
 * Covers: every priority renders the right dot variant; no due date
 * suppresses the `<time>` element; multiple tags render as siblings;
 * long titles get the single-line ellipsis class so CSS can clip
 * them; clicking opens view3 by writing into the view-state store.
 */
import type { BackendId, Priority, Task, TaskId } from '@emt/backend-core';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useViewStateStore } from '../src/state/view-state.ts';
import { TaskCard } from '../src/views/matrix/TaskCard.tsx';

import { renderWithQueryClient } from './query-render.tsx';

function makeTask(overrides: Partial<Task> = {}): Task {
  const base: Task = {
    id: 'task-mock' as TaskId,
    backendId: 'local' as BackendId,
    title: 'Buy milk',
    notes: '',
    priority: 'normal',
    quadrant: 'Q2',
    status: 'open',
    createdAt: '2026-05-07T00:00:00.000Z',
    updatedAt: '2026-05-07T00:00:00.000Z',
    tags: [],
  };
  return { ...base, ...overrides };
}

function resetViewState(internalPath = '/'): void {
  window.history.replaceState(null, '', internalPath);
  useViewStateStore.getState().syncFromUrl();
}

describe('TaskCard', () => {
  let teardown: (() => void) | undefined;

  beforeEach(() => {
    resetViewState('/');
  });
  afterEach(() => {
    teardown?.();
    teardown = undefined;
    resetViewState('/');
  });

  for (const priority of ['none', 'low', 'normal', 'high'] as const satisfies readonly Priority[]) {
    it(`renders the ${priority} priority dot`, async () => {
      const { container, unmount } = await renderWithQueryClient(
        <TaskCard task={makeTask({ priority })} />,
      );
      teardown = unmount;
      const card = container.querySelector<HTMLElement>('.emt-task-card');
      expect(card).not.toBeNull();
      expect(card!.dataset['priority']).toBe(priority);
      const dot = card!.querySelector<HTMLElement>('.emt-task-card__priority');
      expect(dot).not.toBeNull();
      expect(dot!.dataset['priority']).toBe(priority);
      // Decorative — the dot is a visual rank, not a fact AT needs to
      // re-announce on top of the visible title.
      expect(dot!.getAttribute('aria-hidden')).toBe('true');
    });
  }

  it('omits the due-date element when the task has no due date', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ dueDate: undefined })} />,
    );
    teardown = unmount;
    expect(container.querySelector('.emt-task-card__due')).toBeNull();
  });

  it('renders the full date for a far-future date-only due', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ dueDate: '2099-12-31' })} />,
    );
    teardown = unmount;
    const due = container.querySelector<HTMLTimeElement>('.emt-task-card__due');
    expect(due).not.toBeNull();
    expect(due!.getAttribute('datetime')).toBe('2099-12-31');
    expect(due!.dataset['dueBucket']).toBe('future');
    // Format is locale-dependent; assert structural facts that hold
    // across locales rather than a specific string.
    expect(due!.textContent).toMatch(/2099/);
    expect(due!.textContent).not.toMatch(/·/);
  });

  it('appends the time to the due-date label when both are set', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ dueDate: '2099-12-31', dueTime: '14:30' })} />,
    );
    teardown = unmount;
    const due = container.querySelector<HTMLTimeElement>('.emt-task-card__due');
    expect(due).not.toBeNull();
    expect(due!.textContent).toMatch(/·/);
    expect(due!.textContent).toMatch(/2099/);
  });

  it('labels overdue dues and sets data-due-bucket=past (Phase 17)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ dueDate: '2000-01-01' })} />,
    );
    teardown = unmount;
    const card = container.querySelector<HTMLElement>('.emt-task-card');
    const due = container.querySelector<HTMLTimeElement>('.emt-task-card__due');
    expect(card!.dataset['dueBucket']).toBe('past');
    expect(due!.dataset['dueBucket']).toBe('past');
    expect(due!.textContent).toBe('Overdue');
  });

  it('labels today dues with data-due-bucket=today (Phase 17)', async () => {
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ dueDate: iso })} />,
    );
    teardown = unmount;
    const due = container.querySelector<HTMLTimeElement>('.emt-task-card__due');
    expect(due!.dataset['dueBucket']).toBe('today');
    expect(due!.textContent).toBe('Today');
  });

  it('renders multiple tags as separate siblings', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ tags: ['home', 'urgent', 'errands'] })} />,
    );
    teardown = unmount;
    const tags = container.querySelectorAll('.emt-task-card__tag');
    expect(Array.from(tags).map((el) => el.textContent)).toEqual(['home', 'urgent', 'errands']);
  });

  it('omits the meta row entirely when there is no due and no tags', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ dueDate: undefined, tags: [] })} />,
    );
    teardown = unmount;
    expect(container.querySelector('.emt-task-card__meta')).toBeNull();
  });

  it('long titles get the single-line ellipsis class', async () => {
    const long =
      'A really long task title that should overflow its row and clip with ellipsis '.repeat(4);
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ title: long })} />,
    );
    teardown = unmount;
    const titleEl = container.querySelector<HTMLElement>('.emt-task-card__title');
    expect(titleEl).not.toBeNull();
    // Full text is in the DOM (CSS does the clipping at paint time);
    // the class name is the contract that lets CSS apply ellipsis.
    expect(titleEl!.textContent).toBe(long);
    expect(titleEl!.className).toBe('emt-task-card__title');
  });

  it('marks done tasks with a status attribute the CSS can target', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ status: 'done', completedAt: '2026-05-07T12:00:00.000Z' })} />,
    );
    teardown = unmount;
    const card = container.querySelector<HTMLElement>('.emt-task-card');
    expect(card!.dataset['status']).toBe('done');
  });

  it('opens view3 over the matrix view on click', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ id: 'task-abc' as TaskId })} />,
    );
    teardown = unmount;
    const open = container.querySelector<HTMLButtonElement>('.emt-task-card__open')!;
    await act(async () => {
      open.click();
    });
    const state = useViewStateStore.getState().state;
    expect(state.zoom).toBe('matrix');
    expect(state.focusedTaskId).toBe('task-abc');
    expect(state.openedFromZoom).toBe('matrix');
    expect(window.location.pathname).toBe('/');
    expect(window.location.search).toBe('?task=task-abc&from=matrix');
  });

  it('opens view3 over the quadrant view when zoomed in', async () => {
    resetViewState('/q/Q2');
    const { container, unmount } = await renderWithQueryClient(
      <TaskCard task={makeTask({ id: 'task-xyz' as TaskId, quadrant: 'Q2' })} />,
    );
    teardown = unmount;
    const open = container.querySelector<HTMLButtonElement>('.emt-task-card__open')!;
    await act(async () => {
      open.click();
    });
    const state = useViewStateStore.getState().state;
    expect(state.zoom).toBe('quadrant');
    expect(state.focusedQuadrant).toBe('Q2');
    expect(state.focusedTaskId).toBe('task-xyz');
    expect(state.openedFromZoom).toBe('quadrant');
    expect(window.location.pathname).toBe('/q/Q2');
    expect(window.location.search).toBe('?task=task-xyz&from=quadrant');
  });
});
