/**
 * Pure tag helpers (Phase 14).
 */
import type { BackendId, Task, TaskId } from '@emt/backend-core';
import { describe, expect, it } from 'vitest';

import {
  collectTagCounts,
  filterTasksByTag,
  mergeTags,
  normalizeTag,
  parseTagInput,
  removeTag,
  taskHasTag,
} from '../src/views/tags/tag-helpers.ts';

function task(partial: Partial<Task> & Pick<Task, 'title' | 'tags'>): Task {
  return {
    id: (partial.id ?? 't1') as TaskId,
    backendId: (partial.backendId ?? 'local') as BackendId,
    title: partial.title,
    notes: partial.notes ?? '',
    priority: partial.priority ?? 'normal',
    quadrant: partial.quadrant ?? 'Q1',
    status: partial.status ?? 'open',
    tags: partial.tags,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('tag-helpers', () => {
  it('normalizeTag trims and collapses whitespace', () => {
    expect(normalizeTag('  hello   world  ')).toBe('hello world');
  });

  it('parseTagInput splits on commas', () => {
    expect(parseTagInput('work, home, ')).toEqual(['work', 'home']);
  });

  it('mergeTags dedupes case-insensitively and preserves first casing', () => {
    expect(mergeTags(['Work'], ['work', 'home'])).toEqual(['Work', 'home']);
  });

  it('removeTag is case-insensitive', () => {
    expect(removeTag(['Work', 'home'], 'work')).toEqual(['home']);
  });

  it('taskHasTag matches case-insensitively', () => {
    const t = task({ title: 'a', tags: ['Work'] });
    expect(taskHasTag(t, 'work')).toBe(true);
    expect(taskHasTag(t, 'home')).toBe(false);
  });

  it('collectTagCounts aggregates and sorts by frequency', () => {
    const tasks = [
      task({ id: 'a' as TaskId, title: 'a', tags: ['work', 'home'] }),
      task({ id: 'b' as TaskId, title: 'b', tags: ['Work'] }),
      task({ id: 'c' as TaskId, title: 'c', tags: ['errand'] }),
    ];
    const counts = collectTagCounts(tasks);
    expect(counts[0]).toMatchObject({ tag: 'work', count: 2 });
    expect(counts.map((c) => c.tag)).toContain('home');
    expect(counts.map((c) => c.tag)).toContain('errand');
  });

  it('filterTasksByTag keeps only matching tasks', () => {
    const tasks = [
      task({ id: 'a' as TaskId, title: 'a', tags: ['work'] }),
      task({ id: 'b' as TaskId, title: 'b', tags: ['home'] }),
    ];
    expect(filterTasksByTag(tasks, 'work').map((t) => t.id)).toEqual(['a']);
    expect(filterTasksByTag(tasks, undefined)).toHaveLength(2);
  });
});
