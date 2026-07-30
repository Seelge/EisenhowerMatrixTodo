/**
 * TanStack Query hooks for tasks.
 *
 * Reads aggregate across all registered backends — phase 4 only has
 * `local`, but as Google / Microsoft adapters register the same hooks
 * surface their tasks too without per-call wiring. Writes are scoped
 * to a specific backend (the registry's default for create; the task's
 * own `backendId` for update / delete; explicit source/target for
 * migrate).
 *
 * Cache strategy: `useUpdateTask` applies an optimistic patch to every
 * `['tasks']` entry (via `applyOptimisticPatch`) so status / move /
 * priority feel instant; on settle, invalidation replaces optimism with
 * the adapter result. Create / delete keep their own optimistic paths
 * (QuickComposer / snackbar undo).
 */
import {
  migrateTask,
  type BackendId,
  type Quadrant,
  type StaleSourceEvent,
  type Task,
  type TaskDraft,
  type TaskId,
  type TaskPatch,
} from '@emt/backend-core';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { getBackends } from '../state/backends.js';
import { applyOptimisticPatch, findCachedTask } from '../views/matrix/dnd.js';

const TASKS_KEY = ['tasks'] as const;

function invalidateAll(qc: ReturnType<typeof useQueryClient>): Promise<void> {
  return qc.invalidateQueries({ queryKey: TASKS_KEY });
}

/**
 * List tasks across all registered backends, optionally filtered to a
 * single quadrant. Returns canonical {@link Task} records — caller
 * sorts.
 */
export function useTasks(quadrant?: Quadrant): UseQueryResult<readonly Task[], Error> {
  return useQuery<readonly Task[], Error>({
    queryKey: [...TASKS_KEY, 'list', quadrant ?? 'all'],
    queryFn: async () => {
      const { registry } = await getBackends();
      const all: Task[] = [];
      for (const adapter of registry.list()) {
        const part = await adapter.list(quadrant);
        all.push(...part);
      }
      return all;
    },
  });
}

/**
 * Look up a single task by id across all registered backends. Returns
 * `undefined` if no backend has the task. Useful for view3 where the
 * URL only carries the task id.
 */
export function useTask(id: TaskId | undefined): UseQueryResult<Task | undefined, Error> {
  return useQuery<Task | undefined, Error>({
    queryKey: [...TASKS_KEY, 'one', id ?? null],
    enabled: id !== undefined,
    queryFn: async () => {
      if (id === undefined) return undefined;
      const { registry } = await getBackends();
      for (const adapter of registry.list()) {
        const found = await adapter.get(id);
        if (found !== undefined) return found;
      }
      return undefined;
    },
  });
}

export interface CreateTaskInput {
  readonly draft: TaskDraft;
  /** Override the registry default (e.g., view3's backend selector). */
  readonly backendId?: BackendId;
}

export function useCreateTask(): UseMutationResult<Task, Error, CreateTaskInput> {
  const qc = useQueryClient();
  return useMutation<Task, Error, CreateTaskInput>({
    mutationFn: async ({ draft, backendId }) => {
      const { registry } = await getBackends();
      const adapter = backendId !== undefined ? registry.get(backendId) : registry.getDefault();
      if (adapter === undefined) {
        throw new Error('No backend available to create task');
      }
      return adapter.create(draft);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export interface UpdateTaskInput {
  readonly backendId: BackendId;
  readonly id: TaskId;
  readonly patch: TaskPatch;
}

interface UpdateTaskContext {
  readonly rollback?: () => void;
}

export function useUpdateTask(): UseMutationResult<
  Task,
  Error,
  UpdateTaskInput,
  UpdateTaskContext
> {
  const qc = useQueryClient();
  return useMutation<Task, Error, UpdateTaskInput, UpdateTaskContext>({
    mutationFn: async ({ backendId, id, patch }) => {
      const { registry } = await getBackends();
      const adapter = registry.get(backendId);
      if (adapter === undefined) {
        throw new Error(`Unknown backend "${String(backendId)}"`);
      }
      return adapter.update(id, patch);
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: TASKS_KEY });
      const cached = findCachedTask(qc, id);
      if (cached === undefined) return {};
      return { rollback: applyOptimisticPatch(qc, cached, patch) };
    },
    onError: (_err, _input, ctx) => {
      ctx?.rollback?.();
    },
    onSettled: () => invalidateAll(qc),
  });
}

export interface DeleteTaskInput {
  readonly backendId: BackendId;
  readonly id: TaskId;
}

export function useDeleteTask(): UseMutationResult<void, Error, DeleteTaskInput> {
  const qc = useQueryClient();
  return useMutation<void, Error, DeleteTaskInput>({
    mutationFn: async ({ backendId, id }) => {
      const { registry } = await getBackends();
      const adapter = registry.get(backendId);
      if (adapter === undefined) {
        throw new Error(`Unknown backend "${String(backendId)}"`);
      }
      await adapter.delete(id);
    },
    onSuccess: () => invalidateAll(qc),
  });
}

export interface MigrateTaskInput {
  readonly taskId: TaskId;
  readonly fromBackendId: BackendId;
  readonly toBackendId: BackendId;
  /**
   * Called when target-create succeeded but the source-delete then
   * failed. The target task is still returned to the mutation; the
   * caller typically surfaces a warning and queues the source for
   * cleanup retry.
   */
  readonly onStaleSource?: (event: StaleSourceEvent) => void;
}

export function useMigrateTask(): UseMutationResult<Task, Error, MigrateTaskInput> {
  const qc = useQueryClient();
  return useMutation<Task, Error, MigrateTaskInput>({
    mutationFn: async ({ taskId, fromBackendId, toBackendId, onStaleSource }) => {
      const { registry } = await getBackends();
      return migrateTask(
        {
          getAdapter: (id) => registry.get(id),
          ...(onStaleSource !== undefined ? { onStaleSource } : {}),
        },
        taskId,
        fromBackendId,
        toBackendId,
      );
    },
    onSuccess: () => invalidateAll(qc),
  });
}
