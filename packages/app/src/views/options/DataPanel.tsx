/**
 * DataPanel — view4 / Data group (Step 9.6).
 *
 * Three actions:
 *  - Export: downloads a JSON file matching the format documented
 *    in `packages/backend-core/src/export-format.md`. Triggers a
 *    blob URL → anchor click → cleanup.
 *  - Import: file picker → parse → `importTasks` (recreates each
 *    task on the matching backend, falling back to the default
 *    when the source backend isn't registered).
 *  - Clear local cache: deletes every task held by the `local`
 *    backend; remote backend caches stay untouched.
 *
 * The actions invalidate the React Query `['tasks']` subtree after
 * a successful mutation so the matrix / quadrant views refetch.
 *
 * Error paths surface inline via `ErrorBanner` — bad JSON, missing
 * backend, version-mismatch, etc.
 */
import { ErrorBanner } from '@emt/design-system';
import { useQueryClient } from '@tanstack/react-query';
import { useRef, useState, type ChangeEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { getBackends } from '../../state/backends.js';

import { buildExportFile, clearLocalBackend, importTasks, type ExportFile } from './data-export.js';

interface SummaryMessage {
  readonly kind: 'info' | 'error';
  readonly text: string;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<SummaryMessage | null>(null);
  const [busy, setBusy] = useState(false);

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
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExportFile;
      const { registry } = await getBackends();
      const fallback = registry.getDefault();
      if (fallback === undefined) {
        throw new Error('No default backend registered');
      }
      const result = await importTasks(parsed, {
        getAdapter: (id) => registry.get(id),
        fallback,
      });
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setMessage({
        kind: 'info',
        text: t('app.options.data.import.ok').replace('{count}', String(result.imported)),
      });
    } catch (err) {
      setMessage({ kind: 'error', text: (err as Error).message });
    } finally {
      setBusy(false);
      if (fileInputRef.current !== null) fileInputRef.current.value = '';
    }
  };

  const onClearLocal = async (): Promise<void> => {
    setBusy(true);
    setMessage(null);
    try {
      const { registry } = await getBackends();
      const local = registry.list().find((a) => a.describe().id === 'local');
      if (local === undefined) {
        throw new Error('Local backend not registered');
      }
      const removed = await clearLocalBackend(local);
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
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
      >
        {t('app.options.data.import')}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        className="emt-data-panel__file-input"
        data-field="import-file"
        onChange={(e) => {
          void onImportFile(e);
        }}
      />
      <button
        type="button"
        className="emt-data-panel__action emt-data-panel__action--danger"
        data-action="clear-local"
        onClick={() => {
          void onClearLocal();
        }}
        disabled={busy}
      >
        {t('app.options.data.clear')}
      </button>
      {message?.kind === 'info' && (
        <p className="emt-data-panel__message" data-status="info">
          {message.text}
        </p>
      )}
      {message?.kind === 'error' && <ErrorBanner message={message.text} />}
    </div>
  );
}
