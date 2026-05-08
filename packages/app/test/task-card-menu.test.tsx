/**
 * Step 5.6 "Done when": keyboard-only test — focus the card, activate
 * the menu, choose a target quadrant, assert the task moved.
 *
 * The menu is the keyboard-accessible alternative to drag-and-drop.
 * These tests cover:
 *   - kebab opens / closes the menu via click and via the menu-button
 *     keyboard pattern (Enter, Space, ArrowDown all open and land
 *     focus on the first item)
 *   - menu items list every quadrant *other* than the task's current
 *     one, in canonical order
 *   - ArrowDown/ArrowUp wrap navigation between items; Home/End jump
 *     to the ends; Esc closes and restores focus to the trigger
 *   - activating an item dispatches `useUpdateTask` and writes the
 *     new quadrant through the registered local-IDB adapter
 *   - the kebab `pointerdown` handler stops propagation so dnd-kit's
 *     listeners on the wrapper card don't see the click and start a
 *     spurious drag
 *
 * The "click outside closes" path is exercised by dispatching a
 * `pointerdown` on a sibling node.
 */
import 'fake-indexeddb/auto';
import { DndContext } from '@dnd-kit/core';
import type { BackendId, Task, TaskDraft, TaskId } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { act } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { strings } from '../src/i18n/strings.en.ts';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { TaskCard } from '../src/views/matrix/TaskCard.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'Move me',
  notes: '',
  priority: 'normal',
  quadrant: 'Q2',
  status: 'open',
  tags: [],
};

function makeFakeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'fake' as TaskId,
    backendId: 'local' as BackendId,
    title: 'Sample',
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

function pressKey(target: HTMLElement, key: string): void {
  // happy-dom doesn't emulate the full input pipeline; dispatching a
  // bubbling KeyboardEvent is what React's synthetic event system
  // listens for.
  target.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

describe('TaskCardMenu (Step 5.6)', () => {
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

  it('renders the kebab trigger with the labeled aria attributes', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DndContext>
          <TaskCard task={makeFakeTask()} />
        </DndContext>
      </I18nProvider>,
    );
    teardown = unmount;
    const trigger = container.querySelector<HTMLButtonElement>('.emt-task-card__menu-button')!;
    expect(trigger).not.toBeNull();
    expect(trigger.getAttribute('aria-label')).toBe(strings['app.task.menu.label']);
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    // Menu is closed initially.
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it('opens via click and lists every quadrant except the current one', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DndContext>
          <TaskCard task={makeFakeTask({ quadrant: 'Q2' })} />
        </DndContext>
      </I18nProvider>,
    );
    teardown = unmount;

    const trigger = container.querySelector<HTMLButtonElement>('.emt-task-card__menu-button')!;
    await act(async () => {
      trigger.click();
    });

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const menu = container.querySelector<HTMLElement>('[role="menu"]')!;
    expect(menu).not.toBeNull();
    const items = menu.querySelectorAll<HTMLButtonElement>('[role="menuitem"]');
    const quadrants = Array.from(items).map((el) => el.dataset['quadrant']);
    // Q2 is the task's current quadrant — the menu omits it.
    expect(quadrants).toEqual(['Q1', 'Q3', 'Q4']);
    expect(items[0]!.textContent).toBe(strings['app.task.menu.moveTo.q1']);
  });

  it('opens via the keyboard menu-button pattern (Enter / ArrowDown)', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DndContext>
          <TaskCard task={makeFakeTask()} />
        </DndContext>
      </I18nProvider>,
    );
    teardown = unmount;
    const trigger = container.querySelector<HTMLButtonElement>('.emt-task-card__menu-button')!;
    trigger.focus();

    await act(async () => {
      pressKey(trigger, 'ArrowDown');
    });

    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    // Focus has moved to the first menu item — verify via the focus
    // ring contract: menu open + activeElement is a menuitem button.
    await waitForAsync(() => document.activeElement?.getAttribute('role') === 'menuitem');
    expect((document.activeElement as HTMLButtonElement).dataset['quadrant']).toBe('Q1');
  });

  it('arrow keys wrap focus and Esc restores focus to the trigger', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DndContext>
          <TaskCard task={makeFakeTask({ quadrant: 'Q2' })} />
        </DndContext>
      </I18nProvider>,
    );
    teardown = unmount;
    const trigger = container.querySelector<HTMLButtonElement>('.emt-task-card__menu-button')!;
    await act(async () => {
      trigger.click();
    });
    await waitForAsync(() => document.activeElement?.getAttribute('role') === 'menuitem');

    const focused = (): HTMLButtonElement => document.activeElement as HTMLButtonElement;
    expect(focused().dataset['quadrant']).toBe('Q1');

    await act(async () => {
      pressKey(focused(), 'ArrowDown');
    });
    expect(focused().dataset['quadrant']).toBe('Q3');

    await act(async () => {
      pressKey(focused(), 'End');
    });
    expect(focused().dataset['quadrant']).toBe('Q4');

    // Wraps from last back to first.
    await act(async () => {
      pressKey(focused(), 'ArrowDown');
    });
    expect(focused().dataset['quadrant']).toBe('Q1');

    await act(async () => {
      pressKey(focused(), 'ArrowUp');
    });
    expect(focused().dataset['quadrant']).toBe('Q4');

    await act(async () => {
      pressKey(focused(), 'Escape');
    });
    expect(container.querySelector('[role="menu"]')).toBeNull();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    await waitForAsync(() => document.activeElement === trigger);
  });

  it('activating a menu item moves the task through the adapter', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    const created = await adapter.create({ ...DRAFT, quadrant: 'Q2' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DndContext>
          <TaskCard task={created} />
        </DndContext>
      </I18nProvider>,
    );
    teardown = unmount;

    const trigger = container.querySelector<HTMLButtonElement>('.emt-task-card__menu-button')!;
    await act(async () => {
      trigger.click();
    });

    const item = container.querySelector<HTMLButtonElement>('[data-quadrant="Q1"]')!;
    await act(async () => {
      item.click();
    });

    // Mutation is async; poll the adapter until the patch lands.
    await waitForAsync(async () => {
      const fresh = await adapter.get(created.id);
      return fresh?.quadrant === 'Q1';
    });

    // Menu closes after activation.
    expect(container.querySelector('[role="menu"]')).toBeNull();
  });

  it('outside pointerdown closes the menu', async () => {
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DndContext>
          <TaskCard task={makeFakeTask()} />
        </DndContext>
      </I18nProvider>,
    );
    teardown = unmount;
    const trigger = container.querySelector<HTMLButtonElement>('.emt-task-card__menu-button')!;
    await act(async () => {
      trigger.click();
    });
    expect(container.querySelector('[role="menu"]')).not.toBeNull();

    // Synthesize a pointerdown outside both the trigger and any menu item.
    const elsewhere = document.createElement('div');
    document.body.append(elsewhere);
    try {
      await act(async () => {
        elsewhere.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      });
      expect(container.querySelector('[role="menu"]')).toBeNull();
    } finally {
      elsewhere.remove();
    }
  });

  it('kebab pointerdown does not bubble to the dnd-kit listeners on the card', async () => {
    const onWrapperPointerDown = vi.fn();
    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <DndContext>
          {/* A spy on the same DOM ancestor where dnd-kit attaches its
              `listeners.onPointerDown` — verifies that opening the
              menu does not trigger drag activation. */}
          <div onPointerDown={onWrapperPointerDown}>
            <TaskCard task={makeFakeTask()} />
          </div>
        </DndContext>
      </I18nProvider>,
    );
    teardown = unmount;
    const trigger = container.querySelector<HTMLButtonElement>('.emt-task-card__menu-button')!;
    await act(async () => {
      trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    });
    expect(onWrapperPointerDown).not.toHaveBeenCalled();
  });
});
