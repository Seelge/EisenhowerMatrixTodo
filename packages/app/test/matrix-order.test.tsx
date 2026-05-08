/**
 * Step 5.7 "Done when":
 *   - Reorder via drag (Step 5.5 extended) writes ranks.
 *   - Reset clears ranks for the current quadrant; cards fall back to
 *     due-date order.
 *   - Order persists across reloads.
 *
 * Drives the full vertical slice through `<MatrixCell>` and the
 * `useTaskOrder` / `useSetTaskRank` / `useClearTaskRanks` hooks against
 * a fake-IDB-backed DAO. The drag-handler-side rank assignment is
 * already covered by `matrix-dnd.test.tsx`; here we focus on the cell's
 * own behavior — visible reset button, fallback ordering after reset,
 * and persistence across a fresh DB connection.
 */
import 'fake-indexeddb/auto';
import type { BackendId, TaskDraft } from '@emt/backend-core';
import { IDBFactory } from 'fake-indexeddb';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { I18nProvider } from '../src/i18n/provider.tsx';
import { __resetBackendsCacheForTesting, getBackends } from '../src/state/backends.ts';
import { openTaskOrderDb, setTaskRank } from '../src/state/task-order.ts';
import { MatrixCell } from '../src/views/matrix/MatrixCell.tsx';

import { renderWithQueryClient } from './query-render.tsx';

const DRAFT: TaskDraft = {
  title: 'placeholder',
  notes: '',
  priority: 'normal',
  quadrant: 'Q2',
  status: 'open',
  tags: [],
};

async function waitFor(check: () => boolean, timeoutMs = 1500): Promise<void> {
  const start = Date.now();
  while (!check()) {
    if (Date.now() - start > timeoutMs) throw new Error('waitFor timed out');
    await new Promise((r) => setTimeout(r, 10));
  }
}

function cardTitles(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-quadrant="Q2"] .emt-task-card__title'),
  ).map((el) => el.textContent ?? '');
}

describe('MatrixCell — Step 5.7 manual order + reset', () => {
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

  it('orders cards by manual rank when ranks are present, falls back to due-date otherwise', async () => {
    const { registry, taskOrderDb } = await getBackends();
    const adapter = registry.list()[0]!;
    // Three tasks, two with due dates, one without. createdAt order is
    // 'a', 'b', 'c'; due-date order is 'b', 'a', 'c' (c has no due).
    const a = await adapter.create({ ...DRAFT, title: 'a', dueDate: '2026-06-15' });
    await adapter.create({ ...DRAFT, title: 'b', dueDate: '2026-06-01' });
    const c = await adapter.create({ ...DRAFT, title: 'c' });

    // Manually rank: c=10 (top), a=20 (next). b is unranked → falls
    // through the manual section to the due-date fallback.
    await setTaskRank(taskOrderDb, 'local' as BackendId, c.id, 10);
    await setTaskRank(taskOrderDb, 'local' as BackendId, a.id, 20);

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q2" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(
      () =>
        container.querySelectorAll('[data-quadrant="Q2"] .emt-task-card').length === 3 &&
        cardTitles(container)[0] === 'c',
    );

    // Manual section: c, a; then unranked fallback: b.
    expect(cardTitles(container)).toEqual(['c', 'a', 'b']);
  });

  it('reset action clears ranks for the cell and reverts to due-date order', async () => {
    const { registry, taskOrderDb } = await getBackends();
    const adapter = registry.list()[0]!;
    const a = await adapter.create({ ...DRAFT, title: 'a', dueDate: '2026-06-15' });
    const b = await adapter.create({ ...DRAFT, title: 'b', dueDate: '2026-06-01' });

    // Inverted manual order: b last, a first.
    await setTaskRank(taskOrderDb, 'local' as BackendId, b.id, 1);
    await setTaskRank(taskOrderDb, 'local' as BackendId, a.id, 2);

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q2" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(() => cardTitles(container).length === 2 && cardTitles(container)[0] === 'b');
    expect(cardTitles(container)).toEqual(['b', 'a']);

    // The reset button is rendered because at least one task is ranked.
    const reset = container.querySelector<HTMLButtonElement>('.emt-matrix__cell-reset')!;
    expect(reset).not.toBeNull();
    reset.click();

    // After the mutation settles, the cards collapse to due-date asc.
    await waitFor(() => cardTitles(container)[0] === 'b' && cardTitles(container)[1] === 'a');
    expect(cardTitles(container)).toEqual(['b', 'a']);

    // And the reset button disappears once no tasks in the cell carry
    // a manual rank.
    await waitFor(() => container.querySelector('.emt-matrix__cell-reset') === null);
  });

  it('hides the reset button when no tasks in the cell have a manual rank', async () => {
    const { registry } = await getBackends();
    const adapter = registry.list()[0]!;
    await adapter.create({ ...DRAFT, title: 'a' });

    const { container, unmount } = await renderWithQueryClient(
      <I18nProvider>
        <MatrixCell quadrant="Q2" />
      </I18nProvider>,
    );
    teardown = unmount;

    await waitFor(() => cardTitles(container).length === 1);
    expect(container.querySelector('.emt-matrix__cell-reset')).toBeNull();
  });

  it('persists ranks across fresh DB connections (survives reload)', async () => {
    const { registry, taskOrderDb } = await getBackends();
    const adapter = registry.list()[0]!;
    const t = await adapter.create({ ...DRAFT, title: 'persisted' });
    await setTaskRank(taskOrderDb, 'local' as BackendId, t.id, 42);

    // Drop the cached singleton so the next `getBackends()` re-opens
    // the IDB connection — same database name, fresh handle. Ranks
    // persisted by the prior connection must still be visible.
    __resetBackendsCacheForTesting();
    const reopened = await openTaskOrderDb();
    const round = await reopened.getAll('taskOrder');
    expect(round).toEqual([{ backendId: 'local', taskId: t.id, rank: 42 }]);
    reopened.close();
  });
});
