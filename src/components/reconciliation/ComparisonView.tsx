import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { FieldComparison, ComparisonFieldStatus } from '../../api/reconciliation';

interface ComparisonViewProps {
  employeeCode: string;
  employeeName: string;
  comparisons: FieldComparison[];
  mismatchCount?: number;
  allFieldsMatch?: boolean;
  caseStatus?: string;
  className?: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({
  employeeCode,
  employeeName,
  comparisons,
  mismatchCount,
  allFieldsMatch,
  caseStatus,
  className = '',
}) => {
  // Normalize comparisons: ensure all standard fields are mapped or displayed
  const getFieldStatusBadge = (status: ComparisonFieldStatus) => {
    switch (status) {
      case 'SAME':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
            data-testid="status-badge-same"
            title="Field matches between Excel and MongoDB"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
            <span>Match</span>
          </span>
        );
      case 'DIFFERENCE':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse-subtle"
            data-testid="status-badge-difference"
            title="Value discrepancy detected"
          >
            <AlertTriangle className="w-3 h-3 text-amber-600" aria-hidden="true" />
            <span>Difference</span>
          </span>
        );
      case 'RESOLVED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200"
            data-testid="status-badge-resolved"
            title="Discrepancy resolved"
          >
            <ShieldCheck className="w-3 h-3 text-blue-600" aria-hidden="true" />
            <span>Resolved</span>
          </span>
        );
      case 'BLOCKED':
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
            data-testid="status-badge-blocked"
            title="Correction blocked by constraint or duplicate"
          >
            <ShieldAlert className="w-3 h-3 text-rose-600" aria-hidden="true" />
            <span>Blocked</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  const diffCount = mismatchCount ?? comparisons.filter((c) => c.status === 'DIFFERENCE').length;
  const fieldsMatch = allFieldsMatch ?? diffCount === 0;

  return (
    <div
      className={`bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden ${className}`}
      data-testid="comparison-view"
    >
      {/* Header bar */}
      <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-sm bg-slate-200 text-slate-800">
            {employeeCode}
          </span>
          <h3 className="text-sm font-bold text-slate-900">{employeeName}</h3>
        </div>
        <div className="flex items-center gap-2">
          {!fieldsMatch ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              {diffCount} {diffCount === 1 ? 'Field Discrepancy' : 'Field Discrepancies'}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              All Fields Match
            </span>
          )}
          {caseStatus && (
            <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              Case: {caseStatus}
            </span>
          )}
        </div>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-slate-100/75 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
              <th scope="col" className="py-2.5 px-4 w-1/4">
                Field
              </th>
              <th scope="col" className="py-2.5 px-4 w-1/3">
                Excel (Authoritative)
              </th>
              <th scope="col" className="py-2.5 px-4 w-1/3">
                Current System (MongoDB)
              </th>
              <th scope="col" className="py-2.5 px-4 text-center">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {comparisons.map((row) => {
              const isDiff = row.status === 'DIFFERENCE';
              const isBlocked = row.status === 'BLOCKED';
              const rowBg = isDiff
                ? 'bg-amber-50/40 hover:bg-amber-50/70'
                : isBlocked
                ? 'bg-rose-50/40 hover:bg-rose-50/70'
                : 'hover:bg-slate-50/60';

              return (
                <tr
                  key={row.field}
                  className={`transition-colors ${rowBg}`}
                  data-testid={`comparison-row-${row.field.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                >
                  <td className="py-2.5 px-4 font-semibold text-slate-700">
                    <span className="block">{row.fieldLabel || row.field}</span>
                    {row.notes && (
                      <span className="block text-[10px] text-slate-400 font-normal mt-0.5">{row.notes}</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {row.excelValue ? (
                      <span className={`font-mono text-xs ${isDiff ? 'font-bold text-amber-900 bg-amber-100/60 px-1.5 py-0.5 rounded-sm' : ''}`}>
                        {row.excelValue}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">None / Blank</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-800">
                    {row.systemValue ? (
                      <span className={`font-mono text-xs ${isDiff ? 'font-bold text-slate-800' : ''}`}>
                        {row.systemValue}
                      </span>
                    ) : (
                      <span className="text-slate-400 italic">None / Unassigned</span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-center whitespace-nowrap">
                    {getFieldStatusBadge(row.status)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
