/**
 * ConflictModal — view5 conflict resolution surface (Step 10.1).
 *
 * Displays the local and remote whole records side by side with the
 * differing fields highlighted; the user picks one side via two
 * primary actions. The choice is propagated through `onResolve`.
 *
 * The conflict pipeline (Step 10.2) registers a resolver against the
 * app's sync-engine instance that opens the modal and awaits the
 * user's choice via this contract. We deliberately stay agnostic to
 * the resolver wiring at this step — the modal is a presentation
 * component with an `onResolve` callback.
 *
 * Surface choice: a centered dialog (not a Sheet / SidePanel) because
 * conflict resolution is a focused, mode-switching task — the user
 * cannot defer or background it. Keyboard:
 *  - Esc closes (treated as "cancel", no resolution; the resolver
 *    queue holds the conflict open for the next user idle).
 *  - The Keep-Local / Keep-Remote buttons each carry an aria-label
 *    so screen readers announce them with the full intent.
 */
import type { ConflictRecord, DifferingField, Task } from '@emt/backend-core';
import { Button } from '@emt/design-system';
import { useEffect, useRef, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import type { StringKey } from '../../i18n/strings.en.js';

import './conflict-modal.css';

export interface ConflictModalProps {
  open: boolean;
  record: ConflictRecord | undefined;
  onResolve: (side: 'local' | 'remote') => void;
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

export function ConflictModal({
  open,
  record,
  onResolve,
  onCancel,
}: ConflictModalProps): ReactNode {
  const t = useT();
  const dialogRef = useRef<HTMLDivElement | null>(null);

  // Focus the local-keep button on open so the user has a default
  // action under the keyboard.
  useEffect(() => {
    if (!open) return;
    const button = dialogRef.current?.querySelector<HTMLButtonElement>(
      '[data-action="keep-local"]',
    );
    button?.focus();
  }, [open]);

  // Esc → cancel. The dialog owns its own listener (matches view3's
  // ResponsiveSurface convention).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel?.();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open || record === undefined) return null;

  const differing = new Set<DifferingField>(record.differingFields);
  const rows = FIELDS_IN_ORDER.filter((f) => differing.has(f));

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
        </header>
        <div className="emt-conflict-modal__grid" data-list="diff-rows">
          <div className="emt-conflict-modal__col emt-conflict-modal__col--label">
            <span className="emt-conflict-modal__col-head" aria-hidden="true">
              {' '}
            </span>
            {rows.map((f) => (
              <span key={f} className="emt-conflict-modal__field" data-field={f}>
                {t(FIELD_LABEL[f])}
              </span>
            ))}
          </div>
          <div className="emt-conflict-modal__col" data-side="local">
            <span className="emt-conflict-modal__col-head">{t('app.conflict.local')}</span>
            {rows.map((f) => (
              <span
                key={f}
                className="emt-conflict-modal__value emt-conflict-modal__value--diff"
                data-side="local"
                data-field={f}
              >
                {displayValue(record.local, f)}
              </span>
            ))}
          </div>
          <div className="emt-conflict-modal__col" data-side="remote">
            <span className="emt-conflict-modal__col-head">{t('app.conflict.remote')}</span>
            {rows.map((f) => (
              <span
                key={f}
                className="emt-conflict-modal__value emt-conflict-modal__value--diff"
                data-side="remote"
                data-field={f}
              >
                {displayValue(record.remote, f)}
              </span>
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
            variant="filled"
            data-action="keep-remote"
            aria-label={t('app.conflict.keepRemote')}
            onClick={() => onResolve('remote')}
          >
            {t('app.conflict.keepRemote')}
          </Button>
        </footer>
      </div>
    </div>
  );
}
