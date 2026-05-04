/**
 * IndexedDB schema for the local backend.
 *
 * The local backend stores tasks in its own IndexedDB database (separate
 * from the cache layer in front of remote backends).
 *
 * # Schema versions
 *
 * - **v1** — single `tasks` store keyed by {@link TaskId}, with the
 *   `byQuadrant`, `byStatus`, `byUpdatedAt` indexes. No change tracking.
 * - **v2** (current) — adds change tracking:
 *   - `tasks` records gain a monotonic `seq` field plus a `bySeq` index.
 *   - `deletions` store keyed by {@link TaskId} records tombstones
 *     `{ id, seq }` so `changesSince` can report removed tasks.
 *   - `meta` store holds the next available sequence number under the
 *     `'nextSeq'` key.
 *
 * Records persisted in `tasks` carry the canonical {@link Task} fields
 * plus an internal `seq`. The adapter strips `seq` before returning a
 * record to callers; `seq` never leaves this package.
 */

import type { Task, TaskId } from '@emt/backend-core';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export const DB_VERSION = 2;
export const TASKS_STORE = 'tasks';
export const DELETIONS_STORE = 'deletions';
export const META_STORE = 'meta';

/** Internal record shape persisted in the `tasks` store. */
export interface LocalTaskRecord extends Task {
  /** Per-database monotonic sequence number assigned on every write. */
  readonly seq: number;
}

/** Internal record shape persisted in the `deletions` store. */
export interface DeletionRecord {
  readonly id: TaskId;
  readonly seq: number;
}

export interface LocalDbSchema extends DBSchema {
  [TASKS_STORE]: {
    key: TaskId;
    value: LocalTaskRecord;
    indexes: {
      byQuadrant: Task['quadrant'];
      byStatus: Task['status'];
      byUpdatedAt: Task['updatedAt'];
      bySeq: number;
    };
  };
  [DELETIONS_STORE]: {
    key: TaskId;
    value: DeletionRecord;
    indexes: {
      bySeq: number;
    };
  };
  [META_STORE]: {
    key: 'nextSeq';
    value: number;
  };
}

export type LocalDb = IDBPDatabase<LocalDbSchema>;

/**
 * Open (and migrate) the local-backend database. Each database name is
 * an independent backend instance; tests use unique names so suites
 * don't collide.
 */
export function openLocalDb(name: string): Promise<LocalDb> {
  return openDB<LocalDbSchema>(name, DB_VERSION, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
        store.createIndex('byQuadrant', 'quadrant');
        store.createIndex('byStatus', 'status');
        store.createIndex('byUpdatedAt', 'updatedAt');
      }

      if (oldVersion < 2) {
        const tasksStore = tx.objectStore(TASKS_STORE);
        tasksStore.createIndex('bySeq', 'seq');

        const deletionsStore = db.createObjectStore(DELETIONS_STORE, { keyPath: 'id' });
        deletionsStore.createIndex('bySeq', 'seq');

        db.createObjectStore(META_STORE);

        // Backfill seq on any pre-existing records so `bySeq` is dense
        // and the cursor watermark stays correct.
        let nextSeq = 1;
        let cursor = await tasksStore.openCursor();
        while (cursor) {
          await cursor.update({ ...cursor.value, seq: nextSeq });
          nextSeq += 1;
          cursor = await cursor.continue();
        }
        await tx.objectStore(META_STORE).put(nextSeq, 'nextSeq');
      }
    },
  });
}
