import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Download,
  RefreshCw,
  Building2,
  Users,
  CheckCircle2,
  Clock,
  AlertCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Layers,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import type {
  WorkstationRecord,
  WorkstationQueryParams,
  WorkstationFilterOptionsResponse,
  WorkstationListResponse,
  WorkstationStatusFilter,
} from '@seating/shared';
import { useAuth } from '../context/AuthContext';
import { fetchWorkstations, fetchWorkstationFilterOptions } from '../api/workstations';
import { WorkstationFilters } from '../components/workstations/WorkstationFilters';

type SortField = NonNullable<WorkstationQueryParams['sortBy']>;

export const HierarchyPage: React.FC = () => {
  const { adminUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // ---------------------------------------------------------------------------
  // Parse initial state from URL query params
  // ---------------------------------------------------------------------------
  const [params, setParams] = useState<WorkstationQueryParams>(() => {
    return {
      search: searchParams.get('search') || undefined,
      unitId: searchParams.get('unitId') || undefined,
      buildingId: searchParams.get('buildingId') || undefined,
      floorId: searchParams.get('floorId') || undefined,
      officeArea: searchParams.get('officeArea') || undefined,
      departmentId: searchParams.get('departmentId') || undefined,
      section: searchParams.get('section') || undefined,
      functionName: searchParams.get('functionName') || undefined,
      status: (searchParams.get('status') as WorkstationStatusFilter) || undefined,
      wsNo: searchParams.get('wsNo') || undefined,
      empCode: searchParams.get('empCode') || undefined,
      employeeName: searchParams.get('employeeName') || undefined,
      reportingTo: searchParams.get('reportingTo') || undefined,
      hod: searchParams.get('hod') || undefined,
      sortBy: (searchParams.get('sortBy') as SortField) || 'wsNo',
      sortOrder: (searchParams.get('sortOrder') as 'asc' | 'desc') || 'asc',
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!, 10) : 1,
      pageSize: searchParams.get('pageSize') ? parseInt(searchParams.get('pageSize')!, 10) : 25,
    };
  });

  // Data states
  const [data, setData] = useState<WorkstationRecord[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false,
  });
  const [kpis, setKpis] = useState({
    totalWorkstations: 0,
    occupiedCount: 0,
    availableCount: 0,
    reservedCount: 0,
    maintenanceCount: 0,
    otherCount: 0,
    occupancyRate: 0,
  });
  const [options, setOptions] = useState<WorkstationFilterOptionsResponse | null>(null);

  const [loading, setLoading] = useState<boolean>(true);
  const [optionsLoading, setOptionsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // AbortController refs to cancel pending calls
  const dataAbortControllerRef = useRef<AbortController | null>(null);
  const optionsAbortControllerRef = useRef<AbortController | null>(null);

  // ---------------------------------------------------------------------------
  // Sync URL search params when state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const newSearchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== '') {
        newSearchParams.set(key, String(val));
      }
    });
    setSearchParams(newSearchParams, { replace: true });
  }, [params, setSearchParams]);

  // ---------------------------------------------------------------------------
  // Load Workstations Data
  // ---------------------------------------------------------------------------
  const loadWorkstations = useCallback(async () => {
    if (dataAbortControllerRef.current) {
      dataAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    dataAbortControllerRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const res: WorkstationListResponse = await fetchWorkstations(params, controller.signal);
      setData(res.data);
      setPagination(res.pagination);
      setKpis(res.kpis);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load workstations:', err);
        setError(err.message || 'Failed to fetch workstation records');
      }
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    loadWorkstations();
  }, [loadWorkstations]);

  // ---------------------------------------------------------------------------
  // Load Filter Options dynamically based on active cascade selections
  // ---------------------------------------------------------------------------
  const loadFilterOptions = useCallback(async () => {
    if (optionsAbortControllerRef.current) {
      optionsAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    optionsAbortControllerRef.current = controller;

    setOptionsLoading(true);

    try {
      const opts = await fetchWorkstationFilterOptions(
        {
          unitId: params.unitId,
          buildingId: params.buildingId,
          floorId: params.floorId,
          officeArea: params.officeArea,
          departmentId: params.departmentId,
          section: params.section,
          functionName: params.functionName,
        },
        controller.signal
      );
      if (!controller.signal.aborted) setOptions(opts);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Failed to load filter options:', err);
      }
    } finally {
      if (optionsAbortControllerRef.current === controller) setOptionsLoading(false);
    }
  }, [
    params.unitId,
    params.buildingId,
    params.floorId,
    params.officeArea,
    params.departmentId,
    params.section,
    params.functionName,
  ]);

  useEffect(() => {
    loadFilterOptions();
  }, [loadFilterOptions]);

  // ---------------------------------------------------------------------------
  // Filter change handlers
  // ---------------------------------------------------------------------------
  const handleFilterChange = useCallback((
    newFilters: Partial<WorkstationQueryParams>,
    _shouldResetChildren?: boolean
  ) => {
    setParams((prev) => ({
      ...prev,
      ...newFilters,
      page: 1, // Reset to first page on filter change
    }));
  }, []);

  const handleResetAll = () => {
    setParams((prev) => ({
      unitId: options?.userScope?.lockedUnitId || undefined,
      page: 1,
      pageSize: prev.pageSize || 25,
      sortBy: 'wsNo',
      sortOrder: 'asc',
    }));
  };

  const handleClearSearch = () => {
    setParams((prev) => ({
      ...prev,
      search: undefined,
      page: 1,
    }));
  };

  const selectedUnitName = params.unitId
    ? options?.units.find((unit) => unit.id === params.unitId)?.name || params.unitId
    : 'All Units';
  const selectedBuildingName = params.buildingId
    ? options?.buildings.find((building) => building.id === params.buildingId)?.name || params.buildingId
    : 'All Buildings';
  const selectedFloorName = params.floorId
    ? options?.floors.find((floor) => floor.id === params.floorId)?.name || params.floorId
    : 'All Floors';

  // ---------------------------------------------------------------------------
  // Sorting handler
  // ---------------------------------------------------------------------------
  const handleSort = (field: SortField) => {
    setParams((prev) => {
      const isAsc = prev.sortBy === field && prev.sortOrder === 'asc';
      return {
        ...prev,
        sortBy: field,
        sortOrder: isAsc ? 'desc' : 'asc',
        page: 1,
      };
    });
  };

  const renderSortIcon = (field: SortField) => {
    if (params.sortBy !== field) {
      return <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />;
    }
    return params.sortOrder === 'asc' ? (
      <ArrowUp className="w-3.5 h-3.5 text-blue-600 font-bold" />
    ) : (
      <ArrowDown className="w-3.5 h-3.5 text-blue-600 font-bold" />
    );
  };

  // ---------------------------------------------------------------------------
  // Status Badge Helper
  // ---------------------------------------------------------------------------
  const getStatusBadge = (status: string) => {
    switch (status.toUpperCase()) {
      case 'OCCUPIED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Occupied
          </span>
        );
      case 'AVAILABLE':
      case 'VACANT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
            Available
          </span>
        );
      case 'RESERVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Reserved
          </span>
        );
      case 'MAINTENANCE':
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Maintenance
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // ---------------------------------------------------------------------------
  // Export to CSV
  // ---------------------------------------------------------------------------
  const escapeCsvCell = (value: unknown): string => {
    const raw = value === null || value === undefined ? '' : String(value);
    // Prefix values that could be interpreted as formulas, including values
    // with leading whitespace/control characters before the formula marker.
    const safe = /^\s*[=+\-@]/.test(raw) ? `'${raw}` : raw;
    return `"${safe.replace(/"/g, '""')}"`;
  };

  const handleExportCSV = () => {
    if (data.length === 0) return;

    const headers = [
      'Unit',
      'Building',
      'Floor',
      'Office / Area',
      'Department',
      'Section',
      'Function',
      'WS NO',
      'Emp Code',
      'E. Name',
      'Reporting To',
      'HOD',
      'Status',
    ];

    const rows = data.map((d) => [
      d.unit.name,
      d.building?.name || '',
      d.floor?.name || '',
      d.officeArea || '',
      d.department?.name || '',
      d.section || '',
      d.functionName || '',
      d.wsNo,
      d.employee?.employeeCode || '',
      d.employee?.fullName || '',
      d.employee?.reportingTo || d.employee?.reportingManager || '',
      d.employee?.hod || '',
      d.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.map(escapeCsvCell).join(','))].join('\r\n');
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `workstations_export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  };

  return (
    <div className="ios-page max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="hierarchy-workstations">
      {/* Page Header */}
      <header className="employees-v3-heading" aria-labelledby="hierarchy-title">
        <div>
          <div className="employees-v3-kicker">
            <Building2 className="h-4 w-4" /> Workspace management
          </div>
          <h1 id="hierarchy-title" className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
            Hierarchy & Workstations
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Explore workstations, monitor seating availability and manage workspace records across your authorized Unit scope.
          </p>
        </div>
        <div className="employees-v3-header-actions">
          {adminUser?.role === 'UNIT_ADMIN' && options?.userScope?.assignedUnitName && (
            <div className="employees-v3-scope">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0" />
              <span>UNIT_ADMIN</span>
              <span className="text-slate-300">·</span>
              <span>{options.userScope.assignedUnitName}</span>
            </div>
          )}
          {adminUser?.role === 'SUPER_ADMIN' && (
            <div className="employees-v3-scope">
              <ShieldCheck className="h-4 w-4 text-purple-600 shrink-0" />
              <span>SUPER_ADMIN</span>
              <span className="text-slate-300">·</span>
              <span>Global View</span>
            </div>
          )}
          {adminUser?.role === 'TECH_ADMIN' && (
            <div className="employees-v3-scope">
              <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>TECH_ADMIN</span>
              <span className="text-slate-300">·</span>
              <span>Global View</span>
            </div>
          )}
          <button
            type="button"
            onClick={() => loadWorkstations()}
            disabled={loading}
            className="employees-v3-secondary-action"
            title="Refresh records"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            disabled={data.length === 0}
            className="employees-v3-secondary-action"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        </div>
      </header>

      {/* KPI Summary Cards */}
      <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4" aria-label="Workstation KPI metrics">
        <article className="employees-v3-kpi employees-v3-kpi-blue">
          <div>
            <p>Total Seats</p>
            <strong>{kpis.totalWorkstations.toLocaleString()}</strong>
            <span>Workstations in scope</span>
          </div>
          <Building2 className="h-5 w-5" />
        </article>

        <article className="employees-v3-kpi employees-v3-kpi-emerald">
          <div>
            <p>Occupied</p>
            <strong>{kpis.occupiedCount.toLocaleString()}</strong>
            <span>{kpis.occupancyRate}% occupancy</span>
          </div>
          <Users className="h-5 w-5" />
        </article>

        <article className="employees-v3-kpi employees-v3-kpi-blue">
          <div>
            <p>Available</p>
            <strong>{kpis.availableCount.toLocaleString()}</strong>
            <span>{kpis.totalWorkstations > 0 ? `${Math.round((kpis.availableCount / kpis.totalWorkstations) * 100)}% vacant` : '0%'}</span>
          </div>
          <CheckCircle2 className="h-5 w-5" />
        </article>

        <article className="employees-v3-kpi employees-v3-kpi-amber">
          <div>
            <p>Reserved</p>
            <strong>{kpis.reservedCount.toLocaleString()}</strong>
            <span>Allocated workstations</span>
          </div>
          <Clock className="h-5 w-5" />
        </article>

        <article className="employees-v3-kpi employees-v3-kpi-amber">
          <div>
            <p>Maintenance</p>
            <strong>{kpis.maintenanceCount.toLocaleString()}</strong>
            <span>Blocked / in repair</span>
          </div>
          <AlertCircle className="h-5 w-5 text-rose-600" />
        </article>
      </section>

      {/* Modern 3-Row Filter Panel */}
      <div className="ios-toolbar bg-white p-3.5 rounded-lg border border-slate-200/90 shadow-2xs">
        <WorkstationFilters
          filters={params}
          options={options}
          loadingOptions={optionsLoading}
          onFilterChange={handleFilterChange}
          onResetAll={handleResetAll}
        />
      </div>

      {/* Error Banner */}
      {error && (
        <div className="employees-v3-error" role="alert">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadWorkstations()}
            className="text-xs font-bold text-rose-700 underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {/* Data Table Container */}
      <div className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  1. Unit
                </th>
                <th
                  onClick={() => handleSort('building')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>2. Building</span>
                    {renderSortIcon('building')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('floor')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>3. Floor</span>
                    {renderSortIcon('floor')}
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  4. Office / Area
                </th>
                <th
                  onClick={() => handleSort('department')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>5. Department</span>
                    {renderSortIcon('department')}
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  6. Section
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  7. Function
                </th>
                <th
                  onClick={() => handleSort('wsNo')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap font-bold text-gray-900"
                >
                  <div className="flex items-center gap-1.5">
                    <span>8. WS NO</span>
                    {renderSortIcon('wsNo')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('empCode')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>9. Emp Code</span>
                    {renderSortIcon('empCode')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('employeeName')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap"
                >
                  <div className="flex items-center gap-1.5">
                    <span>10. E. Name</span>
                    {renderSortIcon('employeeName')}
                  </div>
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  11. Reporting To
                </th>
                <th className="px-4 py-3.5 whitespace-nowrap">
                  12. HOD
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-gray-100/80 transition-colors group select-none whitespace-nowrap text-center"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>13. Status</span>
                    {renderSortIcon('status')}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {loading ? (
                // Skeleton loading state
                Array.from({ length: 10 }).map((_, index) => (
                  <tr key={`skeleton-${index}`} className="animate-pulse">
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-blue-200 rounded w-16" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-20" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-28" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-3.5"><div className="h-4 bg-gray-200 rounded w-24" /></td>
                    <td className="px-4 py-3.5 text-center"><div className="h-5 bg-gray-200 rounded-full w-20 mx-auto" /></td>
                  </tr>
                ))
              ) : data.length === 0 ? (
                // Empty state
                <tr>
                  <td colSpan={13} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                      <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3">
                        <Layers className="w-6 h-6" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-900">No matching workstations</h3>
                      <p className="mt-1 text-xs text-gray-500">
                        No workstations match the current filters. Scope: {selectedUnitName} / {selectedBuildingName} / {selectedFloorName}.
                        {params.search ? ` Search "${params.search}" returned no matches in this scope.` : ' Try changing a filter or selecting a different scope.'}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                        {params.search && (
                          <button
                            onClick={handleClearSearch}
                            className="inline-flex items-center px-3 py-1.5 border border-blue-200 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 shadow-sm"
                          >
                            Clear Search
                          </button>
                        )}
                        <button
                          onClick={handleResetAll}
                          className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm"
                        >
                          Reset All Filters
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                // Data rows
                data.map((row) => (
                  <tr
                    key={row.id}
                    className="hover:bg-blue-50/40 transition-colors border-b border-gray-100 group"
                  >
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-700">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800">
                        {row.unit.name}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium">
                      {row.building?.name || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {row.floor ? (row.floor.floorNumber === 0 ? 'Ground Floor' : (row.floor.name || `Floor ${row.floor.floorNumber}`)) : '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {row.officeArea || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-800 font-medium">
                      <span className="text-gray-900 font-semibold">{row.department?.name || '-'}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {row.section || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {row.functionName || '-'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-bold text-blue-700 font-mono tracking-tight">
                      {row.wsNo}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-mono text-gray-600">
                      {row.employee?.employeeCode || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-gray-900">
                      {row.employee?.fullName || <span className="text-gray-400 italic font-normal">Unassigned</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {row.employee?.reportingTo || row.employee?.reportingManager || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      {row.employee?.hod || <span className="text-gray-300">-</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {getStatusBadge(row.status)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Server-Side Pagination Footer */}
        <div className="flex items-center justify-between border-t border-slate-200 bg-white px-3 py-2 shadow-2xs">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <label htmlFor="pageSizeSelect">Rows:</label>
            <select
              id="pageSizeSelect"
              value={params.pageSize || 25}
              onChange={(e) =>
                setParams((prev) => ({
                  ...prev,
                  pageSize: parseInt(e.target.value, 10),
                  page: 1,
                }))
              }
              className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span>
              Showing <strong className="text-slate-800 font-mono font-semibold">{pagination.total > 0 ? (pagination.page - 1) * pagination.pageSize + 1 : 0}</strong> to <strong className="text-slate-800 font-mono font-semibold">{Math.min(pagination.page * pagination.pageSize, pagination.total)}</strong> of <strong className="text-slate-800 font-mono font-semibold">{pagination.total}</strong> records
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setParams((prev) => ({ ...prev, page: Math.max(1, prev.page! - 1) }))}
              disabled={pagination.page <= 1 || loading}
              className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-slate-600">
              {pagination.page} / {pagination.totalPages || 1}
            </span>
            <button
              onClick={() =>
                setParams((prev) => ({ ...prev, page: Math.min(pagination.totalPages, (prev.page || 1) + 1) }))
              }
              disabled={pagination.page >= pagination.totalPages || loading}
              className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40 hover:bg-slate-50 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HierarchyPage;
