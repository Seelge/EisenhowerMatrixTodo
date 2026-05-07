/**
 * First-run seed.
 *
 * On the very first load against an empty IDB the app inserts three
 * sample tasks (one Q1, one Q2, one done in Q4) so the matrix is not
 * a blank slate. Subsequent loads must not reseed — that's the
 * "Done when: reload → no duplicates" criterion in plan step 4.4.
 *
 * Idempotency mechanism: a meta-store flag (`META_FIRST_RUN_KEY`) is
 * written after a successful seed. On every subsequent boot the flag
 * is present, the seed short-circuits, and the function returns
 * `{ seeded: false }`. The flag is *not* cleared on user-initiated
 * delete-all / clear-storage actions; clearing IDB itself drops the
 * flag along with the seeded rows, restoring the empty-database
 * precondition that triggers another seed.
 *
 * Race safety: a module-level `Promise` guard ensures the body runs
 * at most once per page load even if the seed function is called
 * multiple times concurrently (e.g. React StrictMode's double-mount
 * effect, or two views invoking it at startup). Tests can reset the
 * guard via `__resetFirstRunForTesting()`.
 */
import type { TaskDraft } from '@emt/backend-core';

import { getBackends } from '../state/backends.js';

/** Meta key under which the first-run-completed flag is persisted. */
export const META_FIRST_RUN_KEY = 'firstRunCompleted';

/**
 * Sample tasks seeded on first run. The set deliberately covers three
 * quadrants and a `done` status so the matrix view starts non-empty
 * across all primary cells.
 */
export const SAMPLE_TASKS: readonly TaskDraft[] = [
  {
    title: 'Reply to the urgent email',
    notes: 'Sample task — Q1 (urgent + important).',
    priority: 'high',
    quadrant: 'Q1',
    status: 'open',
    tags: [],
  },
  {
    title: 'Plan next week',
    notes: 'Sample task — Q2 (important, not urgent).',
    priority: 'normal',
    quadrant: 'Q2',
    status: 'open',
    tags: [],
  },
  {
    title: 'Old to-do (already done)',
    notes: 'Sample task — Q4 (neither), completed.',
    priority: 'none',
    quadrant: 'Q4',
    status: 'done',
    completedAt: new Date().toISOString(),
    tags: [],
  },
];

export interface FirstRunResult {
  /** True when this call inserted the sample tasks; false on subsequent calls. */
  readonly seeded: boolean;
}

let inFlight: Promise<FirstRunResult> | undefined;

/**
 * Seed the sample tasks if this is the first run. Concurrent callers
 * share the same in-flight promise; subsequent callers (after the
 * promise has resolved) re-enter the function, see the meta flag,
 * and short-circuit.
 */
export function runFirstRunSeed(): Promise<FirstRunResult> {
  if (inFlight === undefined) {
    inFlight = doSeed().catch((err) => {
      // On failure, drop the in-flight promise so a later call can
      // retry — the meta flag was never written, so re-running is safe.
      inFlight = undefined;
      throw err;
    });
  }
  return inFlight;
}

async function doSeed(): Promise<FirstRunResult> {
  const { meta, registry } = await getBackends();
  if ((await meta.get(META_FIRST_RUN_KEY)) === 'true') {
    return { seeded: false };
  }
  const adapter = registry.getDefault();
  if (adapter === undefined) {
    throw new Error('First-run seed requires a default backend');
  }
  for (const draft of SAMPLE_TASKS) {
    await adapter.create(draft);
  }
  await meta.set(META_FIRST_RUN_KEY, 'true');
  return { seeded: true };
}

/** Drops the in-flight cache. Tests only. */
export function __resetFirstRunForTesting(): void {
  inFlight = undefined;
}
