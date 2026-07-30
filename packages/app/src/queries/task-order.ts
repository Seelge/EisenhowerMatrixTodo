/**
 * TanStack Query bindings for the manual `taskOrder` IDB store
 * (Step 5.7).
 *
 * We model the persisted ranks as a single query (`useTaskOrder`)
 * returning the whole `TaskOrderMap`, plus two mutations:
 *
 *   - `useSetTaskRank` — write a rank for one task (drag-end handler).
 *   - `useClearTaskRanks` — clear ranks for a list of tasks (cell's
 *     "Reset to secondary order" action).
 *
 * Loading the entire map at once is fine: the count is bounded by the
 * total task count, the read is a single IDB getAll, and the consumer
 * (the matrix view) needs every cell's ranks anyway. Mutations
 * invalidate the query so all four cells re-sort in lockstep.
 */
import type { BackendId, TaskId } from '@emt/backend-core';
import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { getBackends } from '../state/backends.js';
import {
  clearAllTaskRanks,
  clearTaskRanks,
  loadTaskOrderMap,
  setTaskRank,
  type TaskOrderMap,
} from '../state/task-order.js';

export const TASK_ORDER_KEY = ['taskOrder'] as const;

export function useTaskOrder(): UseQueryResult<TaskOrderMap, Error> {
  return useQuery<TaskOrderMap, Error>({
    queryKey: TASK_ORDER_KEY,
    queryFn: async () => {
      const { taskOrderDb } = await getBackends();
      return loadTaskOrderMap(taskOrderDb);
    },
  });
}

export interface SetTaskRankInput {
  readonly backendId: BackendId;
  readonly taskId: TaskId;
  readonly rank: number;
}

export function useSetTaskRank(): UseMutationResult<void, Error, SetTaskRankInput> {
  const qc = useQueryClient();
  return useMutation<void, Error, SetTaskRankInput>({
    mutationFn: async ({ backendId, taskId, rank }) => {
      const { taskOrderDb } = await getBackends();
      await setTaskRank(taskOrderDb, backendId, taskId, rank);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_ORDER_KEY }),
  });
}

export interface ClearTaskRanksInput {
  readonly refs: readonly { readonly backendId: BackendId; readonly taskId: TaskId }[];
}

export function useClearTaskRanks(): UseMutationResult<void, Error, ClearTaskRanksInput> {
  const qc = useQueryClient();
  return useMutation<void, Error, ClearTaskRanksInput>({
    mutationFn: async ({ refs }) => {
      const { taskOrderDb } = await getBackends();
      await clearTaskRanks(taskOrderDb, refs);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_ORDER_KEY }),
  });
}

/** Drop every manual rank (clear-local / replace-import). */
export function useClearAllTaskRanks(): UseMutationResult<void, Error, void> {
  const qc = useQueryClient();
  return useMutation<void, Error, void>({
    mutationFn: async () => {
      const { taskOrderDb } = await getBackends();
      await clearAllTaskRanks(taskOrderDb);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: TASK_ORDER_KEY }),
  });
}
