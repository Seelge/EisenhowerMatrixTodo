/**
 * ConflictModal — view5 conflict resolution surface (Step 10.1 / Phase 21).
 *
 * Displays local and remote side by side with differing fields
 * highlighted. The user can:
 *  - Keep all local / Keep all remote (whole-record shortcuts)
 *  - Click individual field values to pick a side, then Apply selection
 *
 * Outcome is a {@link ConflictResolution} (`'local' | 'remote' | { merged }`).
 */
import {
  resolutionFromFieldPicks,
  type ConflictRecord,
  type ConflictResolution,
  type DifferingField,
  type Task,
} from '@emt/backend-core';
import { Button, useDialogBehavior } from '@emt/design-system';
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';

import './conflict-modal.css';

export interface ConflictModalProps {
  open: boolean;
  record: ConflictRecord | undefined;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel?: () => void;
}

const FIELD_LABEL: Record<DifferingField, StringKey> = {
  title: 'app.conflict.field.title',
  notes: 'app.conflict.field.notes',
  dueDate: 'app.conflict.field.dueDate',
  dueTime: 'app.conflict.field.dueTime',
  priority: 'app.conflict.field.priority',
  quadrant: 'app.conflict.field.quadrant',
  status: 'app.conflict.field.status',
  completedAt: 'app.conflict.field.completedAt',
  tags: 'app.conflict.field.tags',
};

const FIELDS_IN_ORDER: readonly DifferingField[] = [
  'title',
  'status',
  'quadrant',
  'priority',
  'dueDate',
  'dueTime',
  'tags',
  'notes',
  'completedAt',
];

function displayValue(task: Task, field: DifferingField): string {
  const v = task[field];
  if (v === undefined) return '—';
  if (Array.isArray(v)) return v.length === 0 ? '—' : v.join(', ');
  return String(v);
}

function defaultPicks(
  fields: readonly DifferingField[],
): Record<DifferingField, 'local' | 'remote'> {
  const out = {} as Record<DifferingField, 'local' | 'remote'>;
  for (const f of fields) out[f] = 'local';
  return out;
}

function ConflictModalBody({
  record,
  onResolve,
  onCancel,
}: {
  record: ConflictRecord;
  onResolve: (resolution: ConflictResolution) => void;
  onCancel?: (() => void) | undefined;
}): ReactNode {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const fields = useMemo(
    () => FIELDS_IN_ORDER.filter((f) => record.differingFields.includes(f)),
    [record.differingFields],
  );
  const [picks, setPicks] = useState(() => defaultPicks(fields));

  const dismiss = useCallback(() => {
    onCancel?.();
  }, [onCancel]);

  useDialogBehavior(true, dismiss, dialogRef);

  const setPick = (field: DifferingField, side: 'local' | 'remote'): void => {
    setPicks((prev) => ({ ...prev, [field]: side }));
  };

  const onApplyMerge = (): void => {
    onResolve(resolutionFromFieldPicks(record.local, record.remote, fields, picks));
  };

  return (
    <div className="emt-conflict-modal" role="presentation" data-view="conflict">
      <button
        type="button"
        className="emt-conflict-modal__scrim"
        data-emt-scrim
        aria-label={t('app.conflict.dismiss')}
        onClick={onCancel}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="emt-conflict-heading"
        className="emt-conflict-modal__dialog"
      >
        <header className="emt-conflict-modal__header">
          <h2 id="emt-conflict-heading" className="emt-conflict-modal__heading">
            {t('app.conflict.heading')}
          </h2>
          <p className="emt-conflict-modal__subheading">{t('app.conflict.subheading')}</p>
          <p className="emt-conflict-modal__hint">{t('app.conflict.fieldHint')}</p>
        </header>
        <div className="emt-conflict-modal__grid" data-list="diff-rows">
          <div className="emt-conflict-modal__col emt-conflict-modal__col--label">
            <span className="emt-conflict-modal__col-head" aria-hidden="true">
              {' '}
            </span>
            {fields.map((f) => (
              <span key={f} className="emt-conflict-modal__field" data-field={f}>
                {t(FIELD_LABEL[f])}
              </span>
            ))}
          </div>
          <div className="emt-conflict-modal__col" data-side="local">
            <span className="emt-conflict-modal__col-head">{t('app.conflict.local')}</span>
            {fields.map((f) => (
              <button
                key={f}
                type="button"
                className="emt-conflict-modal__value emt-conflict-modal__value--diff"
                data-side="local"
                data-field={f}
                data-selected={picks[f] === 'local' ? 'true' : 'false'}
                aria-pressed={picks[f] === 'local'}
                aria-label={`${t(FIELD_LABEL[f])}: ${t('app.conflict.local')}`}
                onClick={() => setPick(f, 'local')}
              >
                {displayValue(record.local, f)}
              </button>
            ))}
          </div>
          <div className="emt-conflict-modal__col" data-side="remote">
            <span className="emt-conflict-modal__col-head">{t('app.conflict.remote')}</span>
            {fields.map((f) => (
              <button
                key={f}
                type="button"
                className="emt-conflict-modal__value emt-conflict-modal__value--diff"
                data-side="remote"
                data-field={f}
                data-selected={picks[f] === 'remote' ? 'true' : 'false'}
                aria-pressed={picks[f] === 'remote'}
                aria-label={`${t(FIELD_LABEL[f])}: ${t('app.conflict.remote')}`}
                onClick={() => setPick(f, 'remote')}
              >
                {displayValue(record.remote, f)}
              </button>
            ))}
          </div>
        </div>
        <footer className="emt-conflict-modal__actions">
          <Button
            variant="tonal"
            data-action="keep-local"
            aria-label={t('app.conflict.keepLocal')}
            onClick={() => onResolve('local')}
          >
            {t('app.conflict.keepLocal')}
          </Button>
          <Button
            variant="tonal"
            data-action="keep-remote"
            aria-label={t('app.conflict.keepRemote')}
            onClick={() => onResolve('remote')}
          >
            {t('app.conflict.keepRemote')}
          </Button>
          <Button
            variant="filled"
            data-action="apply-merge"
            aria-label={t('app.conflict.applyMerge')}
            onClick={onApplyMerge}
          >
            {t('app.conflict.applyMerge')}
          </Button>
        </footer>
      </div>
    </div>
  );
}

export function ConflictModal({
  open,
  record,
  onResolve,
  onCancel,
}: ConflictModalProps): ReactNode {
  if (!open || record === undefined) return null;
  // Remount when the conflict identity changes so field picks reset.
  const key = `${record.local.id}:${record.local.updatedAt}:${record.remote.updatedAt}`;
  return <ConflictModalBody key={key} record={record} onResolve={onResolve} onCancel={onCancel} />;
}
