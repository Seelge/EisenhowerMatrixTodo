/**
 * BackendField — view3 backend selector + migration (Step 8.6).
 *
 * Renders a dropdown of all registered backends. Picking a different
 * backend invokes `useMigrateTask` (Step 2.7) and:
 *
 *  - **Success:** the URL is `replace()`d with the target task's new
 *    `id`. The store's `replace` rewrites history without pushing a
 *    new entry (Backend swap should not stack a Back step). `useTask`
 *    in `TaskView` re-resolves and the surface stays open over the
 *    same view with the migrated record.
 *  - **Target-create failure:** `useMigrateTask.error` is set; an
 *    `ErrorBanner` appears inline with a Retry button. The source
 *    backend is untouched (per `migrateTask` contract).
 *  - **Source-delete failure after target-create:** the migration is
 *    logically committed on the target — view3 still flips to the
 *    new `id` — but a warning snackbar fires letting the user know
 *    the source copy lingered. (Active cleanup retries land later;
 *    today the snackbar is the only signal.)
 *
 * The dropdown disables itself while a migration is in flight.
 *
 * The list of backends is read once on mount from the registry. The
 * registry is effectively static in the phase-8 build (only the local
 * adapter is registered); when remote adapters land we may want to
 * subscribe to registry changes, but that doesn't matter yet.
 */
import type { BackendDescriptor, BackendId, Task } from '@emt/backend-core';
import { ErrorBanner, useSnackbar } from '@emt/design-system';
import { useCallback, useEffect, useId, useState, type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useMigrateTask } from '../../queries/tasks.js';
import { getBackends } from '../../state/backends.js';
import { useViewState, useViewStateStore } from '../../state/view-state.js';

export interface BackendFieldProps {
  task: Task;
}

export function BackendField({ task }: BackendFieldProps): ReactNode {
  const t = useT();
  const selectId = useId();
  const migrate = useMigrateTask();
  const snackbar = useSnackbar();
  const viewState = useViewState();
  const [backends, setBackends] = useState<readonly BackendDescriptor[]>([]);

  useEffect(() => {
    let active = true;
    void getBackends().then(({ registry }) => {
      if (!active) return;
      setBackends(registry.list().map((adapter) => adapter.describe()));
    });
    return () => {
      active = false;
    };
  }, []);

  const onStaleSource = useCallback(() => {
    snackbar.show({ message: t('app.task.fields.backend.staleSource') });
  }, [snackbar, t]);

  const onChange = (e: ChangeEvent<HTMLSelectElement>): void => {
    const toBackendId = e.currentTarget.value as BackendId;
    if (toBackendId === task.backendId) return;
    migrate.mutate(
      {
        taskId: task.id,
        fromBackendId: task.backendId,
        toBackendId,
        onStaleSource,
      },
      {
        onSuccess: (created) => {
          // Rewrite the URL to the new task id so `useTask` re-resolves
          // and view3 stays open over the migrated record.
          useViewStateStore.getState().replace({ ...viewState, focusedTaskId: created.id });
        },
      },
    );
  };

  const retry = useCallback(() => {
    migrate.reset();
  }, [migrate]);

  return (
    <div className="emt-task-view__field" data-field-group="backend">
      <label htmlFor={selectId} className="emt-task-view__label">
        {t('app.task.fields.backend')}
      </label>
      <select
        id={selectId}
        className="emt-task-view__select"
        data-field="backend"
        value={task.backendId}
        onChange={onChange}
        disabled={migrate.isPending || backends.length === 0}
      >
        {backends.map((b) => (
          <option key={b.id} value={b.id}>
            {b.displayName}
          </option>
        ))}
      </select>
      {migrate.isPending && (
        <span
          role="status"
          aria-live="polite"
          className="emt-task-view__progress"
          data-field="backend-progress"
        >
          {t('app.task.fields.backend.migrating')}
        </span>
      )}
      {migrate.isError && (
        <ErrorBanner
          message={t('app.task.fields.backend.error')}
          onRetry={retry}
          retryLabel={t('app.task.fields.backend.dismiss')}
        />
      )}
    </div>
  );
}
