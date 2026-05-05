export type {
  BackendAdapter,
  BackendCapabilities,
  BackendDescriptor,
  ChangeSet,
  Cursor,
  TaskDraft,
  TaskPatch,
} from './adapter.ts';
export { STORE_NAMES, taskKey } from './cache-schema.js';
export type { CursorRecord, OutboxOp, OutboxRecord, TaskRecord } from './cache-schema.ts';
export type { ConflictRecord, ConflictResolver, DifferingField } from './conflict.ts';
export { runAdapterContract } from './contract-tests.js';
export type { AdapterContractOptions, AdapterFactory, ContractSection } from './contract-tests.js';
export {
  computeDifferingFields,
  createIdbCursorStore,
  createIdbOutboxStore,
  DefaultSyncEngine,
  openSyncDb,
  SYNC_DB_VERSION,
} from './sync-engine.js';
export type {
  CursorStore,
  DefaultSyncEngineOptions,
  LocalTaskCache,
  OutboxAppend,
  OutboxStore,
  SyncDb,
} from './sync-engine.js';
export type { FlushResult, PullResult, SyncEngine, TaskRef } from './sync.ts';
export type {
  BackendId,
  IsoDate,
  IsoDateTime,
  IsoTime,
  Priority,
  Quadrant,
  Task,
  TaskId,
  TaskStatus,
} from './task.ts';
