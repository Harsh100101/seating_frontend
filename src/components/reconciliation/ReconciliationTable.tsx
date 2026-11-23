import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Wrench,
  FileEdit,
  ShieldAlert,
  RotateCcw,
  Eye,
} from 'lucide-react';
import {
  ReconciliationCase,
  ReconciliationStatus,
  ReconciliationClassification,
} from '../../api/reconciliation';

interface TableProps {
  cases: ReconciliationCase[];
  selectedCaseId?: string | null;
  onSelectCase: (caseItem: ReconciliationCase) => void;
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (newPage: number) => void;
  loading?: boolean;
}

export function getStatusBadge(status: ReconciliationStatus) {
  switch (status) {
    case 'OPEN':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
          <AlertCircle className="w-3 h-3 text-rose-500" />
          Open
        </span>
      );
    case 'RESOLVED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
          Resolved
        </span>
      );
    case 'NEEDS_REVIEW':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
          <HelpCircle className="w-3 h-3 text-amber-500" />
          Needs Review
        </span>
      );
    case 'EXCEL_STALE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
          <Clock className="w-3 h-3 text-purple-500" />
          Excel Stale
        </span>
      );
    case 'SYSTEM_CORRECTION_REQUIRED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
          <Wrench className="w-3 h-3 text-orange-500" />
          System Correction
        </span>
      );
    case 'FORMATTING_ONLY':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <FileEdit className="w-3 h-3 text-indigo-500" />
          Formatting Only
        </span>
      );
    case 'BLOCKED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-300">
          <ShieldAlert className="w-3 h-3 text-red-600" />
          Blocked
        </span>
      );
    case 'REOPENED':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
          <RotateCcw className="w-3 h-3 text-cyan-600" />
          Reopened
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
          {status}
        </span>
      );
  }
}

export function getClassificationBadge(classification: ReconciliationClassification) {
  switch (classification) {
    case 'EXPECTED_LIVE_CHANGE':
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-blue-50 text-blue-700 border border-blue-200">
          Expected Live Change
        </span>
      );
    case 'EXCEL_STALE':
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-purple-50 text-purple-700 border border-purple-200">
          Excel Stale
        </span>
      );
    case 'SYSTEM_WRONG':
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-orange-50 text-orange-700 border border-orange-200">
          System Wrong
        </span>
      );
    case 'FORMATTING_ONLY':
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-indigo-50 text-indigo-700 border border-indigo-200">
          Formatting Only
        </span>
      );
    case 'DUPLICATE_EXCEL_CONFLICT':
      return (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-red-100 text-red-800 border border-red-300">
          Duplicate Conflict
        </span>
      );
    default:
      return (
        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-sm bg-slate-100 text-slate-600">
          {classification || 'Unknown'}
        </span>
      );
  }
}

export const ReconciliationTable: React.FC<TableProps> = ({
  cases,
  selectedCaseId,
  onSelectCase,
  page,
  totalPages,
  total,
  onPageChange,
  loading = false,
}) => {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <th scope="col" className="py-2.5 px-3">
                Employee
              </th>
              <th scope="col" className="py-2.5 px-3">
                Status
              </th>
              <th scope="col" className="py-2.5 px-3">
                Classification
              </th>
              <th scope="col" className="py-2.5 px-3">
                Unit / Dept
              </th>
              <th scope="col" className="py-2.5 px-3 text-center">
                Mismatches
              </th>
              <th scope="col" className="py-2.5 px-3 text-center">
                Signals
              </th>
              <th scope="col" className="py-2.5 px-3 text-right">
                Action
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && cases.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                  Loading reconciliation cases…
                </td>
              </tr>
            ) : cases.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                  No reconciliation cases match the selected filters.
                </td>
              </tr>
            ) : (
              cases.map((item) => {
                const isSelected = selectedCaseId === item.id;
                const hasDuplicate = Boolean(item.evidence?.duplicateConflict?.isDuplicate);
                const hasTransfer = Boolean(item.evidence?.hasApprovedExplainingTransfer);

                return (
                  <tr
                    key={item.id}
                    onClick={() => onSelectCase(item)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-50/70 border-l-4 border-l-blue-600'
                        : 'hover:bg-slate-50/70'
                    }`}
                    data-testid={`case-row-${item.employeeCode}`}
                  >
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-900">{item.employeeName}</div>
                      <div className="font-mono text-[11px] text-slate-500">{item.employeeCode}</div>
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">{getStatusBadge(item.status)}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getClassificationBadge(item.classification)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      <div>{item.unitName || '—'}</div>
                      <div className="text-[11px] text-slate-500">{item.departmentName || '—'}</div>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block font-mono font-bold px-2 py-0.5 rounded-full text-xs ${
                          item.mismatchCount > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {item.mismatchCount}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        {hasTransfer && (
                          <span
                            className="p-1 rounded-sm bg-indigo-100 text-indigo-700"
                            title="Approved transfer explains discrepancy"
                            data-testid="signal-transfer"
                          >
                            <GitPullRequest className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {hasDuplicate && (
                          <span
                            className="p-1 rounded-sm bg-red-100 text-red-700"
                            title="Duplicate Excel row conflict"
                            data-testid="signal-duplicate"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectCase(item);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-md transition-colors ${
                          isSelected
                            ? 'bg-blue-600 text-white font-semibold'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                        data-testid={`inspect-case-btn-${item.employeeCode}`}
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
        <div>
          Showing page <span className="font-bold text-slate-800">{page}</span> of{' '}
          <span className="font-bold text-slate-800">{Math.max(1, totalPages)}</span> ({total} cases)
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => onPageChange(page - 1)}
            className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="prev-page-btn"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => onPageChange(page + 1)}
            className="p-1.5 rounded-md border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
            data-testid="next-page-btn"
            aria-label="Next page"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
