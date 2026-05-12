/**
 * QuadrantField — view3 quadrant editor (Step 8.5).
 *
 * Mounts the design-system `QuadrantPicker` (Step 3.6) with the task's
 * current quadrant highlighted. Changing the selection writes through
 * `useUpdateTask`; the matrix below view3 picks up the new quadrant
 * via the existing `['tasks']` cache invalidation in `useUpdateTask`'s
 * `onSuccess`, so the moved card vanishes from its old cell and
 * appears in the new one on the next paint without any view3-specific
 * cross-component plumbing.
 *
 * The design-system uses lowercase `q1`/`q2`/... while the canonical
 * `Task.quadrant` is uppercase `Q1`/`Q2`/... — same translation tables
 * as `QuickComposer` (kept local since the picker is the only place
 * where the two casings meet).
 */
import type { Quadrant, Task } from '@emt/backend-core';
import { QuadrantPicker, type Quadrant as DsQuadrant } from '@emt/design-system';
import type { ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';
import { useUpdateTask } from '../../queries/tasks.js';

const TO_DS: Record<Quadrant, DsQuadrant> = { Q1: 'q1', Q2: 'q2', Q3: 'q3', Q4: 'q4' };
const FROM_DS: Record<DsQuadrant, Quadrant> = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'Q4' };

const PICKER_LABEL_KEY: Record<DsQuadrant, StringKey> = {
  q1: 'app.matrix.cell.q1.label',
  q2: 'app.matrix.cell.q2.label',
  q3: 'app.matrix.cell.q3.label',
  q4: 'app.matrix.cell.q4.label',
};

export interface QuadrantFieldProps {
  task: Task;
}

export function QuadrantField({ task }: QuadrantFieldProps): ReactNode {
  const t = useT();
  const updateTask = useUpdateTask();

  const onChange = (next: DsQuadrant): void => {
    const target = FROM_DS[next];
    if (target === task.quadrant) return;
    updateTask.mutate({ backendId: task.backendId, id: task.id, patch: { quadrant: target } });
  };

  return (
    <div className="emt-task-view__field" data-field-group="quadrant">
      <span className="emt-task-view__label">{t('app.task.fields.quadrant')}</span>
      <QuadrantPicker
        value={TO_DS[task.quadrant]}
        onChange={onChange}
        aria-label={t('app.task.fields.quadrant')}
        labels={{
          q1: t(PICKER_LABEL_KEY.q1),
          q2: t(PICKER_LABEL_KEY.q2),
          q3: t(PICKER_LABEL_KEY.q3),
          q4: t(PICKER_LABEL_KEY.q4),
        }}
      />
    </div>
  );
}
