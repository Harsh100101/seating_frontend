// apps/frontend/src/components/workstations/WorkstationFilters.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Filter,
  SlidersHorizontal,
  RotateCcw,
  Building2,
  Layers,
  MapPin,
  Briefcase,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Lock
} from 'lucide-react';
import {
  WorkstationFilterOptionsResponse,
  WorkstationQueryParams
} from '@seating/shared';
import { ActiveFilterChips } from './ActiveFilterChips';

interface Props {
  filters: WorkstationQueryParams;
  options: WorkstationFilterOptionsResponse | null;
  loadingOptions: boolean;
  onFilterChange: (newFilters: Partial<WorkstationQueryParams>, shouldResetChildren?: boolean) => void;
  onResetAll: () => void;
}

export const WorkstationFilters: React.FC<Props> = ({
  filters,
  options,
  loadingOptions,
  onFilterChange,
  onResetAll
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onFilterChangeRef = useRef(onFilterChange);

  useEffect(() => {
    onFilterChangeRef.current = onFilterChange;
  }, [onFilterChange]);

  useEffect(() => () => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  // Keep local search input in sync if filters.search changes externally (e.g. chip removal)
  useEffect(() => {
    setSearchInput(filters.search || '');
  }, [filters.search]);

  const handleSearchInputChange = (value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);

    const nextSearch = value.trim();
    const currentSearch = (filters.search || '').trim();
    if (nextSearch === currentSearch) return;

    searchTimerRef.current = setTimeout(() => {
      onFilterChangeRef.current({ search: nextSearch });
      searchTimerRef.current = null;
    }, 350);
  };

  const isRestrictedUnit = Boolean(options?.userScope?.isRestricted);
  const lockedUnitId = options?.userScope?.lockedUnitId;

  // Filter change handlers with parent-child cascade reset rules
  const handleUnitChange = (unitId: string) => {
    if (isRestrictedUnit) return; // Prevent changing if locked
    onFilterChange({
      unitId: unitId === 'ALL' ? undefined : unitId,
      buildingId: undefined,
      floorId: undefined,
      officeArea: undefined,
      departmentId: undefined,
      section: undefined,
      functionName: undefined
    });
  };

  const handleBuildingChange = (buildingId: string) => {
    onFilterChange({
      buildingId: buildingId === 'ALL' ? undefined : buildingId,
      floorId: undefined,
      officeArea: undefined,
    });
  };

  const handleFloorChange = (floorId: string) => {
    onFilterChange({
      floorId: floorId === 'ALL' ? undefined : floorId,
      officeArea: undefined,
    });
  };

  const handleDepartmentChange = (departmentId: string) => {
    onFilterChange({
      departmentId: departmentId === 'ALL' ? undefined : departmentId,
      section: undefined,
      functionName: undefined
    });
  };

  const handleSectionChange = (section: string) => {
    onFilterChange({
      section: section === 'ALL' ? undefined : section,
      functionName: undefined
    });
  };

  // Remove individual active filter chip
  const handleRemoveChip = (key: keyof WorkstationQueryParams) => {
    if (key === 'unitId') {
      handleUnitChange('ALL');
    } else if (key === 'buildingId') {
      handleBuildingChange('ALL');
    } else if (key === 'floorId') {
      handleFloorChange('ALL');
    } else if (key === 'departmentId') {
      handleDepartmentChange('ALL');
    } else if (key === 'section') {
      handleSectionChange('ALL');
    } else if (key === 'search') {
      setSearchInput('');
      onFilterChange({ search: '' });
    } else {
      onFilterChange({ [key]: undefined });
    }
  };

  return (
    <div className="bg-white border border-slate-200/90 rounded-xl shadow-glass p-4 space-y-3.5">
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
              id="unitSelect"
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
                  {u.name} {u.location ? `— ${u.location}` : `(${u.code})`}
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
              id="buildingSelect"
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
              id="floorSelect"
              value={filters.floorId || 'ALL'}
              onChange={(e) => handleFloorChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Floors</option>
              {options?.floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
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
              id="officeAreaSelect"
              value={filters.officeArea || 'ALL'}
              onChange={(e) => onFilterChange({
                officeArea: e.target.value === 'ALL' ? undefined : e.target.value,
              })}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Office Areas</option>
              {options?.officeAreas.map((area) => (
                <option key={area} value={area}>
                  {area}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 2: ORGANIZATIONAL & STATUS FILTERS (Department -> Section -> Function) */}
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
              id="departmentSelect"
              value={filters.departmentId || 'ALL'}
              onChange={(e) => handleDepartmentChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Departments</option>
              {options?.departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
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
              id="sectionSelect"
              value={filters.section || 'ALL'}
              onChange={(e) => handleSectionChange(e.target.value)}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Sections</option>
              {options?.sections.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
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
              id="functionSelect"
              value={filters.functionName || 'ALL'}
              onChange={(e) => onFilterChange({ functionName: e.target.value === 'ALL' ? undefined : e.target.value })}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              <option value="ALL">All Functions</option>
              {options?.functions.map((fn) => (
                <option key={fn} value={fn}>
                  {fn}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 8. Workstation Status Selector */}
        <div className="space-y-1">
          <label className="flex items-center space-x-1.5 text-[11px] font-bold text-slate-700 uppercase tracking-wider">
            <UserCheck className="w-3.5 h-3.5 text-rose-600" />
            <span>Status</span>
          </label>
          <div className="relative">
            <select
              id="statusSelect"
              value={filters.status || 'ALL'}
              onChange={(e) => onFilterChange({ status: (e.target.value === 'ALL' ? undefined : e.target.value) as any })}
              disabled={loadingOptions}
              className="w-full h-9 pl-3 pr-8 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 font-medium hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 cursor-pointer"
            >
              {options?.statuses.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              )) || (
                <>
                  <option value="ALL">All Statuses</option>
                  <option value="OCCUPIED">Occupied</option>
                  <option value="AVAILABLE">Vacant / Available</option>
                  <option value="RESERVED">Reserved</option>
                  <option value="MAINTENANCE">Maintenance</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ROW 3: GLOBAL SEARCH & ADVANCED LOOKUP SEARCH FIELDS                       */}
      {/* ========================================================================= */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-slate-100">
        {/* Global Search Box (WS NO, Emp Code, Name, etc.) */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => handleSearchInputChange(e.target.value)}
            placeholder="Search WS NO, Employee Code, Name, Manager, HOD, PC Number..."
            className="w-full h-9 pl-9 pr-4 text-xs rounded-lg border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>

        {/* Advanced Search Toggle */}
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`h-9 px-3 text-xs font-semibold rounded-lg border flex items-center space-x-1.5 transition-all cursor-pointer ${
            showAdvanced || filters.wsNo || filters.empCode || filters.employeeName || filters.reportingTo || filters.hod
              ? 'bg-blue-50 text-blue-700 border-blue-200'
              : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Direct Fields</span>
          {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>

        {/* Reset All Filters Button */}
        <button
          type="button"
          onClick={onResetAll}
          className="h-9 px-3 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 flex items-center space-x-1.5 transition-all cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Reset</span>
        </button>
      </div>

      {/* Advanced Direct Search Sub-Panel */}
      {showAdvanced && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100 bg-slate-50/60 p-3 rounded-lg border">
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">WS NO</label>
            <input
              id="directWsNo"
              type="text"
              value={filters.wsNo || ''}
              onChange={(e) => onFilterChange({ wsNo: e.target.value.trim() || undefined })}
              placeholder="e.g. WS-01"
              className="w-full h-7.5 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Emp Code</label>
            <input
              id="directEmpCode"
              type="text"
              value={filters.empCode || ''}
              onChange={(e) => onFilterChange({ empCode: e.target.value || undefined })}
              placeholder="e.g. 23300"
              className="w-full h-7.5 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Employee Name</label>
            <input
              id="directEmployeeName"
              type="text"
              value={filters.employeeName || ''}
              onChange={(e) => onFilterChange({ employeeName: e.target.value || undefined })}
              placeholder="e.g. Khetiya"
              className="w-full h-7.5 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">Reporting To</label>
            <input
              id="directReportingTo"
              type="text"
              value={filters.reportingTo || ''}
              onChange={(e) => onFilterChange({ reportingTo: e.target.value || undefined })}
              placeholder="Manager name"
              className="w-full h-7.5 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-600 uppercase mb-0.5">HOD</label>
            <input
              id="directHod"
              type="text"
              value={filters.hod || ''}
              onChange={(e) => onFilterChange({ hod: e.target.value || undefined })}
              placeholder="HOD name"
              className="w-full h-7.5 px-2.5 text-xs bg-white border border-slate-200 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTIVE FILTER CHIPS                                                       */}
      {/* ========================================================================= */}
      <ActiveFilterChips
        filters={filters}
        options={options}
        onRemove={handleRemoveChip}
        onClearAll={onResetAll}
        isRestrictedUnit={isRestrictedUnit}
      />
    </div>
  );
};
