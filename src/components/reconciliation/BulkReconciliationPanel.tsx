import React from 'react';
import { AlertTriangle, CheckCircle2, Eye, FileSpreadsheet, Lock, PlayCircle, RefreshCw } from 'lucide-react';
import { BulkReconciliationPlan } from '../../api/reconciliation';

interface BulkReconciliationPanelProps {
  plan: BulkReconciliationPlan | null;
  isSuperAdmin: boolean;
  loading: boolean;
  applying: boolean;
  error: string | null;
  onGenerate: () => void;
  onApply: () => void;
}

const count = (plan: BulkReconciliationPlan | null, key: string) => plan?.counts[key as keyof typeof plan.counts] ?? 0;

export const BulkReconciliationPanel: React.FC<BulkReconciliationPanelProps> = ({
  plan,
  isSuperAdmin,
  loading,
  applying,
  error,
  onGenerate,
  onApply,
}) => {
  const safeCount = count(plan, 'SAFE_FIELD_UPDATE') + count(plan, 'SAFE_SEAT_ASSIGNMENT') + count(plan, 'SAFE_SEAT_MOVE');
  const safeItems = plan?.items.filter((item) => item.status.startsWith('SAFE_')) || [];

  return (
    <section className="rounded-lg border border-blue-200 bg-blue-50/40 p-4 space-y-3" data-testid="bulk-reconciliation-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-blue-700" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-blue-950">Safe Bulk Reconciliation</h2>
            {!isSuperAdmin && <Lock className="w-3.5 h-3.5 text-amber-700" aria-label="Apply restricted to Super Admin" />}
          </div>
          <p className="mt-1 text-xs text-blue-900">
            Generate a read-only plan from the authoritative workbook. Blocked records are never changed.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerate}
          disabled={loading || applying}
          className="inline-flex items-center gap-1.5 rounded-md border border-blue-300 bg-white px-3 py-1.5 text-xs font-semibold text-blue-800 hover:bg-blue-100 disabled:opacity-50"
          data-testid="generate-reconciliation-plan"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Generating…' : 'Generate Reconciliation Plan'}
        </button>
      </div>

      {error && <p className="rounded border border-rose-200 bg-rose-50 px-2 py-1.5 text-xs text-rose-800">{error}</p>}

      {plan && (
        <>
          <div className="rounded border border-blue-200 bg-white px-3 py-2 text-[11px] text-slate-600">
            Source: <span className="font-semibold text-slate-800">{plan.sourceFilename}</span>
            <span className="mx-2">·</span>
            SHA-256: <span className="font-mono text-slate-800">{plan.sourceHash}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" data-testid="bulk-plan-summary">
            {[
              ['No change', 'NO_CHANGE'],
              ['Formatting-only', 'FORMATTING_ONLY'],
              ['Safe field updates', 'SAFE_FIELD_UPDATE'],
              ['Safe seat assignments', 'SAFE_SEAT_ASSIGNMENT'],
              ['Safe seat moves', 'SAFE_SEAT_MOVE'],
              ['Blocked duplicates', 'BLOCKED_DUPLICATE_EXCEL'],
              ['Occupied targets', 'BLOCKED_OCCUPIED_TARGET_SEAT'],
              ['Invalid hierarchy', 'BLOCKED_INVALID_HIERARCHY'],
            ].map(([label, key]) => (
              <div key={key} className="rounded border border-slate-200 bg-white px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-slate-500">{label}</div>
                <div className="font-mono text-lg font-bold text-slate-800">{count(plan, key)}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-700">
              <Eye className="w-3.5 h-3.5 text-blue-700" />
              Preview contains <strong>{safeCount}</strong> proposed safe changes; no data was written.
            </div>
            {isSuperAdmin ? (
              <button
                type="button"
                onClick={() => {
                  const confirmed = window.confirm(
                    `This operation will update ${safeCount} employees and workstation assignments to match ${plan.sourceFilename}. Blocked records will NOT be changed. Apply authoritative sheet?`
                  );
                  if (confirmed) onApply();
                }}
                disabled={applying || safeCount === 0}
                className="inline-flex items-center gap-1.5 rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-semibold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
                data-testid="apply-authoritative-sheet"
              >
                <PlayCircle className="w-3.5 h-3.5" />
                {applying ? 'Applying…' : 'Apply Authoritative Sheet'}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-amber-800">
                <Lock className="w-3.5 h-3.5" /> Apply is Super Admin only
              </span>
            )}
          </div>

          {safeItems.length > 0 && (
            <details className="rounded border border-blue-200 bg-white px-3 py-2 text-xs" data-testid="bulk-safe-preview">
              <summary className="cursor-pointer font-semibold text-blue-900">Preview Safe Changes ({safeItems.length})</summary>
              <div className="mt-2 max-h-48 overflow-auto divide-y divide-slate-100">
                {safeItems.slice(0, 100).map((item) => (
                  <div key={`${item.employeeCode}-${item.excelRowNumbers.join('-')}`} className="flex flex-wrap justify-between gap-2 py-1.5">
                    <span className="font-mono text-slate-800">{item.employeeCode}</span>
                    <span className="text-slate-600">{item.status.replaceAll('_', ' ')}</span>
                    <span className="text-slate-500">{item.currentSeatLabel || 'Unassigned'} → {item.proposedSeatLabel || 'No authoritative seat'}</span>
                  </div>
                ))}
              </div>
              {safeItems.length > 100 && <div className="pt-2 text-[11px] text-slate-500">Showing first 100 safe changes.</div>}
            </details>
          )}

          {count(plan, 'BLOCKED_DUPLICATE_EXCEL') + count(plan, 'BLOCKED_DUPLICATE_WORKSTATION') + count(plan, 'BLOCKED_OCCUPIED_TARGET_SEAT') + count(plan, 'BLOCKED_INVALID_HIERARCHY') > 0 && (
            <div className="flex items-start gap-2 rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Blocked or ambiguous records require manual Super Admin review and are excluded from apply.</span>
            </div>
          )}
          {safeCount === 0 && <div className="flex items-center gap-2 text-xs font-semibold text-emerald-800"><CheckCircle2 className="w-3.5 h-3.5" />No safe changes proposed.</div>}
        </>
      )}
    </section>
  );
};
