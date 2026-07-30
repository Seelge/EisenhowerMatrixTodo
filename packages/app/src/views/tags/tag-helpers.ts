/**
 * Pure tag helpers (Phase 14 / TODO 5).
 *
 * Tags are free-form strings on {@link Task.tags}. Normalisation keeps
 * the surface predictable without a separate tag registry: trim,
 * collapse internal whitespace, case-fold for equality, keep the first
 * seen casing as the display form when collecting.
 */
import type { Task } from '@emt/backend-core';

/** Max length of a single tag after normalisation. */
export const MAX_TAG_LENGTH = 32;

/** Cap on tags per task so chips stay scannable. */
export const MAX_TAGS_PER_TASK = 12;

export function normalizeTag(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').slice(0, MAX_TAG_LENGTH);
}

/** Case-folded key used for equality / Set membership. */
export function tagKey(tag: string): string {
  return normalizeTag(tag).toLowerCase();
}

/**
 * Parse a free-text tag input. Accepts comma or Enter-separated values
 * (the field splits on commas; single tokens come through as one entry).
 */
export function parseTagInput(raw: string): readonly string[] {
  return raw
    .split(',')
    .map(normalizeTag)
    .filter((t) => t.length > 0);
}

/** True when `task.tags` already contains a tag equal to `candidate`. */
export function taskHasTag(task: Task, candidate: string): boolean {
  const key = tagKey(candidate);
  if (key === '') return false;
  return task.tags.some((t) => tagKey(t) === key);
}

/**
 * Merge new tags into an existing list without duplicates (case-insensitive).
 * Preserves existing casing; new tags keep the casing the user typed.
 */
export function mergeTags(
  existing: readonly string[],
  additions: readonly string[],
): readonly string[] {
  const out: string[] = [...existing];
  const seen = new Set(existing.map(tagKey));
  for (const raw of additions) {
    const next = normalizeTag(raw);
    const key = tagKey(next);
    if (key === '' || seen.has(key)) continue;
    if (out.length >= MAX_TAGS_PER_TASK) break;
    seen.add(key);
    out.push(next);
  }
  return out;
}

export function removeTag(existing: readonly string[], toRemove: string): readonly string[] {
  const key = tagKey(toRemove);
  return existing.filter((t) => tagKey(t) !== key);
}

export interface TagCount {
  readonly tag: string;
  readonly count: number;
}

/**
 * Collect unique tags across tasks with occurrence counts. Display
 * casing is the first-seen form; counts are case-insensitive.
 */
export function collectTagCounts(tasks: readonly Task[]): readonly TagCount[] {
  const byKey = new Map<string, { tag: string; count: number }>();
  for (const task of tasks) {
    for (const raw of task.tags) {
      const key = tagKey(raw);
      if (key === '') continue;
      const entry = byKey.get(key);
      if (entry === undefined) {
        byKey.set(key, { tag: normalizeTag(raw), count: 1 });
      } else {
        entry.count += 1;
      }
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' });
  });
}

export function filterTasksByTag(
  tasks: readonly Task[],
  activeTag: string | undefined,
): readonly Task[] {
  if (activeTag === undefined || tagKey(activeTag) === '') return tasks;
  const key = tagKey(activeTag);
  return tasks.filter((task) => task.tags.some((t) => tagKey(t) === key));
}
