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

/**
 * Ranked autocomplete candidates (Phase 18).
 * Empty query → top inventory by count. Non-empty → prefix first, then
 * substring; then count desc, then localeCompare. Excludes already-applied
 * tags (case-insensitive).
 */
export function suggestTags(
  inventory: readonly TagCount[],
  query: string,
  options?: {
    readonly exclude?: readonly string[];
    readonly limit?: number;
  },
): readonly string[] {
  const limit = options?.limit ?? 8;
  const exclude = new Set((options?.exclude ?? []).map(tagKey).filter((k) => k !== ''));
  const candidates = inventory.filter((c) => !exclude.has(tagKey(c.tag)));
  const q = normalizeTag(query).toLowerCase();

  if (q === '') {
    return [...candidates]
      .sort((a, b) => {
        if (b.count !== a.count) return b.count - a.count;
        return a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' });
      })
      .slice(0, limit)
      .map((c) => c.tag);
  }

  type Scored = { tag: string; count: number; prefix: boolean };
  const scored: Scored[] = [];
  for (const c of candidates) {
    const key = tagKey(c.tag);
    if (!key.includes(q)) continue;
    scored.push({ tag: c.tag, count: c.count, prefix: key.startsWith(q) });
  }
  scored.sort((a, b) => {
    if (a.prefix !== b.prefix) return a.prefix ? -1 : 1;
    if (b.count !== a.count) return b.count - a.count;
    return a.tag.localeCompare(b.tag, undefined, { sensitivity: 'base' });
  });
  return scored.slice(0, limit).map((s) => s.tag);
}

/** Text after the last comma — the in-progress token in a multi-tag input. */
export function incompleteTagQuery(raw: string): string {
  const i = raw.lastIndexOf(',');
  return i === -1 ? raw : raw.slice(i + 1);
}

/** Fully committed tags in a comma input (everything before the last comma). */
export function committedTagsFromInput(raw: string): readonly string[] {
  const i = raw.lastIndexOf(',');
  if (i === -1) return [];
  return parseTagInput(raw.slice(0, i));
}

/** Replace the incomplete trailing token with a picked tag and leave room for another. */
export function applySuggestedTag(raw: string, tag: string): string {
  const prior = committedTagsFromInput(raw);
  return `${mergeTags(prior, [tag]).join(', ')}, `;
}

/**
 * Rename `from` → `to` inside one task's tag list (case-insensitive).
 * - Casing-only rename rewrites the display form.
 * - If the task already has `to`, `from` is dropped (merge).
 * - Unchanged lists return the same array reference.
 */
export function renameTagInList(
  tags: readonly string[],
  from: string,
  to: string,
): readonly string[] {
  const fromKey = tagKey(from);
  const toNorm = normalizeTag(to);
  const toKey = tagKey(toNorm);
  if (fromKey === '' || toKey === '') return tags;

  if (fromKey === toKey) {
    let changed = false;
    const next = tags.map((t) => {
      if (tagKey(t) !== fromKey) return t;
      if (t === toNorm) return t;
      changed = true;
      return toNorm;
    });
    return changed ? next : tags;
  }

  let hadFrom = false;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const t of tags) {
    const k = tagKey(t);
    if (k === fromKey) {
      hadFrom = true;
      if (!seen.has(toKey)) {
        out.push(toNorm);
        seen.add(toKey);
      }
      continue;
    }
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return hadFrom ? out : tags;
}

/** One task that needs a tags write after a global rename/delete. */
export interface TagBulkPatch {
  readonly id: Task['id'];
  readonly backendId: Task['backendId'];
  readonly tags: readonly string[];
  /** Prior tags — used to reverse a partial bulk apply. */
  readonly previousTags: readonly string[];
}

/** Plan per-task tag patches for a global rename. Empty when nothing matches. */
export function planTagRename(
  tasks: readonly Task[],
  from: string,
  to: string,
): readonly TagBulkPatch[] {
  const patches: TagBulkPatch[] = [];
  for (const task of tasks) {
    const next = renameTagInList(task.tags, from, to);
    if (next === task.tags) continue;
    patches.push({
      id: task.id,
      backendId: task.backendId,
      tags: next,
      previousTags: [...task.tags],
    });
  }
  return patches;
}

/** Plan per-task tag patches for a global delete. */
export function planTagDelete(tasks: readonly Task[], tag: string): readonly TagBulkPatch[] {
  const key = tagKey(tag);
  if (key === '') return [];
  const patches: TagBulkPatch[] = [];
  for (const task of tasks) {
    if (!task.tags.some((t) => tagKey(t) === key)) continue;
    patches.push({
      id: task.id,
      backendId: task.backendId,
      tags: removeTag(task.tags, tag),
      previousTags: [...task.tags],
    });
  }
  return patches;
}
