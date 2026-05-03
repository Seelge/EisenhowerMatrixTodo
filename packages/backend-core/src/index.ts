export type {
  BackendAdapter,
  BackendCapabilities,
  BackendDescriptor,
  ChangeSet,
  Cursor,
  TaskDraft,
  TaskPatch,
} from './adapter.ts';
export type { ConflictRecord, ConflictResolver, DifferingField } from './conflict.ts';
export { runAdapterContract } from './contract-tests.js';
export type { AdapterFactory } from './contract-tests.js';
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
