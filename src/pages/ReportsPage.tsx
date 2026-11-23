import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, FileBarChart2, Users, Armchair, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

type Unit = { id: string; name: string; code?: string };
type Breakdown = {
  unitId?: string;
  unitName?: string;
  unitCode?: string;
  plantName?: string;
  floorId?: string;
  floorName?: string;
  buildingName?: string;
  total?: number;
  totalSeats?: number;
  occupied?: number;
  occupiedSeats?: number;
  availableSeats?: number;
  occupancyRate?: number;
  rate?: number;
  departments?: Array<{ departmentName: string; allocatedSeats: number; totalSeats: number }>;
};
type Summary = {
  kpis?: {
    totalSeats?: number;
    occupiedSeats?: number;
    availableSeats?: number;
    maintenanceSeats?: number;
    reservedSeats?: number;
    overallOccupancyRate?: number;
    totalEmployees?: number;
    unassignedEmployees?: number;
  };
  byUnit?: Breakdown[];
  byPlant?: Breakdown[];
  byFloor?: Breakdown[];
  byDepartment?: Array<{ departmentName?: string; allocatedSeats?: number; floorAllocations?: Record<string, number> }>;
};

const numberValue = (value?: number) => Number(value || 0).toLocaleString();

export const ReportsPage: React.FC = () => {
  const { adminUser } = useAuth();
  const isGlobal = adminUser?.role === 'SUPER_ADMIN' || adminUser?.role === 'TECH_ADMIN';
  const [units, setUnits] = useState<Unit[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState('ALL');
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const scoped = adminUser?.role === 'UNIT_ADMIN' ? adminUser.assignedUnitId || '' : '';
    setSelectedUnitId(scoped || 'ALL');
    apiRequest<Unit[]>('/units').then(setUnits).catch(() => setUnits([]));
  }, [adminUser?.id, adminUser?.role, adminUser?.assignedUnitId]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const query = selectedUnitId !== 'ALL' ? `?unitId=${encodeURIComponent(selectedUnitId)}` : '';
      setSummary(await apiRequest<Summary>(`/reports/summary${query}`));
    } catch (err: any) {
      setError(err?.message || 'Reports could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [selectedUnitId]);

  useEffect(() => { void load(); }, [load]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const query = selectedUnitId !== 'ALL' ? `?unitId=${encodeURIComponent(selectedUnitId)}` : '';
      const csv = await apiRequest<string>(`/reports/export-csv${query}`);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `seating-report-${selectedUnitId === 'ALL' ? 'all-units' : selectedUnitId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err?.message || 'The report export could not be downloaded.');
    } finally {
      setExporting(false);
    }
  };

  const kpis = summary?.kpis || {};
  const cards = useMemo(() => [
    { label: 'Workstations', value: kpis.totalSeats, detail: 'In the current authorized scope', icon: Armchair },
    { label: 'Occupied', value: kpis.occupiedSeats, detail: `${kpis.overallOccupancyRate || 0}% effective occupancy`, icon: FileBarChart2 },
    { label: 'Available', value: kpis.availableSeats, detail: 'Ready for assignment', icon: Armchair },
    { label: 'Employees', value: kpis.totalEmployees, detail: `${numberValue(kpis.unassignedEmployees)} unassigned`, icon: Users },
    { label: 'Transfers', value: undefined, detail: 'See transfer queue for workflow status', icon: ArrowRightLeft },
  ], [kpis]);

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-6" data-testid="reports-page">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700"><FileBarChart2 className="h-4 w-4" /> Authorized reporting</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">Reports</h1>
          <p className="mt-1 text-sm text-slate-500">Capacity, occupancy and employee statistics computed from the current backend scope.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="reports-unit">Report Unit</label>
          <select id="reports-unit" value={selectedUnitId} disabled={!isGlobal || loading} onChange={(event) => setSelectedUnitId(event.target.value)} className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700">
            {isGlobal && <option value="ALL">All Units</option>}
            {units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}{unit.code ? ` · ${unit.code}` : ''}</option>)}
          </select>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          <button type="button" onClick={() => void exportCsv()} disabled={exporting} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-3 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> {exporting ? 'Preparing…' : 'Export CSV'}</button>
        </div>
      </section>

      {error && <div role="alert" className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"><AlertTriangle className="h-4 w-4" /> {error}</div>}
      {loading && !summary ? <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">Loading authorized report data…</div> : summary ? (
        <>
          <section className="grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Report metrics">
            {cards.map((card) => { const Icon = card.icon; return <article key={card.label} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><span className="text-xs font-semibold uppercase tracking-[0.1em] text-slate-500">{card.label}</span><Icon className="h-4 w-4 text-blue-700" /></div><p className="mt-3 text-2xl font-semibold tabular-nums text-slate-950">{card.value === undefined ? '—' : numberValue(card.value)}</p><p className="mt-1 text-xs text-slate-500">{card.detail}</p></article>; })}
          </section>
          <div className="grid gap-5 xl:grid-cols-2">
            <section className="rounded-xl border border-slate-200 bg-white" aria-labelledby="report-units"><div className="border-b border-slate-100 px-5 py-4"><h2 id="report-units" className="text-base font-semibold text-slate-900">Unit capacity</h2><p className="mt-1 text-xs text-slate-500">Workstations and effective occupancy in the selected scope.</p></div><div className="overflow-x-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500"><th className="px-5 py-3 font-medium">Unit</th><th className="px-5 py-3 text-right font-medium">Total</th><th className="px-5 py-3 text-right font-medium">Occupied</th><th className="px-5 py-3 text-right font-medium">Rate</th></tr></thead><tbody>{(summary.byUnit || []).map((row) => <tr key={row.unitId || row.unitName} className="border-b border-slate-100 last:border-0"><td className="px-5 py-3 font-medium text-slate-800">{row.unitName || '—'}<span className="ml-2 text-xs text-slate-400">{row.unitCode || ''}</span></td><td className="px-5 py-3 text-right tabular-nums">{numberValue(row.totalSeats ?? row.total)}</td><td className="px-5 py-3 text-right tabular-nums">{numberValue(row.occupiedSeats ?? row.occupied)}</td><td className="px-5 py-3 text-right tabular-nums">{row.occupancyRate ?? row.rate ?? 0}%</td></tr>)}{(summary.byUnit || []).length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">No Unit breakdown is available for this scope.</td></tr>}</tbody></table></div></section>
            <section className="rounded-xl border border-slate-200 bg-white" aria-labelledby="report-floors"><div className="border-b border-slate-100 px-5 py-4"><h2 id="report-floors" className="text-base font-semibold text-slate-900">Floor occupancy</h2><p className="mt-1 text-xs text-slate-500">The first floors in the current authorized report result.</p></div><div className="max-h-[390px] overflow-auto"><table className="min-w-full text-sm"><thead><tr className="border-b border-slate-200 text-left text-xs text-slate-500"><th className="px-5 py-3 font-medium">Floor</th><th className="px-5 py-3 font-medium">Building</th><th className="px-5 py-3 text-right font-medium">Seats</th><th className="px-5 py-3 text-right font-medium">Rate</th></tr></thead><tbody>{(summary.byFloor || []).slice(0, 20).map((row) => <tr key={row.floorId || `${row.buildingName}-${row.floorName}`} className="border-b border-slate-100 last:border-0"><td className="px-5 py-3 font-medium text-slate-800">{row.floorName || '—'}</td><td className="px-5 py-3 text-slate-600">{row.buildingName || '—'}</td><td className="px-5 py-3 text-right tabular-nums">{numberValue(row.totalSeats ?? row.total)}</td><td className="px-5 py-3 text-right tabular-nums">{row.occupancyRate ?? row.rate ?? 0}%</td></tr>)}{(summary.byFloor || []).length === 0 && <tr><td colSpan={4} className="px-5 py-8 text-center text-sm text-slate-500">No floor data is available.</td></tr>}</tbody></table></div></section>
          </div>
        </>
      ) : <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">No report data is available for the current scope.</div>}
    </div>
  );
};

export default ReportsPage;
