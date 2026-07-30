/**
 * Pure title/notes/tag matcher used by the search overlay (TODO 6).
 *
 * Case-insensitive substring match across title, notes, and tags. An
 * empty/whitespace query matches nothing (the overlay shows an empty
 * state rather than listing every task).
 */
import type { Task } from '@emt/backend-core';

export function normalizeQuery(raw: string): string {
  return raw.trim().toLowerCase();
}

export function taskMatchesQuery(task: Task, normalizedQuery: string): boolean {
  if (normalizedQuery === '') return false;
  if (task.title.toLowerCase().includes(normalizedQuery)) return true;
  if (task.notes.toLowerCase().includes(normalizedQuery)) return true;
  return task.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery));
}

export function filterTasks(tasks: readonly Task[], rawQuery: string): readonly Task[] {
  const q = normalizeQuery(rawQuery);
  if (q === '') return [];
  return tasks.filter((task) => taskMatchesQuery(task, q));
}
