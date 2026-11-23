// apps/frontend/src/components/workstations/ActiveFilterChips.tsx
import React from 'react';
import { X, RotateCcw } from 'lucide-react';
import { WorkstationFilterOptionsResponse } from '@seating/shared';
import { resolveFilterDisplayLabel } from '../../utils/filterDisplayLabel';

export interface ActiveFilters {
  unitId?: string;
  buildingId?: string;
  floorId?: string;
  officeArea?: string;
  departmentId?: string;
  section?: string;
  functionName?: string;
  status?: string;
  search?: string;
  wsNo?: string;
  empCode?: string;
  employeeName?: string;
  reportingTo?: string;
  hod?: string;
}

interface Props {
  filters: ActiveFilters;
  options: WorkstationFilterOptionsResponse | null;
  onRemove: (key: keyof ActiveFilters) => void;
  onClearAll: () => void;
  isRestrictedUnit?: boolean;
}

export const ActiveFilterChips: React.FC<Props> = ({
  filters,
  options,
  onRemove,
  onClearAll,
  isRestrictedUnit
}) => {
  const chips: Array<{ key: keyof ActiveFilters; label: string; value: string; removable: boolean }> = [];

  // Unit Chip
  if (filters.unitId && filters.unitId !== 'ALL') {
    chips.push({
      key: 'unitId',
      label: 'Unit',
      value: resolveFilterDisplayLabel(filters.unitId, options?.units || [], !options),
      removable: !isRestrictedUnit
    });
  }

  // Building Chip
  if (filters.buildingId && filters.buildingId !== 'ALL') {
    chips.push({
      key: 'buildingId',
      label: 'Building',
      value: resolveFilterDisplayLabel(filters.buildingId, options?.buildings || [], !options),
      removable: true
    });
  }

  // Floor Chip
  if (filters.floorId && filters.floorId !== 'ALL') {
    chips.push({
      key: 'floorId',
      label: 'Floor',
      value: resolveFilterDisplayLabel(filters.floorId, options?.floors || [], !options),
      removable: true
    });
  }

  // Office / Area Chip
  if (filters.officeArea && filters.officeArea !== 'ALL') {
    chips.push({
      key: 'officeArea',
      label: 'Area',
      value: resolveFilterDisplayLabel(filters.officeArea, [], !options, filters.officeArea),
      removable: true
    });
  }

  // Department Chip
  if (filters.departmentId && filters.departmentId !== 'ALL') {
    chips.push({
      key: 'departmentId',
      label: 'Dept',
      value: resolveFilterDisplayLabel(filters.departmentId, options?.departments || [], !options),
      removable: true
    });
  }

  // Section Chip
  if (filters.section && filters.section !== 'ALL') {
    chips.push({
      key: 'section',
      label: 'Section',
      value: resolveFilterDisplayLabel(filters.section, [], !options, filters.section),
      removable: true
    });
  }

  // Function Chip
  if (filters.functionName && filters.functionName !== 'ALL') {
    chips.push({
      key: 'functionName',
      label: 'Function',
      value: resolveFilterDisplayLabel(filters.functionName, [], !options, filters.functionName),
      removable: true
    });
  }

  // Status Chip
  if (filters.status && filters.status !== 'ALL') {
    const stObj = options?.statuses.find((s) => s.value === filters.status);
    chips.push({
      key: 'status',
      label: 'Status',
      value: stObj?.label || filters.status,
      removable: true
    });
  }

  // Direct Search Chips
  if (filters.search) {
    chips.push({
      key: 'search',
      label: 'Search',
      value: `"${filters.search}"`,
      removable: true
    });
  }

  if (filters.wsNo) {
    chips.push({
      key: 'wsNo',
      label: 'WS NO',
      value: filters.wsNo,
      removable: true
    });
  }

  if (filters.empCode) {
    chips.push({
      key: 'empCode',
      label: 'Emp Code',
      value: filters.empCode,
      removable: true
    });
  }

  if (filters.employeeName) {
    chips.push({
      key: 'employeeName',
      label: 'Name',
      value: filters.employeeName,
      removable: true
    });
  }

  if (filters.reportingTo) {
    chips.push({
      key: 'reportingTo',
      label: 'Reporting To',
      value: filters.reportingTo,
      removable: true
    });
  }

  if (filters.hod) {
    chips.push({
      key: 'hod',
      label: 'HOD',
      value: filters.hod,
      removable: true
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2 pt-2 pb-1 text-xs">
      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
        Active Filters:
      </span>
      {chips.map((chip) => (
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
              onClick={() => onRemove(chip.key)}
              className="text-slate-400 hover:text-slate-700 p-0.5 rounded-full hover:bg-slate-200 transition-colors ml-0.5 cursor-pointer"
              title={`Remove ${chip.label} filter`}
              aria-label={`Remove filter ${chip.label}`}
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </span>
      ))}

      {chips.some((c) => c.removable) && (
        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-md transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Clear All</span>
        </button>
      )}
    </div>
  );
};
