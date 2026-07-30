import { describe, expect, it } from 'vitest';

import { applyTaskPatch } from '../src/adapter.ts';
import type { BackendId, Task, TaskId } from '../src/task.ts';

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: 't1' as TaskId,
    backendId: 'local' as BackendId,
    title: 'Hello',
    notes: 'body',
    priority: 'normal',
    quadrant: 'Q1',
    status: 'open',
    tags: ['a'],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    dueDate: '2026-07-01',
    dueTime: '09:30',
    completedAt: '2026-06-01T12:00:00.000Z',
    ...overrides,
  };
}

describe('applyTaskPatch', () => {
  it('overwrites scalar fields and copies tags', () => {
    const next = applyTaskPatch(task(), { title: 'Next', tags: ['b', 'c'] });
    expect(next.title).toBe('Next');
    expect(next.tags).toEqual(['b', 'c']);
    expect(next.tags).not.toBe(task().tags);
  });

  it('clears optional fields with null', () => {
    const next = applyTaskPatch(task(), {
      dueDate: null,
      dueTime: null,
      completedAt: null,
    });
    expect(next.dueDate).toBeUndefined();
    expect(next.dueTime).toBeUndefined();
    expect(next.completedAt).toBeUndefined();
    expect('dueDate' in next).toBe(false);
  });

  it('leaves omitted clearable fields alone', () => {
    const next = applyTaskPatch(task(), { title: 'x' });
    expect(next.dueDate).toBe('2026-07-01');
    expect(next.dueTime).toBe('09:30');
  });

  it('sets clearable fields when provided', () => {
    const base = task({ dueDate: undefined, dueTime: undefined });
    delete base.dueDate;
    delete base.dueTime;
    const next = applyTaskPatch(base, { dueDate: '2026-08-01', dueTime: '14:00' });
    expect(next.dueDate).toBe('2026-08-01');
    expect(next.dueTime).toBe('14:00');
  });
});
