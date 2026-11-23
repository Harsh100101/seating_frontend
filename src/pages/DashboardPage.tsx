import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Armchair,
  ArrowRight,
  ArrowRightLeft,
  BarChart3,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FileText,
  LayoutGrid,
  Map,
  RefreshCw,
  Search,
  ShieldCheck,
  UserPlus,
  Users,
  UserRound,
  AlertTriangle,
} from 'lucide-react';
import { apiRequest, WORKSPACE_DATA_CHANGED_EVENT, WORKSPACE_DATA_SYNC_KEY } from '../api/client';
import { fetchWorkstationFilterOptions } from '../api/workstations';
import { useAuth } from '../context/AuthContext';
import { SkeletonCards } from '../components/SkeletonLoader';
import { PageHeroHeader } from '../components/PageHeroHeader';
import { isTransferPendingStatus } from '../utils/transferWorkflowPresentation';
import { formatOccupancyRate } from '../utils/format';

export { formatOccupancyRate } from '../utils/format';

const ALL_UNITS = 'ALL';

interface UnitOption {
  id: string;
  name: string;
  code: string;
  location?: string | null;
}

interface UnitBreakdown {
  unitId: string;
  unitName: string;
  unitCode?: string;
  total?: number;
  occupied?: number;
  rate?: number;
  totalSeats?: number;
  occupiedSeats?: number;
  occupancyRate?: number;
}

interface SummaryResponse {
  kpis?: {
    totalSeats?: number;
    occupiedSeats?: number;
    availableSeats?: number;
    totalEmployees?: number;
    overallOccupancyRate?: number;
  };
  totalSeats?: number;
  occupiedSeats?: number;
  availableSeats?: number;
  totalEmployees?: number;
  overallOccupancyRate?: number;
  byUnit?: UnitBreakdown[];
  unitBreakdown?: UnitBreakdown[];
}

interface TransferRequest {
  id: string;
  requestNumber?: string;
  status?: string;
  createdAt?: string;
  employee?: { fullName?: string; employeeCode?: string } | null;
  sourceUnitName?: string | null;
  targetUnitName?: string | null;
}

interface AuditEntry {
  id: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  createdAt?: string;
  admin?: { name?: string; email?: string };
}

interface NotificationEntry {
  id: string;
  title?: string;
  message?: string;
  createdAt?: string;
}

interface NotificationResponse {
  notifications?: NotificationEntry[];
}

type ActivityEntry =
  | { kind: 'audit'; item: AuditEntry }
  | { kind: 'notification'; item: NotificationEntry };

type Kpi = {
  label: string;
  value: string;
  detail: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: 'blue' | 'emerald' | 'amber' | 'slate';
};

const roleLabels: Record<string, string> = {
  TECH_ADMIN: 'Technical Admin',
  TECHADMIN: 'Technical Admin',
  SUPER_ADMIN: 'Super Admin',
  SUPERADMIN: 'Super Admin',
  UNIT_ADMIN: 'Unit Admin',
  UNITADMIN: 'Unit Admin',
};

const formatDateTime = (value?: string | Date) => {
  if (!value) return 'Not available';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not available';
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatStatus = (value?: string) =>
  (value || 'UNKNOWN').replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());

const getUnitOccupancy = (unit: UnitBreakdown) => Number(unit.occupancyRate ?? unit.rate ?? 0);
const getUnitTotal = (unit: UnitBreakdown) => Number(unit.totalSeats ?? unit.total ?? 0);
const getUnitOccupied = (unit: UnitBreakdown) => Number(unit.occupiedSeats ?? unit.occupied ?? 0);

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const rawRole = (adminUser?.role || '').toUpperCase().replace(/[\s-]+/g, '_');
  const role = rawRole === 'SUPERADMIN' ? 'SUPER_ADMIN' : rawRole === 'TECHADMIN' ? 'TECH_ADMIN' : rawRole;
  const isGlobalRole = role === 'SUPER_ADMIN' || role === 'TECH_ADMIN';
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState(ALL_UNITS);
  const [summary, setSummary] = useState<SummaryResponse | null>(null);
  const [transfers, setTransfers] = useState<TransferRequest[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const dashboardRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setSelectedUnitId(isGlobalRole ? ALL_UNITS : adminUser?.assignedUnitId || ALL_UNITS);
  }, [adminUser?.assignedUnitId, isGlobalRole]);

  useEffect(() => {
    const controller = new AbortController();
    setUnitsLoading(true);
    fetchWorkstationFilterOptions({}, controller.signal)
      .then((response) => setUnits(response.units || []))
      .catch((requestError) => {
        if (requestError?.name !== 'AbortError') setError('Unable to load authorized Units.');
      })
      .finally(() => setUnitsLoading(false));
    return () => controller.abort();
  }, [adminUser?.id]);

  const loadDashboard = useCallback(async () => {
    dashboardRequestRef.current?.abort();
    const controller = new AbortController();
    dashboardRequestRef.current = controller;
    setLoading(true);
    setError(null);
    try {
      const unitQuery = selectedUnitId !== ALL_UNITS ? `?unitId=${encodeURIComponent(selectedUnitId)}` : '';
      const requests: Promise<unknown>[] = [
        apiRequest<SummaryResponse>(`/reports/summary${unitQuery}`, { signal: controller.signal }),
        apiRequest<TransferRequest[]>('/transfer-requests?limit=50', { signal: controller.signal }),
      ];
      if (isGlobalRole) {
        requests.push(apiRequest<{ logs?: AuditEntry[] }>('/audit-logs?limit=8', { signal: controller.signal }));
      } else {
        requests.push(apiRequest<NotificationResponse>('/notifications?limit=8', { signal: controller.signal }));
      }

      const [summaryResponse, transferResponse, activityResponse] = await Promise.all(requests) as [
        SummaryResponse,
        TransferRequest[],
        { logs?: AuditEntry[] } | NotificationResponse
      ];

      setSummary(summaryResponse);
      setTransfers(Array.isArray(transferResponse) ? transferResponse : []);
      if (isGlobalRole) {
        setActivity(((activityResponse as { logs?: AuditEntry[] }).logs || []).map((item) => ({ kind: 'audit' as const, item })));
      } else {
        setActivity(((activityResponse as NotificationResponse).notifications || []).map((item) => ({ kind: 'notification' as const, item })));
      }
      setLastRefresh(new Date());
    } catch (requestError: any) {
      if (requestError?.name !== 'AbortError') setError(requestError?.message || 'Dashboard data could not be loaded.');
    } finally {
      setLoading(false);
    }
    if (dashboardRequestRef.current === controller) dashboardRequestRef.current = null;
  }, [isGlobalRole, selectedUnitId]);

  useEffect(() => {
    void loadDashboard();
    return () => dashboardRequestRef.current?.abort();
  }, [loadDashboard]);

  useEffect(() => {
    const refresh = () => { void loadDashboard(); };
    const refreshFromAnotherTab = (event: StorageEvent) => {
      if (event.key === WORKSPACE_DATA_SYNC_KEY) refresh();
    };
    window.addEventListener(WORKSPACE_DATA_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refreshFromAnotherTab);
    return () => {
      window.removeEventListener(WORKSPACE_DATA_CHANGED_EVENT, refresh);
      window.removeEventListener('storage', refreshFromAnotherTab);
    };
  }, [loadDashboard]);

  const kpis = summary?.kpis || summary || {};
  const unitBreakdown = useMemo(() => summary?.unitBreakdown || summary?.byUnit || [], [summary]);
  const pendingTransfers = useMemo(
    () => transfers.filter((request) => isTransferPendingStatus(request.status || '')).slice(0, 6),
    [transfers]
  );
  const selectedUnit = units.find((unit) => unit.id === selectedUnitId);
  const unitScopeLabel = selectedUnitId === ALL_UNITS ? 'All active Units' : selectedUnit?.name || 'Selected Unit';
  const totalSeats = Number(kpis.totalSeats ?? 0);
  const occupiedSeats = Number(kpis.occupiedSeats ?? 0);
  const availableSeats = Number(kpis.availableSeats ?? Math.max(totalSeats - occupiedSeats, 0));
  const activeEmployees = Number(kpis.totalEmployees ?? 0);
  const occupancyRate = Number(kpis.overallOccupancyRate ?? (totalSeats ? (occupiedSeats / totalSeats) * 100 : 0));

  const kpiCards: Kpi[] = [
    { label: 'Total workstations', value: totalSeats.toLocaleString(), detail: 'Authorized capacity', icon: Armchair, tone: 'blue' },
    { label: 'Occupied seats', value: occupiedSeats.toLocaleString(), detail: `${formatOccupancyRate(occupancyRate)} utilization`, icon: CheckCircle2, tone: 'emerald' },
    { label: 'Available seats', value: availableSeats.toLocaleString(), detail: 'Ready for assignment', icon: LayoutGrid, tone: 'slate' },
    { label: 'Active employees', value: activeEmployees.toLocaleString(), detail: 'In current Unit scope', icon: Users, tone: 'blue' },
    { label: 'Pending transfers', value: transfers.filter((request) => isTransferPendingStatus(request.status || '')).length.toLocaleString(), detail: 'Awaiting decision', icon: ArrowRightLeft, tone: 'amber' },
    { label: 'Occupancy rate', value: formatOccupancyRate(occupancyRate), detail: 'Occupied / total seats', icon: BarChart3, tone: 'emerald' },
  ];

  const quickActions = [
    { label: 'Add employee', description: 'Create a new employee record', icon: UserPlus, path: '/employees' },
    { label: 'Find employee', description: 'Search the employee directory', icon: Search, path: '/employees' },
    { label: 'Assign seat', description: 'Open workstation management', icon: Armchair, path: '/hierarchy' },
    { label: 'New transfer', description: 'Start a Unit transfer request', icon: ArrowRightLeft, path: '/transfer-requests' },
    { label: 'Review approvals', description: 'Open the approval queue', icon: ClipboardCheck, path: '/transfer-requests' },
    { label: 'Open floor plan', description: 'Inspect the live seating map', icon: Map, path: '/floor-plan' },
  ];

  if (loading && !summary) {
    return (
      <div className="dashboard-v3 min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8" data-testid="dashboard-v3">
        <div className="mx-auto max-w-[1440px] space-y-6">
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200/70" />
          <SkeletonCards count={6} />
          <div className="grid gap-5 lg:grid-cols-12"><div className="h-96 animate-pulse rounded-2xl bg-slate-200/70 lg:col-span-7" /><div className="h-96 animate-pulse rounded-2xl bg-slate-200/70 lg:col-span-5" /></div>
        </div>
      </div>
    );
  }

  if (error && !summary) {
    return (
      <div className="dashboard-v3 min-h-[calc(100vh-4rem)] px-4 py-10 sm:px-6" data-testid="dashboard-v3">
        <div className="mx-auto max-w-xl rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto h-8 w-8 text-rose-500" />
          <h1 className="mt-4 text-lg font-semibold text-slate-950">Workspace data unavailable</h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <button type="button" onClick={() => void loadDashboard()} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"><RefreshCw className="h-4 w-4" /> Retry</button>
        </div>
      </div>
    );
  }

  return (
    <main className="dashboard-v3 min-h-[calc(100vh-4rem)] px-4 py-6 sm:px-6 lg:px-8" data-testid="dashboard-v3">
      <div className="mx-auto max-w-[1440px] space-y-6">
        <PageHeroHeader
          id="dashboard-title"
          eyebrow="Operations command center"
          title="Workspace Overview"
          description="Monitor capacity, seat utilization and transfer decisions across your authorized Unit scope."
          icon={Activity}
          actions={<div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center"><div className="dashboard-scope-label"><ShieldCheck className="h-4 w-4 text-emerald-600" /><span>{roleLabels[role] || 'Administrator'}</span><span className="text-slate-300">·</span><span>{unitScopeLabel}</span></div><label className="sr-only" htmlFor="dashboard-unit-selector">Dashboard Unit</label><select id="dashboard-unit-selector" data-testid="dashboard-unit-selector" value={selectedUnitId} disabled={unitsLoading || !isGlobalRole} onChange={(event) => setSelectedUnitId(event.target.value)} className="dashboard-select">{isGlobalRole && <option value={ALL_UNITS}>All Units</option>}{units.map((unit) => <option key={unit.id} value={unit.id}>{unit.name}{unit.code ? ` · ${unit.code}` : ''}</option>)}</select><button type="button" aria-label="Refresh dashboard" onClick={() => void loadDashboard()} className="dashboard-refresh"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button></div>}
        />

        <div className="dashboard-refresh-line"><Clock3 className="h-3.5 w-3.5" /> Last successful refresh: <span>{formatDateTime(lastRefresh || undefined)}</span>{error && <span className="text-amber-700">· {error}</span>}</div>

        <section className="dashboard-kpi-grid" aria-label="Workspace metrics">{kpiCards.map((card) => { const Icon = card.icon; return <article key={card.label} data-testid="dashboard-kpi" className={`dashboard-kpi dashboard-kpi-${card.tone}`}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{card.label}</p><p className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 tabular-nums">{card.value}</p><p className="mt-1 text-xs text-slate-500">{card.detail}</p></div><Icon className="h-5 w-5 text-current" /></div></article>; })}</section>

        <div className="dashboard-grid">
          <section className="dashboard-panel dashboard-span-7" aria-labelledby="unit-performance-title"><div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">Capacity signal</p><h2 id="unit-performance-title" className="dashboard-title">Unit performance</h2></div><button type="button" onClick={() => navigate('/hierarchy')} className="dashboard-link">View workstations <ArrowRight className="h-4 w-4" /></button></div>{unitBreakdown.length === 0 ? <div className="dashboard-empty"><Building2 className="h-6 w-6" /><p>No Unit performance data is available for this scope.</p></div> : <div className="mt-5 space-y-3">{unitBreakdown.map((unit) => { const rate = Math.min(Math.max(getUnitOccupancy(unit), 0), 100); const isSelected = unit.unitId === selectedUnitId; return <button key={unit.unitId} type="button" data-testid="dashboard-unit-row" onClick={() => isGlobalRole && setSelectedUnitId(unit.unitId)} className={`dashboard-unit-row ${isSelected ? 'dashboard-unit-row-selected' : ''}`}><span className="min-w-0 flex-1 text-left"><span className="flex items-center gap-2"><span className="truncate text-sm font-semibold text-slate-900">{unit.unitName}</span>{unit.unitCode && <span className="dashboard-code">{unit.unitCode}</span>}</span><span className="mt-1 block text-xs text-slate-500">{getUnitOccupied(unit).toLocaleString()} occupied of {getUnitTotal(unit).toLocaleString()} workstations</span></span><span className="w-32 shrink-0"><span className="dashboard-meter"><span style={{ width: `${rate}%` }} /></span><span className="mt-1 block text-right text-xs font-semibold tabular-nums text-slate-700">{formatOccupancyRate(rate)}</span></span><ArrowRight className="ml-3 h-4 w-4 shrink-0 text-slate-300" /></button>; })}</div>}</section>

          <section className="dashboard-panel dashboard-span-5" aria-labelledby="quick-actions-title"><div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">Shortcuts</p><h2 id="quick-actions-title" className="dashboard-title">Quick actions</h2></div><LayoutGrid className="h-5 w-5 text-blue-600" /></div><div className="dashboard-action-grid mt-5">{quickActions.map((action) => { const Icon = action.icon; return <button key={action.label} type="button" data-testid="dashboard-quick-action" onClick={() => navigate(action.path)} className="dashboard-action"><Icon className="h-4 w-4 text-blue-700" /><span className="min-w-0 text-left"><span className="block text-sm font-semibold text-slate-900">{action.label}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{action.description}</span></span><ArrowRight className="ml-auto h-3.5 w-3.5 text-slate-300" /></button>; })}</div></section>

          <section className="dashboard-panel dashboard-span-7" aria-labelledby="transfer-center-title"><div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">Decision queue</p><h2 id="transfer-center-title" className="dashboard-title">Transfer approval center</h2></div><button type="button" onClick={() => navigate('/transfer-requests')} className="dashboard-link">Open queue <ArrowRight className="h-4 w-4" /></button></div>{pendingTransfers.length === 0 ? <div className="dashboard-empty"><CheckCircle2 className="h-6 w-6 text-emerald-600" /><p>No pending transfers in the current scope.</p></div> : <div className="dashboard-table-wrap mt-4"><table className="dashboard-table"><thead><tr><th>Employee</th><th>Route</th><th>Status</th><th><span className="sr-only">Review</span></th></tr></thead><tbody>{pendingTransfers.map((request) => <tr key={request.id} data-testid="dashboard-transfer-row"><td><span className="font-semibold text-slate-900">{request.employee?.fullName || 'Employee unavailable'}</span><span className="block text-xs text-slate-500">{request.employee?.employeeCode || request.requestNumber || request.id.slice(0, 8)}</span></td><td><span className="inline-flex items-center gap-2 text-xs text-slate-600"><span>{request.sourceUnitName || 'Source Unit'}</span><ArrowRight className="h-3 w-3 text-slate-300" /><span>{request.targetUnitName || 'Destination Unit'}</span></span></td><td><span className="dashboard-status">{formatStatus(request.status)}</span></td><td className="text-right"><button type="button" onClick={() => navigate('/transfer-requests')} className="dashboard-review">Review</button></td></tr>)}</tbody></table></div>}</section>

          <section className="dashboard-panel dashboard-span-5" aria-labelledby="activity-title"><div className="dashboard-panel-heading"><div><p className="dashboard-eyebrow">Authorized trail</p><h2 id="activity-title" className="dashboard-title">Recent activity</h2></div><FileText className="h-5 w-5 text-blue-600" /></div>{activity.length === 0 ? <div className="dashboard-empty"><Clock3 className="h-6 w-6" /><p>No recent authorized activity.</p></div> : <div className="mt-4 space-y-4">{activity.slice(0, 6).map((entry) => { const isAudit = entry.kind === 'audit'; const item = entry.item; const title = isAudit ? formatStatus((item as AuditEntry).action) : (item as NotificationEntry).title || 'Notification'; const detail = isAudit ? `${(item as AuditEntry).entityType || 'Record'} · ${(item as AuditEntry).admin?.name || 'System'}` : (item as NotificationEntry).message || 'Authorized notification'; const date = isAudit ? (item as AuditEntry).createdAt : (item as NotificationEntry).createdAt; return <div key={`${entry.kind}-${item.id}`} className="dashboard-activity-row"><span className="dashboard-activity-mark"><Activity className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-slate-800">{title}</span><span className="mt-0.5 block truncate text-xs text-slate-500">{detail}</span></span><time className="shrink-0 text-[11px] text-slate-400">{formatDateTime(date)}</time></div>; })}</div>}</section>
        </div>

        <section className="dashboard-footer-callout"><div className="flex items-start gap-3"><UserRound className="mt-0.5 h-5 w-5 text-blue-700" /><div><p className="text-sm font-semibold text-slate-900">Scope-aware by design</p><p className="mt-1 text-xs leading-5 text-slate-500">Dashboard metrics and queues are returned by the authorized backend scope for <span className="font-semibold text-slate-700">{unitScopeLabel}</span>. Changing context refreshes every panel together.</p></div></div><button type="button" onClick={() => navigate('/data-quality')} className="dashboard-link shrink-0">Data quality <ArrowRight className="h-4 w-4" /></button></section>
      </div>
    </main>
  );
};

export default DashboardPage;
