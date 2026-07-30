/**
 * TagsPanel — Options → Tags (Phase 14 / 18 / 19).
 *
 * Inventory of every tag in use. Filter still jumps home with the tag
 * active. Phase 19 adds rename and delete across all matching tasks
 * (local adapter writes only — no network).
 */
import { EmptyNote, ErrorBanner } from '@emt/design-system';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';

import { useT } from '../../i18n/provider.js';
import { useTasks } from '../../queries/tasks.js';
import { getBackends } from '../../state/backends.js';
import { useViewStateStore } from '../../state/view-state.js';
import { useTagFilterStore } from '../tags/tag-filter-store.js';
import {
  collectTagCounts,
  normalizeTag,
  planTagDelete,
  planTagRename,
  tagKey,
  type TagBulkPatch,
} from '../tags/tag-helpers.js';
import '../tags/tags.css';

type RowMode =
  | { readonly kind: 'idle' }
  | { readonly kind: 'rename'; readonly tag: string; readonly draft: string }
  | { readonly kind: 'confirm-delete'; readonly tag: string; readonly count: number };

async function applyPatches(patches: readonly TagBulkPatch[]): Promise<void> {
  if (patches.length === 0) return;
  const { registry } = await getBackends();
  const applied: TagBulkPatch[] = [];
  try {
    for (const patch of patches) {
      const adapter = registry.get(patch.backendId);
      if (adapter === undefined) {
        throw new Error(`Unknown backend "${String(patch.backendId)}"`);
      }
      await adapter.update(patch.id, { tags: [...patch.tags] });
      applied.push(patch);
    }
  } catch (err) {
    for (const patch of applied.reverse()) {
      const adapter = registry.get(patch.backendId);
      if (adapter === undefined) continue;
      try {
        await adapter.update(patch.id, { tags: [...patch.previousTags] });
      } catch {
        // Best-effort reverse; surface the original error.
      }
    }
    throw err;
  }
}

export function TagsPanel(): ReactNode {
  const t = useT();
  const query = useTasks();
  const queryClient = useQueryClient();
  const counts = useMemo(() => (query.data ? collectTagCounts(query.data) : []), [query.data]);
  const [mode, setMode] = useState<RowMode>({ kind: 'idle' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (mode.kind !== 'rename') return;
    renameInputRef.current?.focus();
  }, [mode]);

  const onFilter = (tag: string): void => {
    useTagFilterStore.getState().setActiveTag(tag);
    useViewStateStore.getState().navigateRaw('/');
  };

  const syncFilterAfterRename = (from: string, to: string): void => {
    const active = useTagFilterStore.getState().activeTag;
    if (active !== undefined && tagKey(active) === tagKey(from)) {
      useTagFilterStore.getState().setActiveTag(normalizeTag(to));
    }
  };

  const syncFilterAfterDelete = (tag: string): void => {
    const active = useTagFilterStore.getState().activeTag;
    if (active !== undefined && tagKey(active) === tagKey(tag)) {
      useTagFilterStore.getState().clear();
    }
  };

  const runRename = async (from: string, draft: string): Promise<void> => {
    const to = normalizeTag(draft);
    if (to === '') {
      setError(t('app.options.tags.rename.empty'));
      return;
    }
    const tasks = query.data ?? [];
    const patches = planTagRename(tasks, from, to);
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await applyPatches(patches);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      syncFilterAfterRename(from, to);
      setMode({ kind: 'idle' });
      setInfo(
        t('app.options.tags.rename.ok')
          .replace('{from}', from)
          .replace('{to}', to)
          .replace('{count}', String(patches.length)),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const runDelete = async (tag: string): Promise<void> => {
    const tasks = query.data ?? [];
    const patches = planTagDelete(tasks, tag);
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      await applyPatches(patches);
      await queryClient.invalidateQueries({ queryKey: ['tasks'] });
      syncFilterAfterDelete(tag);
      setMode({ kind: 'idle' });
      setInfo(
        t('app.options.tags.delete.ok')
          .replace('{tag}', tag)
          .replace('{count}', String(patches.length)),
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onRenameSubmit = (from: string) => (e: FormEvent) => {
    e.preventDefault();
    if (mode.kind !== 'rename' || mode.tag !== from) return;
    void runRename(from, mode.draft);
  };

  if (query.isPending) {
    return (
      <div className="emt-tags-panel" data-options-group="tags">
        <p className="emt-tags-panel__intro">{t('app.options.tags.loading')}</p>
      </div>
    );
  }

  return (
    <div className="emt-tags-panel" data-options-group="tags">
      <p className="emt-tags-panel__intro">{t('app.options.tags.intro')}</p>
      {error !== null && (
        <ErrorBanner
          message={error}
          onRetry={() => setError(null)}
          retryLabel={t('app.options.tags.dismiss')}
        />
      )}
      {info !== null && (
        <p className="emt-tags-panel__info" data-tags-info role="status">
          {info}
        </p>
      )}
      {counts.length === 0 ? (
        <EmptyNote className="emt-tags-panel__empty">{t('app.options.tags.empty')}</EmptyNote>
      ) : (
        <ul className="emt-tags-panel__list">
          {counts.map(({ tag, count }) => {
            const renaming = mode.kind === 'rename' && mode.tag === tag;
            const confirming = mode.kind === 'confirm-delete' && mode.tag === tag;
            return (
              <li key={tag.toLowerCase()}>
                <div className="emt-tags-panel__row" data-tag={tag}>
                  <div className="emt-tags-panel__meta">
                    <span className="emt-tags-panel__name">{tag}</span>
                    <span className="emt-tags-panel__count">
                      {count === 1
                        ? t('app.options.tags.countOne')
                        : t('app.options.tags.countMany').replace('{count}', String(count))}
                    </span>
                  </div>
                  {renaming ? (
                    <form className="emt-tags-panel__rename" onSubmit={onRenameSubmit(tag)}>
                      <label
                        className="emt-tags-panel__sr-only"
                        htmlFor={`emt-tag-rename-${tagKey(tag)}`}
                      >
                        {t('app.options.tags.rename.label')}
                      </label>
                      <input
                        ref={renameInputRef}
                        id={`emt-tag-rename-${tagKey(tag)}`}
                        className="emt-tags-panel__rename-input"
                        data-action="rename-input"
                        value={mode.draft}
                        disabled={busy}
                        onChange={(e) =>
                          setMode({ kind: 'rename', tag, draft: e.currentTarget.value })
                        }
                      />
                      <button
                        type="submit"
                        className="emt-tags-panel__action emt-tags-panel__action--primary"
                        data-action="rename-save"
                        disabled={busy}
                      >
                        {t('app.options.tags.rename.save')}
                      </button>
                      <button
                        type="button"
                        className="emt-tags-panel__action"
                        data-action="rename-cancel"
                        disabled={busy}
                        onClick={() => setMode({ kind: 'idle' })}
                      >
                        {t('app.options.tags.cancel')}
                      </button>
                    </form>
                  ) : confirming ? (
                    <div className="emt-tags-panel__confirm" data-action="delete-confirm">
                      <p className="emt-tags-panel__confirm-text">
                        {t('app.options.tags.delete.confirm').replace('{count}', String(count))}
                      </p>
                      <button
                        type="button"
                        className="emt-tags-panel__action emt-tags-panel__action--danger"
                        data-action="delete-confirm-yes"
                        disabled={busy}
                        onClick={() => void runDelete(tag)}
                      >
                        {t('app.options.tags.delete.yes')}
                      </button>
                      <button
                        type="button"
                        className="emt-tags-panel__action"
                        data-action="delete-confirm-no"
                        disabled={busy}
                        onClick={() => setMode({ kind: 'idle' })}
                      >
                        {t('app.options.tags.cancel')}
                      </button>
                    </div>
                  ) : (
                    <div className="emt-tags-panel__actions">
                      <button
                        type="button"
                        className="emt-tags-panel__action"
                        data-action="filter"
                        disabled={busy}
                        onClick={() => onFilter(tag)}
                      >
                        {t('app.options.tags.filter')}
                      </button>
                      <button
                        type="button"
                        className="emt-tags-panel__action"
                        data-action="rename"
                        disabled={busy}
                        onClick={() => setMode({ kind: 'rename', tag, draft: tag })}
                      >
                        {t('app.options.tags.rename')}
                      </button>
                      <button
                        type="button"
                        className="emt-tags-panel__action emt-tags-panel__action--danger"
                        data-action="delete"
                        disabled={busy}
                        onClick={() => setMode({ kind: 'confirm-delete', tag, count })}
                      >
                        {t('app.options.tags.delete')}
                      </button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
