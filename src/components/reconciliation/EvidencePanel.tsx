import React from 'react';
import {
  User,
  Armchair,
  Layers,
  GitPullRequest,
  AlertTriangle,
  History,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';
import { EvidenceData } from '../../api/reconciliation';

interface EvidencePanelProps {
  evidence: EvidenceData;
  className?: string;
}

export const EvidencePanel: React.FC<EvidencePanelProps> = ({ evidence, className = '' }) => {
  const {
    currentRecord,
    currentSeat,
    hierarchy,
    transferHistory,
    hasApprovedExplainingTransfer,
    duplicateConflict,
    recentAuditLogs,
    excelRowInfo,
  } = evidence;

  return (
    <div className={`space-y-4 ${className}`} data-testid="evidence-panel">
      {/* 1. DUPLICATE EXCEL CONFLICT ALERT (High Priority Warning) */}
      {duplicateConflict?.isDuplicate && (
        <div
          className="rounded-lg border-2 border-red-300 bg-red-50/90 p-4 shadow-xs"
          role="alert"
          data-testid="duplicate-excel-warning"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">
                Duplicate Excel Row Conflict ({duplicateConflict.count} Occurrences)
              </h4>
              <p className="text-xs text-red-800">
                {duplicateConflict.warningMessage ||
                  'This employee ID appears multiple times in the authoritative Excel sheet with conflicting field values. Automatic correction is blocked until manually reconciled.'}
              </p>
              {duplicateConflict.occurrences && duplicateConflict.occurrences.length > 0 && (
                <div className="mt-2 text-[11px] bg-white/80 rounded-md border border-red-200 p-2 space-y-1 font-mono">
                  {duplicateConflict.occurrences.map((occ, idx) => (
                    <div key={idx} className="text-red-900 flex justify-between gap-2">
                      <span>
                        Row {occ.rowNumber} {occ.sheetName ? `(${occ.sheetName})` : ''}:
                      </span>
                      <span className="text-slate-600 truncate">{occ.details || 'Conflicting values'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. PROMINENT TRANSFER EXPLANATION HIGHLIGHT */}
      {hasApprovedExplainingTransfer && (
        <div
          className="rounded-lg border-2 border-indigo-300 bg-indigo-50/90 p-4 shadow-xs"
          role="region"
          aria-label="Transfer explanation"
          data-testid="transfer-explains-mismatch-banner"
        >
          <div className="flex items-start gap-3">
            <GitPullRequest className="w-5 h-5 text-indigo-700 mt-0.5 shrink-0" />
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-indigo-200 text-indigo-900">
                  <CheckCircle className="w-3 h-3 text-indigo-700" />
                  Transfer Explains Discrepancy
                </span>
                <span className="text-xs font-bold text-indigo-950">
                  Approved Official Transfer Recorded
                </span>
              </div>
              <p className="text-xs text-indigo-900">
                An approved seating transfer exists in the system that explains why the live MongoDB location differs from the older Excel snapshot.
              </p>
              {transferHistory
                .filter((t) => t.explainsMismatch)
                .map((t) => (
                  <div
                    key={t.id}
                    className="mt-2 rounded-md bg-white border border-indigo-200 p-2.5 text-xs text-slate-800 space-y-1"
                  >
                    <div className="flex justify-between font-semibold">
                      <span>Request: {t.requestNumber || t.id}</span>
                      <span className="text-emerald-700 font-mono text-[11px] uppercase">{t.status}</span>
                    </div>
                    <div className="text-[11px] text-slate-600 flex items-center gap-1">
                      <span>{t.fromLocation || 'Previous Location'}</span>
                      <span>&rarr;</span>
                      <span className="font-semibold text-slate-900">{t.toLocation || 'New Assigned Location'}</span>
                    </div>
                    {t.explanationNote && (
                      <p className="text-[11px] text-indigo-800 italic mt-1 bg-indigo-50/50 p-1 rounded-sm">
                        "{t.explanationNote}"
                      </p>
                    )}
                    {t.approvedAt && (
                      <span className="block text-[10px] text-slate-400">
                        Approved on: {new Date(t.approvedAt).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. TWO-COLUMN GRID: Current Record & Current Workstation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Current Employee Record */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
            <User className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Current Record (MongoDB)</h4>
          </div>
          {currentRecord ? (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Employee ID:</span>
                <span className="font-mono font-semibold text-slate-900">{currentRecord.employeeCode}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Full Name:</span>
                <span className="font-semibold text-slate-900">{currentRecord.fullName}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Email:</span>
                <span className="text-slate-800 truncate max-w-[180px]">{currentRecord.email || '—'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Designation:</span>
                <span className="text-slate-800">{currentRecord.designation || '—'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Status:</span>
                <span
                  className={`inline-block px-1.5 py-0.2 rounded-xs font-mono text-[10px] uppercase font-bold ${
                    currentRecord.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {currentRecord.status}
                </span>
              </div>
              {currentRecord.updatedAt && (
                <div className="flex justify-between py-0.5 text-[10px] text-slate-400">
                  <span>Last Updated:</span>
                  <span>{new Date(currentRecord.updatedAt).toLocaleString()}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-2">No active MongoDB record found.</div>
          )}
        </div>

        {/* Current Workstation / Seat */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
            <Armchair className="w-4 h-4 text-emerald-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Current Workstation</h4>
          </div>
          {currentSeat ? (
            <div className="space-y-1 text-xs">
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Desk Label:</span>
                <span className="font-mono font-bold text-slate-900 bg-emerald-50 px-1 rounded-sm border border-emerald-200">
                  {currentSeat.label}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Floor & Area:</span>
                <span className="text-slate-800">
                  {currentSeat.floorName || '—'}{currentSeat.roomOrArea ? ` (${currentSeat.roomOrArea})` : ''}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Building:</span>
                <span className="text-slate-800">{currentSeat.buildingName || '—'}</span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Seat Status:</span>
                <span className="font-mono text-[10px] uppercase font-bold text-slate-700">
                  {currentSeat.status}
                </span>
              </div>
              <div className="flex justify-between py-0.5">
                <span className="text-slate-500">Desk Type:</span>
                <span className="text-slate-600 text-[11px]">{currentSeat.type || 'STANDARD_DESK'}</span>
              </div>
            </div>
          ) : (
            <div className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-md border border-amber-200">
              No workstation assigned in live system.
            </div>
          )}
        </div>
      </div>

      {/* 4. HIERARCHY MAPPING */}
      <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
        <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
          <Layers className="w-4 h-4 text-purple-600" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Industrial & Org Hierarchy</h4>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2 rounded-md bg-slate-50 border border-slate-150">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Unit</span>
            <span className="font-semibold text-slate-800">{hierarchy.unitName || '—'}</span>
          </div>
          <div className="p-2 rounded-md bg-slate-50 border border-slate-150">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Building</span>
            <span className="font-semibold text-slate-800">{hierarchy.buildingName || '—'}</span>
          </div>
          <div className="p-2 rounded-md bg-slate-50 border border-slate-150">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Department</span>
            <span className="font-semibold text-slate-800">{hierarchy.departmentName || '—'}</span>
          </div>
          <div className="p-2 rounded-md bg-slate-50 border border-slate-150">
            <span className="block text-[10px] text-slate-400 uppercase font-semibold">Section / Function</span>
            <span className="font-semibold text-slate-800">
              {hierarchy.sectionName || hierarchy.functionName || '—'}
            </span>
          </div>
        </div>
      </div>

      {/* 5. EXCEL SOURCE INFO & RECENT AUDIT LOGS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Excel Source Metadata */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Excel Snapshot Source</h4>
          </div>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">Sheet:</span>
              <span className="font-mono text-slate-800">{excelRowInfo?.sheetName || 'Unit_1_Workstation Detail'}</span>
            </div>
            <div className="flex justify-between py-0.5">
              <span className="text-slate-500">Row Number:</span>
              <span className="font-mono font-semibold text-slate-900">{excelRowInfo?.rowNumber ? `#${excelRowInfo.rowNumber}` : '—'}</span>
            </div>
            {excelRowInfo?.rawValues && Object.keys(excelRowInfo.rawValues).length > 0 && (
              <details className="mt-2 text-[11px]">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800 font-medium">
                  View raw Excel fields ({Object.keys(excelRowInfo.rawValues).length})
                </summary>
                <div className="mt-1 max-h-32 overflow-auto bg-slate-50 p-2 rounded-md font-mono text-[10px] divide-y divide-slate-200 border border-slate-200">
                  {Object.entries(excelRowInfo.rawValues).map(([k, v]) => (
                    <div key={k} className="py-0.5 flex justify-between">
                      <span className="text-slate-500">{k}:</span>
                      <span className="text-slate-800 truncate max-w-[150px]">{String(v ?? '—')}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        </div>

        {/* Recent Audit Logs */}
        <div className="rounded-lg border border-slate-200 bg-white p-3.5 shadow-2xs space-y-2">
          <div className="flex items-center gap-2 text-slate-800 border-b border-slate-100 pb-2">
            <History className="w-4 h-4 text-slate-600" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Audit History</h4>
          </div>
          {recentAuditLogs && recentAuditLogs.length > 0 ? (
            <div className="max-h-36 overflow-auto divide-y divide-slate-100 text-xs">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="py-1.5 space-y-0.5">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="font-mono font-semibold text-slate-800">{log.action}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 flex justify-between">
                    <span>By: {log.performedBy}</span>
                    {log.details && <span className="truncate max-w-[140px] italic">{log.details}</span>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic py-2">No previous reconciliation actions logged.</div>
          )}
        </div>
      </div>
    </div>
  );
};
