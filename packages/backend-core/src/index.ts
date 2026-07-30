export type {
  BackendAdapter,
  BackendCapabilities,
  BackendDescriptor,
  ChangeSet,
  Cursor,
  TaskDraft,
  TaskPatch,
} from './adapter.ts';
export { META_DEFAULT_BACKEND_KEY, STORE_NAMES, taskKey } from './cache-schema.js';
export type {
  CursorRecord,
  MetaRecord,
  OutboxOp,
  OutboxRecord,
  TaskRecord,
} from './cache-schema.ts';
export type {
  ConflictRecord,
  ConflictResolution,
  ConflictResolver,
  DifferingField,
} from './conflict.ts';
export { buildMergedTask, resolutionFromFieldPicks } from './conflict.js';
export { runAdapterContract } from './contract-tests.js';
export type { AdapterContractOptions, AdapterFactory, ContractSection } from './contract-tests.js';
export { migrateTask } from './migrate.js';
export type { MigrateOptions, StaleSourceEvent } from './migrate.js';
export { BackendRegistry } from './registry.js';
export type { BackendRegistryOptions, MetaStore } from './registry.js';
export {
  computeDifferingFields,
  createIdbCursorStore,
  createIdbMetaStore,
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
