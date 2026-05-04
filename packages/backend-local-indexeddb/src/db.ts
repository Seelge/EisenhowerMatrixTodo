/**
 * IndexedDB schema for the local backend.
 *
 * The local backend stores tasks in its own IndexedDB database (separate
 * from the cache layer in front of remote backends). One row per task,
 * keyed by `Task.id`. Indexes back the `list(quadrant)` filter and any
 * future query needs.
 *
 * Version 1: `tasks` store only. Step 2.3 introduces v2 with change
 * tracking (per-record `seq` and a `deletions` store).
 */

import type { Task, TaskId } from '@emt/backend-core';
import { type DBSchema, type IDBPDatabase, openDB } from 'idb';

export const DB_VERSION = 1;
export const TASKS_STORE = 'tasks';

export interface LocalDbSchema extends DBSchema {
  [TASKS_STORE]: {
    key: TaskId;
    value: Task;
    indexes: {
      byQuadrant: Task['quadrant'];
      byStatus: Task['status'];
      byUpdatedAt: Task['updatedAt'];
    };
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
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        const store = db.createObjectStore(TASKS_STORE, { keyPath: 'id' });
        store.createIndex('byQuadrant', 'quadrant');
        store.createIndex('byStatus', 'status');
        store.createIndex('byUpdatedAt', 'updatedAt');
      }
    },
  });
}
