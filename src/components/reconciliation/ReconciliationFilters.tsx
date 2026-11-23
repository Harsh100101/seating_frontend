import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { ReconciliationFiltersQuery } from '../../api/reconciliation';

interface FiltersProps {
  filters: ReconciliationFiltersQuery;
  onFilterChange: (newFilters: Partial<ReconciliationFiltersQuery>) => void;
  onReset: () => void;
  units?: string[];
  departments?: string[];
  totalResults?: number;
  loading?: boolean;
}

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'All Statuses' },
  { value: 'OPEN', label: 'Open' },
  { value: 'NEEDS_REVIEW', label: 'Needs Review' },
  { value: 'EXCEL_STALE', label: 'Excel Stale' },
  { value: 'SYSTEM_CORRECTION_REQUIRED', label: 'System Correction Required' },
  { value: 'FORMATTING_ONLY', label: 'Formatting-Only' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'BLOCKED', label: 'Blocked' },
  { value: 'REOPENED', label: 'Reopened' },
];

const CLASSIFICATION_OPTIONS = [
  { value: 'ALL', label: 'All Classifications' },
  { value: 'EXPECTED_LIVE_CHANGE', label: 'Expected Live Change' },
  { value: 'EXCEL_STALE', label: 'Excel Stale' },
  { value: 'SYSTEM_WRONG', label: 'System Wrong' },
  { value: 'FORMATTING_ONLY', label: 'Formatting-Only' },
  { value: 'DUPLICATE_EXCEL_CONFLICT', label: 'Duplicate Excel Conflict' },
  { value: 'UNKNOWN', label: 'Unknown' },
];

const MISMATCH_FIELD_OPTIONS = [
  { value: 'ALL', label: 'All Mismatch Fields' },
  { value: 'unit', label: 'Unit' },
  { value: 'building', label: 'Building' },
  { value: 'floor', label: 'Floor' },
  { value: 'office', label: 'Office / Area' },
  { value: 'department', label: 'Department' },
  { value: 'section', label: 'Section' },
  { value: 'function', label: 'Function' },
  { value: 'workstation', label: 'Workstation' },
  { value: 'designation', label: 'Designation' },
  { value: 'status', label: 'Active Status' },
];

export const ReconciliationFilters: React.FC<FiltersProps> = ({
  filters,
  onFilterChange,
  onReset,
  units = ['Unit 1', 'Unit 2', 'Unit 3', 'Unit 4', 'Unit 5'],
  departments = [],
  totalResults,
  loading = false,
}) => {
  const hasActiveFilters = Boolean(
    (filters.status && filters.status !== 'ALL') ||
    (filters.classification && filters.classification !== 'ALL') ||
    (filters.unit && filters.unit !== 'ALL') ||
    (filters.department && filters.department !== 'ALL') ||
    (filters.mismatchField && filters.mismatchField !== 'ALL') ||
    (filters.search && filters.search.trim().length > 0)
  );

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-3 sm:p-4 shadow-2xs space-y-3">
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.search || ''}
            onChange={(e) => onFilterChange({ search: e.target.value, page: 1 })}
            placeholder="Search by Employee ID or Name…"
            aria-label="Search employees"
            data-testid="search-input"
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-300 bg-white placeholder-slate-400 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Counter and Reset */}
        <div className="flex items-center gap-2 justify-between sm:justify-end text-xs">
          {typeof totalResults === 'number' && (
            <span className="text-slate-500 font-medium" data-testid="results-counter">
              {loading ? 'Updating…' : `${totalResults} ${totalResults === 1 ? 'case' : 'cases'} found`}
            </span>
          )}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors"
              title="Reset all filters"
              data-testid="reset-filters-btn"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filters</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Selects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 pt-2 border-t border-slate-100">
        {/* Status Filter */}
        <div>
          <label htmlFor="filter-status" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Status
          </label>
          <select
            id="filter-status"
            value={filters.status || 'ALL'}
            onChange={(e) => onFilterChange({ status: e.target.value, page: 1 })}
            data-testid="filter-status"
            className="w-full text-xs py-1.5 px-2 rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Classification Filter */}
        <div>
          <label htmlFor="filter-classification" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Classification
          </label>
          <select
            id="filter-classification"
            value={filters.classification || 'ALL'}
            onChange={(e) => onFilterChange({ classification: e.target.value, page: 1 })}
            data-testid="filter-classification"
            className="w-full text-xs py-1.5 px-2 rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {CLASSIFICATION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Unit Filter */}
        <div>
          <label htmlFor="filter-unit" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Unit
          </label>
          <select
            id="filter-unit"
            value={filters.unit || 'ALL'}
            onChange={(e) => onFilterChange({ unit: e.target.value, page: 1 })}
            data-testid="filter-unit"
            className="w-full text-xs py-1.5 px-2 rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Units</option>
            {units.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </div>

        {/* Department Filter */}
        <div>
          <label htmlFor="filter-department" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Department
          </label>
          <select
            id="filter-department"
            value={filters.department || 'ALL'}
            onChange={(e) => onFilterChange({ department: e.target.value, page: 1 })}
            data-testid="filter-department"
            className="w-full text-xs py-1.5 px-2 rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">All Departments</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Mismatch Field Filter */}
        <div>
          <label htmlFor="filter-mismatch-field" className="block text-[11px] font-semibold text-slate-600 mb-1">
            Mismatch Field
          </label>
          <select
            id="filter-mismatch-field"
            value={filters.mismatchField || 'ALL'}
            onChange={(e) => onFilterChange({ mismatchField: e.target.value, page: 1 })}
            data-testid="filter-mismatch-field"
            className="w-full text-xs py-1.5 px-2 rounded-md border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {MISMATCH_FIELD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};
