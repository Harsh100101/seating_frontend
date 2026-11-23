import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Archive, Check, Pencil, Plus, RotateCcw, Search, Trash2, X } from 'lucide-react';
import { apiRequest } from '../api/client';

export type CategoryKind = 'building' | 'floor' | 'area' | 'department' | 'section' | 'function';

type Option = { id: string; name: string; code?: string; floorNumber?: number; isActive?: boolean };

interface Props {
  kind: CategoryKind;
  parentId?: string;
  parentOptions: Option[];
  parentLabel: string;
  onClose: () => void;
  onChanged: () => Promise<void> | void;
}

const config: Record<CategoryKind, { title: string; singular: string; endpoint: string; parentKey: string }> = {
  building: { title: 'Buildings', singular: 'building', endpoint: '/buildings', parentKey: 'unitId' },
  floor: { title: 'Floors', singular: 'floor', endpoint: '/floors', parentKey: 'buildingId' },
  area: { title: 'Areas', singular: 'area', endpoint: '/areas', parentKey: 'floorId' },
  department: { title: 'Departments', singular: 'department', endpoint: '/departments', parentKey: 'unitId' },
  section: { title: 'Sections', singular: 'section', endpoint: '/sections', parentKey: 'departmentId' },
  function: { title: 'Functions', singular: 'function', endpoint: '/functions', parentKey: 'sectionId' },
};

export const CategoryManagerModal: React.FC<Props> = ({ kind, parentId, parentOptions, parentLabel, onClose, onChanged }) => {
  const cfg = config[kind];
  const [selectedParent, setSelectedParent] = useState(parentId || '');
  const [items, setItems] = useState<Option[]>([]);
  const [name, setName] = useState('');
  const [extra, setExtra] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState<{ tone: 'info' | 'archive'; text: string } | null>(null);

  const [renameTarget, setRenameTarget] = useState<Option | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState<Option | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const titleId = useId();
  const renameTitleId = useId();
  const deleteTitleId = useId();
  const deleteDescId = useId();
  const renameInputRef = useRef<HTMLInputElement>(null);
  const deleteCancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setSelectedParent(parentId || '');
    setNotice(null);
    setRenameTarget(null);
    setDeleteTarget(null);
  }, [parentId, kind]);

  const load = useCallback(async () => {
    if (!selectedParent) {
      setItems([]);
      return;
    }
    setError('');
    try {
      const query = new URLSearchParams({ includeInactive: 'true', [cfg.parentKey]: selectedParent });
      setItems(await apiRequest<Option[]>(`${cfg.endpoint}?${query.toString()}`));
    } catch (err: any) {
      setError(err.message || `Could not load ${cfg.title.toLowerCase()}`);
    }
  }, [selectedParent, cfg.endpoint, cfg.parentKey, cfg.title]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!renameTarget) return;
    renameInputRef.current?.focus();
    renameInputRef.current?.select();
  }, [renameTarget]);

  useEffect(() => {
    if (!deleteTarget) return;
    deleteCancelRef.current?.focus();
  }, [deleteTarget]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape' || busy) return;
      if (renameTarget) {
        setRenameTarget(null);
        setRenameError('');
        return;
      }
      if (deleteTarget) {
        setDeleteTarget(null);
        setDeleteError('');
        return;
      }
      onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [busy, renameTarget, deleteTarget, onClose]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? items.filter((item) => item.name.toLowerCase().includes(q) || item.code?.toLowerCase().includes(q)) : items;
  }, [items, search]);

  const add = async () => {
    if (!selectedParent || !name.trim()) return;
    setBusy(true);
    setError('');
    setNotice(null);
    try {
      const payload: Record<string, unknown> = { name: name.trim(), [cfg.parentKey]: selectedParent };
      if (kind === 'building' || kind === 'department') payload.code = extra.trim().toUpperCase();
      if (kind === 'department') payload.colorHex = '#3B82F6';
      if (kind === 'floor') payload.floorNumber = Number(extra);
      await apiRequest(cfg.endpoint, { method: 'POST', body: JSON.stringify(payload) });
      setName('');
      setExtra('');
      await load();
      await onChanged();
    } catch (err: any) {
      setError(err.message || 'Could not add option');
    } finally {
      setBusy(false);
    }
  };

  const openRename = (item: Option) => {
    setError('');
    setNotice(null);
    setRenameError('');
    setRenameValue(item.name);
    setRenameTarget(item);
  };

  const closeRename = () => {
    if (busy) return;
    setRenameTarget(null);
    setRenameError('');
  };

  const trimmedRename = renameValue.trim();
  const isRenameUnchanged = renameTarget ? trimmedRename === renameTarget.name : true;
  const isRenameInvalid = trimmedRename.length === 0 || isRenameUnchanged;

  const submitRename = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || !renameTarget) return;
    if (trimmedRename.length === 0) {
      setRenameError('Name is required.');
      return;
    }
    if (isRenameUnchanged) return;

    setBusy(true);
    setRenameError('');
    try {
      await apiRequest(`${cfg.endpoint}/${renameTarget.id}`, {
        method: 'PUT',
        body: JSON.stringify({ name: trimmedRename }),
      });
      setRenameTarget(null);
      await load();
      await onChanged();
    } catch (err: any) {
      setRenameError(err.message || 'Could not rename option');
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (item: Option, isActive: boolean) => {
    setBusy(true);
    setError('');
    setNotice(null);
    try {
      await apiRequest(`${cfg.endpoint}/${item.id}/status`, { method: 'PATCH', body: JSON.stringify({ isActive }) });
      await load();
      await onChanged();
    } catch (err: any) {
      setError(err.message || 'Could not change option status');
    } finally {
      setBusy(false);
    }
  };

  const openDelete = (item: Option) => {
    setError('');
    setNotice(null);
    setDeleteError('');
    setDeleteTarget(item);
  };

  const closeDelete = () => {
    if (busy) return;
    setDeleteTarget(null);
    setDeleteError('');
  };

  const confirmDelete = async () => {
    if (busy || !deleteTarget) return;
    const target = deleteTarget;
    setBusy(true);
    setDeleteError('');
    try {
      const result = await apiRequest<{ archived?: boolean; reason?: string }>(`${cfg.endpoint}/${target.id}`, {
        method: 'DELETE',
      });
      setDeleteTarget(null);
      if (result?.archived) {
        setNotice({
          tone: 'archive',
          text: `“${target.name}” was archived${result.reason ? ` (${result.reason})` : ''} so existing data remains safe.`,
        });
      } else {
        setNotice({ tone: 'info', text: `“${target.name}” was removed.` });
      }
      await load();
      await onChanged();
    } catch (err: any) {
      setDeleteError(err.message || 'Could not remove option');
    } finally {
      setBusy(false);
    }
  };

  const needsExtra = kind === 'building' || kind === 'department' || kind === 'floor';
  const extraValid = !needsExtra || (kind === 'floor' ? Number.isInteger(Number(extra)) && extra.trim() !== '' : extra.trim().length > 0);

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4"
      onMouseDown={() => {
        if (!busy && !renameTarget && !deleteTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-xl max-h-[85vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div>
            <h2 id={titleId} className="font-bold text-slate-900">Manage {cfg.title}</h2>
            <p className="text-xs text-slate-500 mt-0.5">Add, rename, hide, reactivate or remove filter options.</p>
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            aria-label="Close category manager"
            className="p-2 rounded-lg hover:bg-slate-100 disabled:opacity-40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto max-h-[calc(85vh-73px)]">
          <label className="block text-xs font-semibold text-slate-700">
            {parentLabel}
            <select
              value={selectedParent}
              onChange={(e) => {
                setSelectedParent(e.target.value);
                setNotice(null);
              }}
              className="mt-1 w-full h-9 px-3 rounded-lg border border-slate-200 bg-white"
            >
              <option value="">Select {parentLabel}</option>
              {parentOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.name}{option.code ? ` (${option.code})` : ''}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={`New ${kind} name`}
              className="h-9 px-3 rounded-lg border border-slate-200 text-sm"
            />
            {needsExtra && (
              <input
                value={extra}
                onChange={(e) => setExtra(e.target.value)}
                placeholder={kind === 'floor' ? 'Floor no.' : 'Code'}
                type={kind === 'floor' ? 'number' : 'text'}
                className="h-9 sm:w-28 px-3 rounded-lg border border-slate-200 text-sm"
              />
            )}
            <button
              type="button"
              disabled={busy || !selectedParent || !name.trim() || !extraValid}
              onClick={add}
              className="h-9 px-4 rounded-lg bg-slate-900 text-white text-sm font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </div>

          {error && <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>}
          {notice && (
            <div
              role="status"
              className={`rounded-lg border px-3 py-2 text-xs ${
                notice.tone === 'archive'
                  ? 'bg-amber-50 border-amber-200 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {notice.text}
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${cfg.title.toLowerCase()}`}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 text-sm"
            />
          </div>

          {!selectedParent ? (
            <div className="py-10 text-center text-sm text-slate-500">Select {parentLabel} first.</div>
          ) : filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">No options found. Add the first one above.</div>
          ) : (
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
              {filtered.map((item) => (
                <div key={item.id} className={`flex items-center gap-3 px-3 py-2.5 ${item.isActive === false ? 'bg-slate-50 text-slate-400' : 'bg-white'}`}>
                  <span className={`w-2 h-2 rounded-full ${item.isActive === false ? 'bg-slate-300' : 'bg-emerald-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{item.name}</div>
                    {(item.code || item.floorNumber !== undefined) && (
                      <div className="text-[10px] uppercase">{item.code || `Floor ${item.floorNumber}`}</div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openRename(item)}
                    title="Rename"
                    aria-label={`Rename ${item.name}`}
                    className="p-1.5 rounded-md hover:bg-slate-100 disabled:opacity-40"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  {item.isActive === false ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setActive(item, true)}
                      title="Reactivate"
                      aria-label={`Reactivate ${item.name}`}
                      className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setActive(item, false)}
                      title="Hide"
                      aria-label={`Hide ${item.name}`}
                      className="p-1.5 rounded-md text-amber-600 hover:bg-amber-50 disabled:opacity-40"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => openDelete(item)}
                    title="Remove"
                    aria-label={`Remove ${item.name}`}
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <Check className="w-3.5 h-3.5 text-emerald-600" /> Changes refresh all employee options immediately.
          </div>
        </div>
      </div>

      {renameTarget && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            e.stopPropagation();
            closeRename();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={renameTitleId}
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
              <h3 id={renameTitleId} className="text-sm font-bold text-slate-900">
                Rename {cfg.singular}
              </h3>
              <button
                type="button"
                disabled={busy}
                onClick={closeRename}
                aria-label="Close rename dialog"
                className="p-1.5 rounded-lg hover:bg-slate-100 disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={submitRename} className="p-5 space-y-4">
              <label className="block text-xs font-semibold text-slate-700">
                Name
                <input
                  ref={renameInputRef}
                  type="text"
                  value={renameValue}
                  disabled={busy}
                  onChange={(e) => {
                    setRenameValue(e.target.value);
                    if (renameError) setRenameError('');
                  }}
                  placeholder={`Enter ${cfg.singular} name`}
                  className="mt-1.5 w-full h-9 px-3 rounded-lg border border-slate-200 text-sm text-slate-900 disabled:bg-slate-50"
                />
              </label>

              {renameError && (
                <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {renameError}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={busy}
                  onClick={closeRename}
                  className="h-8 px-3 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={busy || isRenameInvalid}
                  className="h-8 px-3.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-40"
                >
                  {busy ? 'Saving...' : 'Save Name'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4"
          onMouseDown={(e) => {
            e.stopPropagation();
            closeDelete();
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={deleteTitleId}
            aria-describedby={deleteDescId}
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl border border-red-100 p-5 space-y-3.5 text-xs"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2.5 text-red-600">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 id={deleteTitleId} className="text-sm font-bold text-slate-900">
                Remove {cfg.singular}
              </h3>
            </div>

            <p id={deleteDescId} className="text-slate-600 leading-relaxed">
              Remove <strong className="text-slate-900 font-semibold">{deleteTarget.name}</strong>? Used options will be
              archived instead of permanently deleted so existing data remains safe.
            </p>

            {deleteError && (
              <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                ref={deleteCancelRef}
                type="button"
                disabled={busy}
                onClick={closeDelete}
                className="h-8 px-3 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={confirmDelete}
                className="h-8 px-3.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 disabled:opacity-40 transition-colors"
              >
                {busy ? 'Removing...' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
