/**
 * Pure matcher coverage for the search overlay (TODO 6).
 */
import type { BackendId, Task, TaskId } from '@emt/backend-core';
import { describe, expect, it } from 'vitest';

import { filterTasks, normalizeQuery, taskMatchesQuery } from '../src/views/search/search-match.ts';

function task(partial: Partial<Task> & Pick<Task, 'title'>): Task {
  return {
    id: (partial.id ?? 't1') as TaskId,
    backendId: (partial.backendId ?? 'local') as BackendId,
    title: partial.title,
    notes: partial.notes ?? '',
    priority: partial.priority ?? 'normal',
    quadrant: partial.quadrant ?? 'Q1',
    status: partial.status ?? 'open',
    tags: partial.tags ?? [],
    createdAt: partial.createdAt ?? '2026-01-01T00:00:00.000Z',
    updatedAt: partial.updatedAt ?? '2026-01-01T00:00:00.000Z',
    ...(partial.dueDate !== undefined ? { dueDate: partial.dueDate } : {}),
  };
}

describe('search-match', () => {
  it('normalizeQuery trims and lowercases', () => {
    expect(normalizeQuery('  Hello  ')).toBe('hello');
    expect(normalizeQuery('')).toBe('');
  });

  it('matches title case-insensitively', () => {
    const t = task({ title: 'Buy Milk' });
    expect(taskMatchesQuery(t, 'milk')).toBe(true);
    expect(taskMatchesQuery(t, 'buy')).toBe(true);
    expect(taskMatchesQuery(t, 'eggs')).toBe(false);
  });

  it('matches notes and tags', () => {
    const t = task({ title: 'Chore', notes: 'Call the plumber', tags: ['home', 'urgent'] });
    expect(taskMatchesQuery(t, 'plumber')).toBe(true);
    expect(taskMatchesQuery(t, 'home')).toBe(true);
    expect(taskMatchesQuery(t, 'work')).toBe(false);
  });

  it('empty query matches nothing', () => {
    const t = task({ title: 'Anything' });
    expect(taskMatchesQuery(t, '')).toBe(false);
    expect(filterTasks([t], '   ')).toEqual([]);
  });

  it('filterTasks returns only hits', () => {
    const tasks = [
      task({ id: 'a' as TaskId, title: 'Alpha' }),
      task({ id: 'b' as TaskId, title: 'Beta', notes: 'alpha-ish' }),
      task({ id: 'c' as TaskId, title: 'Gamma' }),
    ];
    const hits = filterTasks(tasks, 'alpha');
    expect(hits.map((h) => h.id)).toEqual(['a', 'b']);
  });
});
