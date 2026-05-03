/**
 * Canonical task model and supporting types.
 *
 * The `Task` shape is the canonical representation across all backends.
 * Each adapter is responsible for round-tripping these fields losslessly,
 * encoding any field its underlying backend cannot represent natively
 * into the `notes` field (see `design-input.md` for the field mapping).
 */

/** Branded string identifying a task within a backend. */
export type TaskId = string & { readonly __brand: 'TaskId' };

/** Branded string identifying a registered backend. */
export type BackendId = string & { readonly __brand: 'BackendId' };

/**
 * Eisenhower matrix quadrant.
 * - `Q1`: Important + Urgent (Do)
 * - `Q2`: Important, not Urgent (Schedule)
 * - `Q3`: Urgent, not Important (Delegate)
 * - `Q4`: Neither (Delete)
 */
export type Quadrant = 'Q1' | 'Q2' | 'Q3' | 'Q4';

/** Priority level for a task. */
export type Priority = 'none' | 'low' | 'normal' | 'high';

/** Lifecycle state of a task. */
export type TaskStatus = 'open' | 'done';

/** ISO 8601 calendar date (YYYY-MM-DD). */
export type IsoDate = string;

/** ISO 8601 time of day (HH:mm or HH:mm:ss). */
export type IsoTime = string;

/** ISO 8601 datetime (with offset). */
export type IsoDateTime = string;

/**
 * Canonical task. All backends produce and consume this shape.
 * Backend-unsupported optional fields are encoded into `notes` by the adapter.
 */
export interface Task {
  readonly id: TaskId;
  readonly backendId: BackendId;
  title: string;
  notes: string;
  dueDate?: IsoDate;
  dueTime?: IsoTime;
  priority: Priority;
  quadrant: Quadrant;
  status: TaskStatus;
  completedAt?: IsoDateTime;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  tags: readonly string[];
}
