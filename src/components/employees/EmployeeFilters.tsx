// apps/frontend/src/components/employees/EmployeeFilters.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  RotateCcw,
  Building2,
  Layers,
  MapPin,
  Briefcase,
  Users,
  UserCheck,
  Armchair,
  ShieldCheck,
  ArrowUpDown,
  Lock,
  X,
  LayoutGrid,
  Table as TableIcon
} from 'lucide-react';
import { resolveFilterDisplayLabel } from '../../utils/filterDisplayLabel';

export type EmployeeSortField = 'employeeCode' | 'employeeName' | 'active';

export interface EmployeeFiltersState {
  unitId?: string;
  buildingId?: string;
  floorId?: string;
  officeArea?: string;
  departmentId?: string;
  sectionId?: string;
  functionId?: string;
  reportingTo?: string;
  hod?: string;
  seatingStatus: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
  activeStatus: 'ALL' | 'ACTIVE' | 'INACTIVE';
  search: string;
  sortBy: EmployeeSortField;
  sortOrder: 'asc' | 'desc';
  page: number;
  pageSize: number;
}

export interface EmployeeFilterOptionsData {
  units: Array<{ id: string; name: string; code?: string; location?: string }>;
  buildings: Array<{ id: string; name: string; code?: string; unitId?: string }>;
  floors: Array<{ id: string; name: string; floorNumber: number; buildingId: string; displayName?: string }>;
  officeAreas: string[];
  areaOptions: Array<{ id: string; name: string; floorId: string; displayName?: string }>;
  departments: Array<{ id: string; name: string; code?: string; colorHex?: string }>;
  sections: string[];
  sectionOptions: Array<{ id: string; name: string; departmentId: string; displayName?: string }>;
  functions: string[];
  functionOptions: Array<{ id: string; name: string; sectionId: string; displayName?: string }>;
  reportingToList: string[];
  hods: string[];
  userScope?: {
    role: string;
    isRestricted: boolean;
    lockedUnitId: string | null;
    assignedUnitName?: string | null;
  };
}

interface Props {
  filters: EmployeeFiltersState;
  options: EmployeeFilterOptionsData | null;
  loadingOptions: boolean;
  onFilterChange: (newFilters: Partial<EmployeeFiltersState>) => void;
  onResetAll: () => void;
  // Toolbar controls
  totalCount: number;
  loadedCount: number;
  page: number;
  totalPages: number;
  viewMode: 'cards' | 'table';
  onViewModeChange: (mode: 'cards' | 'table') => void;
  pageSize: number;
  onPageSizeChange: (size: number) => void;
}

export const EmployeeFilters: React.FC<Props> = ({
  filters,
  options,
  loadingOptions,
  onFilterChange,
  onResetAll,
  totalCount,
  loadedCount,
  page,
  totalPages,
  viewMode,
  onViewModeChange,
  pageSize,
  onPageSizeChange,
}) => {
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFilterChangeRef = useRef(onFilterChange);

  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  // Keep local search input in sync if filters.search changes externally
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    searchTimerRef.current = setTimeout(() => {
      onFilterChangeRef.current({ search: value.trim(), page: 1 });
      searchTimerRef.current = null;
    }, 350);
  };

  const handleClearSearch = () => {
    setSearchInput('');
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    onFilterChange({ search: '', page: 1 });
  };

  const isRestrictedUnit = Boolean(options?.userScope?.isRestricted);
  const lockedUnitId = options?.userScope?.lockedUnitId;

  // Filter change handlers with parent-child cascade reset rules
  const handleUnitChange = (unitId: string) => {
    if (isRestrictedUnit) return;
    onFilterChange({
      unitId: unitId === 'ALL' ? undefined : unitId,
      buildingId: undefined,
      floorId: undefined,
      officeArea: undefined,
      departmentId: undefined,
      sectionId: undefined,
      functionId: undefined,
      page: 1
    });
  };

  const handleBuildingChange = (buildingId: string) => {
    onFilterChange({
      buildingId: buildingId === 'ALL' ? undefined : buildingId,
      floorId: undefined,
      officeArea: undefined,
      page: 1
    });
  };

  const handleFloorChange = (floorId: string) => {
    onFilterChange({
      floorId: floorId === 'ALL' ? undefined : floorId,
      officeArea: undefined,
      page: 1
    });
  };

  const handleAreaChange = (area: string) => {
    onFilterChange({
      officeArea: area === 'ALL' ? undefined : area,
      page: 1
    });
  };

  const handleDepartmentChange = (departmentId: string) => {
    onFilterChange({
      departmentId: departmentId === 'ALL' ? undefined : departmentId,
      sectionId: undefined,
      functionId: undefined,
      page: 1
    });
  };

  const handleSectionChange = (sectionId: string) => {
    onFilterChange({
      sectionId: sectionId === 'ALL' ? undefined : sectionId,
      functionId: undefined,
      page: 1
    });
  };

  const handleFunctionChange = (functionId: string) => {
    onFilterChange({
      functionId: functionId === 'ALL' ? undefined : functionId,
      page: 1
    });
  };

  const handleReportingToChange = (reportingTo: string) => {
    onFilterChange({
      reportingTo: reportingTo === 'ALL' ? undefined : reportingTo,
      page: 1
    });
  };

  const handleHodChange = (hod: string) => {
    onFilterChange({
      hod: hod === 'ALL' ? undefined : hod,
      page: 1
    });
  };

  const handleSeatingStatusChange = (status: 'ALL' | 'ASSIGNED' | 'UNASSIGNED') => {
    onFilterChange({
      seatingStatus: status,
      page: 1
    });
  };

  const handleActiveStatusChange = (active: 'ALL' | 'ACTIVE' | 'INACTIVE') => {
    onFilterChange({
      activeStatus: active,
      page: 1
    });
  };

  const handleSortByChange = (sortBy: EmployeeSortField) => {
    onFilterChange({
      sortBy,
      page: 1
    });
  };

  const toggleSortOrder = () => {
    onFilterChange({
      sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    });
  };

  // Remove individual active filter chip
  const handleRemoveChip = (key: keyof EmployeeFiltersState) => {
    if (key === 'unitId') {
      handleUnitChange('ALL');
    } else if (key === 'buildingId') {
      handleBuildingChange('ALL');
    } else if (key === 'floorId') {
      handleFloorChange('ALL');
    } else if (key === 'departmentId') {
      handleDepartmentChange('ALL');
    } else if (key === 'sectionId') {
      handleSectionChange('ALL');
    } else if (key === 'search') {
      handleClearSearch();
    } else if (key === 'seatingStatus') {
      onFilterChange({ seatingStatus: 'ALL', page: 1 });
    } else if (key === 'activeStatus') {
      onFilterChange({ activeStatus: 'ALL', page: 1 });
    } else {
      onFilterChange({ [key]: undefined, page: 1 });
    }
  };


  const distinctAreas = [
    ...(options?.areaOptions || []).map(a => ({ id: a.id, name: a.name, displayName: a.displayName || a.name })),
    ...(options?.officeAreas || [])
      .filter(name => !(options?.areaOptions || []).some(a => a.name.toLowerCase() === name.toLowerCase()))
      .map(name => ({ id: name, name, displayName: name }))
  ].sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));

  // Compile Active Chips
  const activeChips: Array<{ key: keyof EmployeeFiltersState; label: string; value: string; removable: boolean }> = [];

  if (filters.unitId && filters.unitId !== 'ALL') {
    activeChips.push({
      key: 'unitId',
      label: 'Unit',
      value: resolveFilterDisplayLabel(filters.unitId, options?.units || [], loadingOptions),
      removable: !isRestrictedUnit
    });
  }

  if (filters.buildingId && filters.buildingId !== 'ALL') {
    activeChips.push({
      key: 'buildingId',
      label: 'Building',
      value: resolveFilterDisplayLabel(filters.buildingId, options?.buildings || [], loadingOptions),
      removable: true
    });
  }

  if (filters.floorId && filters.floorId !== 'ALL') {
    activeChips.push({
      key: 'floorId',
      label: 'Floor',
      value: resolveFilterDisplayLabel(filters.floorId, options?.floors || [], loadingOptions),
      removable: true
    });
  }

  if (filters.officeArea && filters.officeArea !== 'ALL') {
    activeChips.push({
      key: 'officeArea',
      label: 'Area',
      value: resolveFilterDisplayLabel(filters.officeArea, distinctAreas, loadingOptions, filters.officeArea),
      removable: true
    });
  }

  if (filters.departmentId && filters.departmentId !== 'ALL') {
    activeChips.push({
      key: 'departmentId',
      label: 'Dept',
      value: resolveFilterDisplayLabel(filters.departmentId, options?.departments || [], loadingOptions),
      removable: true
    });
  }

  if (filters.sectionId && filters.sectionId !== 'ALL') {
    activeChips.push({
      key: 'sectionId',
      label: 'Section',
      value: resolveFilterDisplayLabel(filters.sectionId, options?.sectionOptions || [], loadingOptions, filters.sectionId),
      removable: true
    });
  }

  if (filters.functionId && filters.functionId !== 'ALL') {
    activeChips.push({
      key: 'functionId',
      label: 'Function',
      value: resolveFilterDisplayLabel(filters.functionId, options?.functionOptions || [], loadingOptions, filters.functionId),
      removable: true
    });
  }

  if (filters.reportingTo && filters.reportingTo !== 'ALL') {
    activeChips.push({
      key: 'reportingTo',
      label: 'Reporting',
      value: filters.reportingTo,
      removable: true
    });
  }

  if (filters.hod && filters.hod !== 'ALL') {
    activeChips.push({
      key: 'hod',
      label: 'HOD',
      value: filters.hod,
      removable: true
    });
  }

  if (filters.seatingStatus && filters.seatingStatus !== 'ALL') {
    activeChips.push({
      key: 'seatingStatus',
      label: 'Seating',
      value: filters.seatingStatus === 'ASSIGNED' ? 'Seated Only' : 'Unseated Only',
      removable: true
    });
  }

  if (filters.activeStatus && filters.activeStatus !== 'ALL') {
    activeChips.push({
      key: 'activeStatus',
      label: 'Active',
      value: filters.activeStatus === 'ACTIVE' ? 'Active Only' : 'Inactive Only',
      removable: true
    });
  }

  if (filters.search) {
    activeChips.push({
      key: 'search',
      label: 'Search',
      value: `"${filters.search}"`,
      removable: true
    });
  }


  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-glass p-4 space-y-3.5" data-testid="employee-filters-panel">
      {/* ========================================================================= */}
      {/* ROW 1: LOCATION HIERARCHY (Unit -> Building -> Floor -> Office / Area)     */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* 1. Unit Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Unit (Facility)</span>
            {isRestrictedUnit && (
              <span className="inline-flex items-center text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200 font-normal ml-auto">
                <Lock className="w-2.5 h-2.5 mr-0.5" /> Locked
              </span>
            )}
          </label>
          <div className="relative">
            <select
              id="employeeUnitSelect"
              data-testid="employee-unit-select"
              value={filters.unitId || (isRestrictedUnit && lockedUnitId ? lockedUnitId : 'ALL')}
              onChange={(e) => handleUnitChange(e.target.value)}
              disabled={isRestrictedUnit || loadingOptions}
              className={`w-full h-9 pl-3 pr-8 text-xs rounded-lg border font-medium transition-all ${
                isRestrictedUnit
                  ? 'bg-slate-50 text-slate-700 border-slate-200 cursor-not-allowed opacity-90'
                  : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer'
              }`}
            >
              {!isRestrictedUnit && <option value="ALL">All Units (Campus 1–5)</option>}
              {options?.units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.location ? `— ${u.location}` : u.code ? `(${u.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 2. Building Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Layers className="w-3.5 h-3.5 text-emerald-600" />
            <span>Building</span>
          </label>
          <div className="relative">
            <select
              id="employeeBuildingSelect"
              data-testid="employee-building-select"
              value={filters.buildingId || 'ALL'}
              onChange={(e) => handleBuildingChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Buildings</option>
              {options?.buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3. Floor Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <MapPin className="w-3.5 h-3.5 text-amber-600" />
            <span>Floor</span>
          </label>
          <div className="relative">
            <select
              id="employeeFloorSelect"
              data-testid="employee-floor-select"
              value={filters.floorId || 'ALL'}
              onChange={(e) => handleFloorChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Floors</option>
              {options?.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.displayName || f.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 4. Office / Area Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-purple-600" />
            <span>Office / Area</span>
          </label>
          <div className="relative">
            <select
              id="employeeOfficeAreaSelect"
              data-testid="employee-area-select"
              value={filters.officeArea || 'ALL'}
              onChange={(e) => handleAreaChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Office Areas</option>
              {distinctAreas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.displayName || area.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: ORGANIZATIONAL & SUPERVISOR FILTERS (Dept -> Section -> Function -> Reporting) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* 5. Department Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
            <span>Department</span>
          </label>
          <div className="relative">
            <select
              id="employeeDepartmentSelect"
              data-testid="employee-dept-select"
              value={filters.departmentId || 'ALL'}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {options?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} {d.code ? `(${d.code})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 6. Section Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-cyan-600" />
            <span>Section</span>
          </label>
          <div className="relative">
            <select
              id="employeeSectionSelect"
              data-testid="employee-section-select"
              value={filters.sectionId || 'ALL'}
              onChange={(e) => handleSectionChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Sections</option>
              {options?.sectionOptions && options.sectionOptions.length > 0 ? (
                options.sectionOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.displayName || s.name}
                  </option>
                ))
              ) : (
                options?.sections.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* 7. Function Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Filter className="w-3.5 h-3.5 text-teal-600" />
            <span>Function</span>
          </label>
          <div className="relative">
            <select
              id="employeeFunctionSelect"
              data-testid="employee-function-select"
              value={filters.functionId || 'ALL'}
              onChange={(e) => handleFunctionChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Functions</option>
              {options?.functionOptions && options.functionOptions.length > 0 ? (
                options.functionOptions.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.displayName || f.name}
                  </option>
                ))
              ) : (
                options?.functions.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* 8. Reporting To (Supervisor) Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Users className="w-3.5 h-3.5 text-sky-600" />
            <span>Reporting To</span>
          </label>
          <div className="relative">
            <select
              id="employeeReportingToSelect"
              data-testid="employee-reporting-select"
              value={filters.reportingTo || 'ALL'}
              onChange={(e) => handleReportingToChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Supervisors ({options?.reportingToList?.length || 0})</option>
              {options?.reportingToList.map((rep) => (
                <option key={rep} value={rep}>
                  {rep}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: LEADERSHIP, SEATING, ACTIVE STATUS & SORTING                        */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
        {/* 9. Department Head (HOD) Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5 text-violet-600" />
            <span>Department Head (HOD)</span>
          </label>
          <div className="relative">
            <select
              id="employeeHodSelect"
              data-testid="employee-hod-select"
              value={filters.hod || 'ALL'}
              onChange={(e) => handleHodChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All HODs ({options?.hods?.length || 0})</option>
              {options?.hods.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 10. Seating Status Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <Armchair className="w-3.5 h-3.5 text-rose-600" />
            <span>Seating Status</span>
          </label>
          <div className="relative">
            <select
              id="employeeSeatingStatusSelect"
              data-testid="employee-seating-select"
              value={filters.seatingStatus}
              onChange={(e) => handleSeatingStatusChange(e.target.value as any)}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer font-mono"
            >
              <option value="ALL">All (Seated & Unseated)</option>
              <option value="ASSIGNED">🔵 Seated Only</option>
              <option value="UNASSIGNED">⚪ Unseated Only</option>
            </select>
          </div>
        </div>

        {/* 11. Active Status Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Active Status</span>
          </label>
          <div className="relative">
            <select
              id="employeeActiveStatusSelect"
              data-testid="employee-active-select"
              value={filters.activeStatus}
              onChange={(e) => handleActiveStatusChange(e.target.value as any)}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer font-mono"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">🟢 Active Only</option>
              <option value="INACTIVE">🔴 Inactive Only</option>
            </select>
          </div>
        </div>

        {/* 12. Sort By & Direction */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-600" />
            <span>Sort Order</span>
          </label>
          <div className="flex items-center space-x-1.5">
            <select
              id="employeeSortSelect"
              data-testid="employee-sort-select"
              value={filters.sortBy}
              onChange={(e) => handleSortByChange(e.target.value as EmployeeSortField)}
              className="flex-1 h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="employeeName">Employee name</option>
              <option value="employeeCode">Employee ID</option>
              <option value="active">Active status</option>
            </select>
            <button
              type="button"
              onClick={toggleSortOrder}
              aria-label={`Sort ${filters.sortOrder === 'asc' ? 'descending' : 'ascending'}`}
              className="h-9 px-3 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 font-bold text-sm transition-colors cursor-pointer"
              title={filters.sortOrder === 'asc' ? 'Ascending (A to Z) — Click for Descending' : 'Descending (Z to A) — Click for Ascending'}
            >
              {filters.sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 4: SEARCH, DISPLAY METRICS & VIEW ACTIONS                             */}
      {/* ========================================================================= */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pt-2 border-t border-slate-100">
        {/* Universal Search Box */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="employeeSearchInput"
            data-testid="employee-search-input"
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="Search by code, name, section, function, PC, desk..."
            className="w-full h-9 pl-9 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
          {searchInput && (
            <button
              type="button"
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right side controls: Count, View Mode, Page Size, Reset */}
        <div className="flex flex-wrap items-center justify-between lg:justify-end gap-2.5">
          <span className="text-xs text-slate-500 font-medium">
            Showing page <strong className="text-slate-800 font-mono font-semibold">{page}</strong> of {totalPages} · <strong className="text-slate-800 font-mono font-semibold">{loadedCount}</strong> loaded / {totalCount} total
          </span>

          {/* Cards / Table toggle */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 shadow-2xs">
            <button
              type="button"
              onClick={() => onViewModeChange('cards')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'cards'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange('table')}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
              title="Table View"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Table</span>
            </button>
          </div>

          {/* Page size selector */}
          <div className="flex items-center space-x-1">
            <span className="text-[11px] text-slate-400 font-semibold uppercase">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="h-8 pl-2 pr-6 text-xs bg-white border border-slate-200 rounded-md font-medium text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>

          {/* Reset All Filters Button */}
          <button
            type="button"
            onClick={onResetAll}
            className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center space-x-1.5 transition-all cursor-pointer"
            title="Reset all filters to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ACTIVE FILTER CHIPS                                                       */}
      {/* ========================================================================= */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 pt-2 pb-0.5 text-xs border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Active Filters:
          </span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className={`inline-flex items-center px-2.5 py-1 rounded-md border font-medium text-xs transition-colors ${
                chip.removable
                  ? 'bg-slate-100 text-slate-800 border-slate-200 hover:border-slate-300'
                  : 'bg-amber-50 text-amber-900 border-amber-200'
              }`}
            >
              <span className="text-slate-500 font-normal mr-1">{chip.label}:</span>
              <span className="font-semibold mr-1">{chip.value}</span>
              {chip.removable && (
                <button
                  type="button"
                  onClick={() => handleRemoveChip(chip.key)}
                  className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition-colors ml-0.5 cursor-pointer"
                  title={`Remove ${chip.label} filter`}
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}

          {activeChips.some((c) => c.removable) && (
            <button
              type="button"
              onClick={onResetAll}
              className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear All</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
