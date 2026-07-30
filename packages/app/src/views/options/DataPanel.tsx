/**
 * DataPanel — view4 / Data group (Step 9.6 / Phase 30).
 *
 * Actions: export JSON, import (add), replace-local-from-file, clear local.
 * Import validates via `parseExportFile` before any writes.
 */
import { ErrorBanner } from '@emt/design-system';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useClearAllTaskRanks } from '../../queries/task-order.js';
import { getBackends } from '../../state/backends.js';

import {
  buildExportFile,
  clearLocalBackend,
  formatImportSummary,
  importTasks,
  parseExportFile,
} from './data-export.js';

interface SummaryMessage {
  readonly kind: 'info' | 'error';
  readonly text: string;
}

type ImportMode = 'add' | 'replace';

function triggerDownload(filename: string, contents: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([contents], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function DataPanel(): ReactNode {
  const t = useT();
  const queryClient = useQueryClient();
  const clearAllRanks = useClearAllTaskRanks();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<SummaryMessage | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [importMode, setImportMode] = useState<ImportMode>('add');

  const onExport = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const { registry } = await getBackends();
      const file = await buildExportFile(registry.list());
      triggerDownload(
        `emt-export-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(file, null, 2),
      );
      setMessage({ kind: 'info', text: t('app.options.data.export.ok') });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const onImportFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.currentTarget.files?.[0];
    if (file === undefined) return;
    setBusy(true);
    setMessage(null);
    setConfirmReplace(false);
    try {
      const text = await file.text();
      const parsed = parseExportFile(JSON.parse(text) as unknown);
      const { registry } = await getBackends();
      const fallback = registry.getDefault();
      if (fallback === undefined) {
        throw new Error('No default backend registered');
      }
      const local = registry.list().find((a) => a.describe().id === 'local');
      const result = await importTasks(parsed, {
        getAdapter: (id) => registry.get(id),
        fallback,
        ...(importMode === 'replace' && local !== undefined ? { clearBefore: local } : {}),
      });
      if (importMode === 'replace') {
        await clearAllRanks.mutateAsync();
      }
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setMessage({
        kind: 'info',
        text: formatImportSummary(result, {
          ok: t('app.options.data.import.ok'),
          fallback: t('app.options.data.import.fallback'),
        }),
      });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
      setImportMode('add');
      if (fileInputRef.current !== null) fileInputRef.current.value = '';
    }
  };

  const pickImport = (mode: ImportMode): void => {
    setImportMode(mode);
    setMessage(null);
    if (mode === 'replace') {
      setConfirmReplace(true);
      setConfirmClear(false);
      return;
    }
    setConfirmReplace(false);
    fileInputRef.current?.click();
  };

  const onClearLocal = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    setConfirmClear(false);
    try {
      const { registry } = await getBackends();
      const local = registry.list().find((a) => a.describe().id === 'local');
      if (local === undefined) {
        throw new Error('Local backend not registered');
      }
      const removed = await clearLocalBackend(local);
      await clearAllRanks.mutateAsync();
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setMessage({
        kind: 'info',
        text: t('app.options.data.clear.ok').replace('{count}', String(removed)),
      });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="emt-data-panel" data-options-panel="data" data-options-group="data">
      <button
        type="button"
        className="emt-data-panel__action"
        data-action="export"
        onClick={() => {
          void onExport();
        }}
        disabled={busy}
      >
        {t('app.options.data.export')}
      </button>
      <button
        type="button"
        className="emt-data-panel__action"
        data-action="import"
        onClick={() => pickImport('add')}
        disabled={busy}
      >
        {t('app.options.data.import')}
      </button>
      {!confirmReplace ? (
        <button
          type="button"
          className="emt-data-panel__action"
          data-action="import-replace"
          onClick={() => pickImport('replace')}
          disabled={busy}
        >
          {t('app.options.data.importReplace')}
        </button>
      ) : (
        <div className="emt-data-panel__confirm" data-confirm="import-replace" role="group">
          <p className="emt-data-panel__confirm-text">
            {t('app.options.data.importReplace.confirm')}
          </p>
          <div className="emt-data-panel__confirm-actions">
            <button
              type="button"
              className="emt-data-panel__action emt-data-panel__action--danger"
              data-action="import-replace-confirm"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
            >
              {t('app.options.data.importReplace.confirmYes')}
            </button>
            <button
              type="button"
              className="emt-data-panel__action"
              data-action="import-replace-cancel"
              onClick={() => {
                setConfirmReplace(false);
                setImportMode('add');
              }}
              disabled={busy}
            >
              {t('app.options.data.importReplace.confirmNo')}
            </button>
          </div>
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="emt-data-panel__file-input"
        data-field="import-file"
        aria-label={t('app.options.data.import')}
        tabIndex={-1}
        onChange={(e) => {
          void onImportFile(e);
        }}
      />
      {!confirmClear ? (
        <button
          type="button"
          className="emt-data-panel__action emt-data-panel__action--danger"
          data-action="clear-local"
          onClick={() => {
            setConfirmClear(true);
            setConfirmReplace(false);
            setMessage(null);
          }}
          disabled={busy}
        >
          {t('app.options.data.clear')}
        </button>
      ) : (
        <div className="emt-data-panel__confirm" data-confirm="clear-local" role="group">
          <p className="emt-data-panel__confirm-text">{t('app.options.data.clear.confirm')}</p>
          <div className="emt-data-panel__confirm-actions">
            <button
              type="button"
              className="emt-data-panel__action emt-data-panel__action--danger"
              data-action="clear-local-confirm"
              onClick={() => {
                void onClearLocal();
              }}
              disabled={busy}
            >
              {t('app.options.data.clear.confirmYes')}
            </button>
            <button
              type="button"
              className="emt-data-panel__action"
              data-action="clear-local-cancel"
              onClick={() => setConfirmClear(false)}
              disabled={busy}
            >
              {t('app.options.data.clear.confirmNo')}
            </button>
          </div>
        </div>
      )}
      {message?.kind === 'info' && (
        <p className="emt-data-panel__message" data-status="info">
          {message.text}
        </p>
      )}
      {message?.kind === 'error' && <ErrorBanner message={message.text} />}
    </div>
  );
}
