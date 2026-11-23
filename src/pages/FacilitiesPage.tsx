import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Building2, Layers3, MapPinned, Pencil, Plus, RefreshCw, UsersRound } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { CategoryKind, CategoryManagerModal } from '../components/CategoryManagerModal';

type Option = {
  id: string;
  name: string;
  code?: string;
  floorNumber?: number;
  isActive?: boolean;
  lifecycleStatus?: string;
  unitId?: string;
  plantId?: string;
  buildingId?: string;
  departmentId?: string;
  sectionId?: string;
  _count?: Record<string, number>;
  unit?: { name?: string };
  plant?: { name?: string; unitId?: string };
  building?: { name?: string; plantId?: string };
  floor?: { name?: string; building?: { name?: string } };
};

type Unit = Option & { location?: string | null };
const emptyUnitForm = { id: '', name: '', code: '', location: '' };

export const FacilitiesPage: React.FC = () => {
  const { adminUser } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [buildings, setBuildings] = useState<Option[]>([]);
  const [floors, setFloors] = useState<Option[]>([]);
  const [departments, setDepartments] = useState<Option[]>([]);
  const [sections, setSections] = useState<Option[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedKind, setSelectedKind] = useState<CategoryKind | null>(null);
  const [search, setSearch] = useState('');
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);

  const isUnitAdmin = adminUser?.role === 'UNIT_ADMIN';
  const canManageMasterData = adminUser?.role === 'SUPER_ADMIN' || adminUser?.role === 'TECH_ADMIN';

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const unitData = await apiRequest<Unit[]>('/units');
      setUnits(unitData || []);
      const nextUnitId = selectedUnitId || (isUnitAdmin ? adminUser?.assignedUnitId || '' : unitData[0]?.id || '');
      if (nextUnitId && nextUnitId !== selectedUnitId) setSelectedUnitId(nextUnitId);
      const unitQuery = nextUnitId ? `?unitId=${encodeURIComponent(nextUnitId)}&includeInactive=true` : '?includeInactive=true';
      const [buildingData, departmentData] = await Promise.all([
        apiRequest<Option[]>(`/buildings${unitQuery}`),
        apiRequest<Option[]>(`/departments${nextUnitId ? `?unitId=${encodeURIComponent(nextUnitId)}&includeInactive=true` : '?includeInactive=true'}`),
      ]);
      setBuildings(buildingData || []); setDepartments(departmentData || []);
      const buildingId = selectedBuildingId || buildingData[0]?.id || '';
      if (buildingId && buildingId !== selectedBuildingId) setSelectedBuildingId(buildingId);
      setFloors(buildingId ? await apiRequest<Option[]>(`/floors?buildingId=${encodeURIComponent(buildingId)}&includeInactive=true`) : []);
      setSections(nextUnitId ? await apiRequest<Option[]>(`/sections?unitId=${encodeURIComponent(nextUnitId)}&includeInactive=true`) : []);
    } catch (err: any) { setError(err?.message || 'Facilities data could not be loaded.'); }
    finally { setLoading(false); }
  }, [adminUser?.assignedUnitId, isUnitAdmin, selectedBuildingId, selectedUnitId]);

  useEffect(() => { void load(); }, [load]);

  const currentUnit = units.find((unit) => unit.id === selectedUnitId);
  const visibleBuildings = useMemo(() => {
    const query = search.trim().toLowerCase();
    return buildings.filter((item) => !query || item.name.toLowerCase().includes(query) || item.code?.toLowerCase().includes(query));
  }, [buildings, search]);

  const saveUnit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(''); setNotice('');
    try {
      const payload = { name: unitForm.name.trim(), code: unitForm.code.trim(), location: unitForm.location.trim() || null };
      await apiRequest(unitForm.id ? `/units/${unitForm.id}` : '/units', { method: unitForm.id ? 'PUT' : 'POST', body: JSON.stringify(payload) });
      setUnitForm(emptyUnitForm); setNotice('Unit saved.'); await load();
    } catch (err: any) { setError(err?.message || 'Unit could not be saved.'); }
  };

  const editUnit = (unit: Unit) => setUnitForm({ id: unit.id, name: unit.name, code: unit.code || '', location: unit.location || '' });
  const changeUnitStatus = async (unit: Unit) => {
    const nextStatus = unit.lifecycleStatus === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
    if (!window.confirm(`${nextStatus === 'ACTIVE' ? 'Reactivate' : 'Deactivate'} Unit "${unit.name}"?`)) return;
    setError(''); setNotice('');
    try { await apiRequest(`/units/${unit.id}/status`, { method: 'PATCH', body: JSON.stringify({ lifecycleStatus: nextStatus }) }); setNotice(`Unit ${nextStatus === 'ACTIVE' ? 'reactivated' : 'deactivated'}.`); await load(); }
    catch (err: any) { setError(err?.message || 'Unit status could not be changed.'); }
  };
  const deleteUnit = async (unit: Unit) => {
    if (!window.confirm(`Delete Unit "${unit.name}"? This is allowed only when no dependent business records exist.`)) return;
    setError(''); setNotice('');
    try { await apiRequest(`/units/${unit.id}`, { method: 'DELETE' }); setNotice('Unit deleted.'); setSelectedUnitId(''); setSelectedBuildingId(''); await load(); }
    catch (err: any) { setError(err?.message || 'Unit could not be deleted.'); }
  };

  const managerParentOptions = (kind: CategoryKind): Option[] => {
    if (kind === 'building' || kind === 'department') return units;
    if (kind === 'floor') return buildings;
    if (kind === 'area') return floors;
    if (kind === 'section') return departments;
    return sections;
  };
  const managerParentLabel = (kind: CategoryKind) => ({ building: 'Unit', floor: 'Building', area: 'Floor', department: 'Unit', section: 'Department', function: 'Section' }[kind]);
  const managerParentId = (kind: CategoryKind) => ({ building: selectedUnitId, floor: selectedBuildingId, area: floors[0]?.id || '', department: selectedUnitId, section: departments[0]?.id || '', function: sections[0]?.id || '' }[kind]);

  return <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="facilities-page">
    <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"><MapPinned className="h-4 w-4" /> Facility structure</div><h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Facilities Management</h1><p className="mt-1 text-sm text-slate-500">Manage authorized Units and their Unit → Building → Floor → Office/Area hierarchy without orphaning business records.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button></section>
    {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</div>}{notice && <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</div>}
    <section className="grid gap-5 xl:grid-cols-[280px_minmax(0,1fr)]"><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><h2 className="text-sm font-semibold text-slate-900">Units</h2>{canManageMasterData && <button type="button" onClick={() => setUnitForm(emptyUnitForm)} className="rounded-md p-1.5 text-blue-700 hover:bg-blue-50" aria-label="Add Unit"><Plus className="h-4 w-4" /></button>}</div><div className="mt-3 space-y-1">{units.map((unit) => <button type="button" key={unit.id} onClick={() => { setSelectedUnitId(unit.id); setSelectedBuildingId(''); }} className={`w-full rounded-lg px-3 py-2 text-left ${selectedUnitId === unit.id ? 'bg-blue-50 text-blue-900' : 'hover:bg-slate-50 text-slate-700'}`}><span className="block truncate text-sm font-semibold">{unit.name}</span><span className="block text-xs text-slate-500">{unit.code || 'No code'}{unit.lifecycleStatus === 'INACTIVE' ? ' · Inactive' : ''}</span></button>)}</div>{canManageMasterData && <form onSubmit={saveUnit} className="mt-4 space-y-2 border-t border-slate-100 pt-4"><p className="text-xs font-semibold text-slate-700">{unitForm.id ? 'Edit Unit' : 'Add Unit'}</p><input value={unitForm.name} onChange={(e) => setUnitForm({ ...unitForm, name: e.target.value })} placeholder="Unit name" className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs" /><input value={unitForm.code} onChange={(e) => setUnitForm({ ...unitForm, code: e.target.value })} placeholder="Unit code" className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs" /><input value={unitForm.location} onChange={(e) => setUnitForm({ ...unitForm, location: e.target.value })} placeholder="Location (optional)" className="h-8 w-full rounded-md border border-slate-300 px-2 text-xs" /><div className="flex gap-2"><button type="submit" className="h-8 flex-1 rounded-md bg-slate-900 px-2 text-xs font-semibold text-white">Save</button>{unitForm.id && <button type="button" onClick={() => setUnitForm(emptyUnitForm)} className="h-8 rounded-md border border-slate-300 px-2 text-xs">Cancel</button>}</div></form>}</div>
      <div className="space-y-5"><div className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-base font-semibold text-slate-900">{currentUnit?.name || 'Select a Unit'}</h2><p className="text-xs text-slate-500">Building, floor and area relationships are loaded from their parent IDs.</p></div><div className="flex items-center gap-2"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search buildings" className="h-8 rounded-md border border-slate-300 px-2 text-xs" />{currentUnit && canManageMasterData && <><button type="button" onClick={() => editUnit(currentUnit)} className="inline-flex h-8 items-center gap-1 rounded-md border border-slate-300 px-2 text-xs font-semibold"><Pencil className="h-3 w-3" /> Edit Unit</button><button type="button" onClick={() => void changeUnitStatus(currentUnit)} className="h-8 rounded-md border border-amber-300 px-2 text-xs font-semibold text-amber-700">{currentUnit.lifecycleStatus === 'INACTIVE' ? 'Reactivate' : 'Deactivate'}</button><button type="button" onClick={() => void deleteUnit(currentUnit)} className="h-8 rounded-md border border-rose-300 px-2 text-xs font-semibold text-rose-700">Delete</button></>}</div></div><div className="mt-4 grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-slate-200 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Building2 className="h-4 w-4 text-blue-700" /> Buildings</div><p className="mt-2 text-2xl font-semibold tabular-nums">{buildings.length}</p><div className="mt-2 max-h-28 space-y-1 overflow-auto">{visibleBuildings.slice(0, 6).map((building) => <button type="button" key={building.id} onClick={() => setSelectedBuildingId(building.id)} className={`block w-full truncate text-left text-xs ${selectedBuildingId === building.id ? 'font-semibold text-blue-700' : 'text-slate-600 hover:text-blue-700'}`}>{building.name} · {building.code}</button>)}</div>{!isUnitAdmin && <button type="button" onClick={() => setSelectedKind('building')} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border border-slate-300 text-xs font-semibold"><Plus className="h-3 w-3" /> Manage buildings</button>}</div><div className="rounded-lg border border-slate-200 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-slate-600"><Layers3 className="h-4 w-4 text-orange-600" /> Floors</div><p className="mt-2 text-2xl font-semibold tabular-nums">{floors.length}</p><div className="mt-2 space-y-1">{floors.slice(0, 6).map((floor) => <div key={floor.id} className="truncate text-xs text-slate-600">{floor.name} · {floor.floorNumber ?? '—'}</div>)}</div>{!isUnitAdmin && <button type="button" onClick={() => setSelectedKind('floor')} disabled={!selectedBuildingId} className="mt-3 inline-flex h-8 w-full items-center justify-center gap-1 rounded-md border border-slate-300 text-xs font-semibold disabled:opacity-40"><Plus className="h-3 w-3" /> Manage floors</button>}</div></div></div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(['area', 'department', 'section', 'function'] as CategoryKind[]).map((kind) => <button type="button" key={kind} disabled={isUnitAdmin} onClick={() => setSelectedKind(kind)} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-300 hover:bg-blue-50/30 disabled:cursor-default disabled:opacity-80"><div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-blue-700" /><span className="text-sm font-semibold capitalize text-slate-900">{kind}s</span></div><p className="mt-2 text-xs text-slate-500">{isUnitAdmin ? 'View and use within your assigned Unit.' : 'Manage names, active status and safe removal under the selected parent.'}</p></button>)}</div>
      </div></section>
    {selectedKind && !isUnitAdmin && <CategoryManagerModal kind={selectedKind} parentId={managerParentId(selectedKind)} parentOptions={managerParentOptions(selectedKind)} parentLabel={managerParentLabel(selectedKind)} onClose={() => setSelectedKind(null)} onChanged={load} />}
  </div>;
};

export default FacilitiesPage;
