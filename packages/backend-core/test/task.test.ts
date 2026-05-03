import { describe, expectTypeOf, it } from 'vitest';

import type { BackendId, Priority, Quadrant, Task, TaskId, TaskStatus } from '../src/task.ts';

describe('Task model types', () => {
  it('accepts a fully-populated literal', () => {
    const sample: Task = {
      id: 'task-1' as TaskId,
      backendId: 'local' as BackendId,
      title: 'Write the spec',
      notes: 'Outline the canonical model first.',
      dueDate: '2026-06-01',
      dueTime: '15:00',
      priority: 'high',
      quadrant: 'Q2',
      status: 'open',
      completedAt: undefined,
      createdAt: '2026-05-03T10:00:00+02:00',
      updatedAt: '2026-05-03T10:00:00+02:00',
      tags: ['work'],
    };
    expectTypeOf(sample).toEqualTypeOf<Task>();
  });

  it('accepts a minimal literal (omitting optional fields)', () => {
    const sample: Task = {
      id: 'task-2' as TaskId,
      backendId: 'local' as BackendId,
      title: 'Take out the trash',
      notes: '',
      priority: 'normal',
      quadrant: 'Q1',
      status: 'open',
      createdAt: '2026-05-03T10:00:00+02:00',
      updatedAt: '2026-05-03T10:00:00+02:00',
      tags: [],
    };
    expectTypeOf(sample).toEqualTypeOf<Task>();
  });

  it('rejects unbranded strings for ids', () => {
    // @ts-expect-error — bare strings cannot satisfy TaskId / BackendId
    const _bad: Task = {
      id: 'task-1',
      backendId: 'local',
      title: 't',
      notes: '',
      priority: 'normal',
      quadrant: 'Q1',
      status: 'open',
      createdAt: '2026-05-03T10:00:00+02:00',
      updatedAt: '2026-05-03T10:00:00+02:00',
      tags: [],
    };
    expectTypeOf<TaskId>().not.toEqualTypeOf<string>();
    expectTypeOf<BackendId>().not.toEqualTypeOf<string>();
  });

  it('constrains enum-like fields to their literal unions', () => {
    expectTypeOf<Quadrant>().toEqualTypeOf<'Q1' | 'Q2' | 'Q3' | 'Q4'>();
    expectTypeOf<Priority>().toEqualTypeOf<'none' | 'low' | 'normal' | 'high'>();
    expectTypeOf<TaskStatus>().toEqualTypeOf<'open' | 'done'>();
  });
});
