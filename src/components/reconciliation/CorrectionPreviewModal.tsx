import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RefreshCw,
  Lock,
  Wrench,
} from 'lucide-react';
import {
  ReconciliationCase,
  CorrectionPreviewResponse,
  previewReconciliationCorrection,
  applyReconciliationCorrection,
} from '../../api/reconciliation';

interface CorrectionPreviewModalProps {
  isOpen: boolean;
  caseItem: ReconciliationCase | null;
  userRole?: string;
  onClose: () => void;
  onSuccess: (updatedCase: ReconciliationCase) => void;
  onRefreshCase: () => void;
}

export const CorrectionPreviewModal: React.FC<CorrectionPreviewModalProps> = ({
  isOpen,
  caseItem,
  userRole = 'SUPER_ADMIN',
  onClose,
  onSuccess,
  onRefreshCase,
}) => {
  const [preview, setPreview] = useState<CorrectionPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [notes, setNotes] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isStale409, setIsStale409] = useState(false);

  const isTechAdmin = userRole === 'TECH_ADMIN';

  useEffect(() => {
    if (!isOpen || !caseItem) {
      setPreview(null);
      setErrorMessage(null);
      setIsStale409(false);
      setNotes('');
      return;
    }

    let active = true;
    const loadPreview = async () => {
      setLoading(true);
      setErrorMessage(null);
      setIsStale409(false);
      try {
        const data = await previewReconciliationCorrection(caseItem.id);
        if (active) {
          setPreview(data);
        }
      } catch (err: any) {
        if (active) {
          setErrorMessage(err.message || 'Failed to generate correction preview.');
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void loadPreview();
    return () => {
      active = false;
    };
  }, [isOpen, caseItem?.id]);

  if (!isOpen || !caseItem) return null;

  const handleApply = async () => {
    if (!preview || isTechAdmin || !preview.canApply) return;
    setApplying(true);
    setErrorMessage(null);
    setIsStale409(false);

    try {
      const result = await applyReconciliationCorrection(caseItem.id, {
        snapshotUpdatedAt: preview.snapshotUpdatedAt,
        notes: notes.trim() || undefined,
      });
      onSuccess(result.case);
      onClose();
    } catch (err: any) {
      if (err.statusCode === 409 || err.code === 'RECONCILIATION_STALE' || /stale|concurrency|changed/i.test(err.message)) {
        setIsStale409(true);
        setErrorMessage('Employee data changed after review began. Please refresh.');
      } else {
        setErrorMessage(err.message || 'Failed to apply reconciliation correction.');
      }
    } finally {
      setApplying(false);
    }
  };

  const handleRefreshAndReload = () => {
    onRefreshCase();
    onClose();
  };

  const isBlockedBySeat = Boolean(preview?.seatConflict?.isBlocked);
  const canApplyCorrection = Boolean(
    !isTechAdmin &&
    preview?.canApply &&
    !isBlockedBySeat &&
    !isStale409 &&
    !applying &&
    !loading
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="preview-modal-title"
      data-testid="correction-preview-modal"
    >
      <div className="relative w-full max-w-3xl rounded-xl bg-white shadow-2xl border border-slate-200 overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-orange-100 text-orange-700">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h2 id="preview-modal-title" className="text-sm font-bold text-slate-900">
                Two-Step Correction Preview
              </h2>
              <p className="text-xs text-slate-500">
                Review proposed field mutations & validate system constraints before applying.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
            aria-label="Close dialog"
            data-testid="close-preview-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TECH_ADMIN Read-Only Banner inside modal */}
        {isTechAdmin && (
          <div
            className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center gap-2 text-xs font-semibold text-amber-800"
            data-testid="preview-tech-admin-readonly-banner"
          >
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              READ ONLY MODE: Technical Admin can inspect proposed corrections but cannot apply live mutations.
            </span>
          </div>
        )}

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Target Employee Info */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Target Employee: </span>
              <span className="font-bold text-slate-800">{caseItem.employeeName}</span>
              <span className="ml-2 font-mono px-1.5 py-0.5 rounded-sm bg-slate-200 text-slate-700">
                {caseItem.employeeCode}
              </span>
            </div>
            {preview?.snapshotUpdatedAt && (
              <span className="text-[11px] text-slate-400 font-mono">
                Snapshot: {new Date(preview.snapshotUpdatedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Stale Concurrency 409 Banner */}
          {isStale409 && (
            <div
              className="p-4 rounded-lg bg-rose-50 border-2 border-rose-300 text-rose-900 space-y-2"
              role="alert"
              data-testid="stale-409-alert"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                  Concurrency Conflict (409 RECONCILIATION_STALE)
                </h4>
              </div>
              <p className="text-xs text-rose-800 font-medium">
                Employee data changed after review began. Please refresh.
              </p>
              <button
                type="button"
                onClick={handleRefreshAndReload}
                className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-rose-700 text-white text-xs font-semibold hover:bg-rose-800 shadow-xs"
                data-testid="refresh-stale-case-btn"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Employee Data</span>
              </button>
            </div>
          )}

          {/* Generic Error message */}
          {errorMessage && !isStale409 && (
            <div className="p-3 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {errorMessage}
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              <span className="text-xs font-medium">Running hierarchy validation & checking seat availability…</span>
            </div>
          )}

          {!loading && preview && (
            <>
              {/* Field Diffs Comparison */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Proposed Changes (Current vs Proposed)
                </h3>
                <div className="rounded-lg border border-slate-200 overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-semibold uppercase tracking-wider text-[10px]">
                        <th className="py-2 px-3">Field</th>
                        <th className="py-2 px-3">Current System Value</th>
                        <th className="py-2 px-3">Proposed (from Excel)</th>
                        <th className="py-2 px-3 text-center">Validation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {preview.fieldDiffs.map((diff) => (
                        <tr key={diff.field} className="hover:bg-slate-50/50">
                          <td className="py-2 px-3 font-semibold text-slate-700">
                            {diff.fieldLabel || diff.field}
                          </td>
                          <td className="py-2 px-3 text-slate-600">
                            {diff.currentValue || <span className="text-slate-400 italic">None</span>}
                          </td>
                          <td className="py-2 px-3 font-semibold text-blue-900 bg-blue-50/40">
                            {diff.proposedValue || <span className="text-slate-400 italic">None</span>}
                          </td>
                          <td className="py-2 px-3 text-center">
                            {diff.validationStatus === 'VALID' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                                {diff.validationMessage || 'Check'}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hierarchy Validation Card */}
              <div className="p-3.5 rounded-lg border border-slate-200 bg-slate-50 space-y-2">
                <div className="flex items-center gap-2">
                  {preview.hierarchyValidation.isValid ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  )}
                  <h4 className="text-xs font-bold text-slate-800">
                    Hierarchy Validation: {preview.hierarchyValidation.isValid ? 'Passed' : 'Issues Found'}
                  </h4>
                </div>
                {preview.hierarchyValidation.isValid ? (
                  <p className="text-xs text-slate-600">
                    All referenced Units, Buildings, Floors, and Departments exist and maintain valid parent-child relationships.
                  </p>
                ) : (
                  <div className="space-y-1 text-xs text-rose-800">
                    {preview.hierarchyValidation.errors.map((err, i) => (
                      <p key={i}>&bull; {err}</p>
                    ))}
                  </div>
                )}
              </div>

              {/* Seat Conflict Card */}
              <div
                className={`p-3.5 rounded-lg border ${
                  isBlockedBySeat
                    ? 'border-red-300 bg-red-50 text-red-900'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-900'
                } space-y-1.5`}
                data-testid="preview-seat-conflict-card"
              >
                <div className="flex items-center gap-2">
                  {isBlockedBySeat ? (
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                  <h4 className="text-xs font-bold uppercase tracking-wider">
                    {isBlockedBySeat ? 'Workstation Conflict (Correction Blocked)' : 'Workstation Availability'}
                  </h4>
                </div>
                {isBlockedBySeat ? (
                  <p className="text-xs text-red-800 font-medium">
                    {preview.seatConflict.warning ||
                      `Target seat "${preview.seatConflict.targetSeatLabel}" is currently occupied by ${
                        preview.seatConflict.currentOccupant || 'another employee'
                      }. Direct overwrite is blocked to protect seating safety.`}
                  </p>
                ) : (
                  <p className="text-xs text-emerald-800">
                    Target seat {preview.seatConflict.targetSeatLabel ? `"${preview.seatConflict.targetSeatLabel}"` : ''} is available or requires no reassignment.
                  </p>
                )}
              </div>

              {/* Notes Input */}
              {!isTechAdmin && (
                <div className="space-y-1">
                  <label htmlFor="preview-correction-notes" className="block text-xs font-semibold text-slate-700">
                    Audit Log Notes (Optional)
                  </label>
                  <textarea
                    id="preview-correction-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add rationale for applying this correction..."
                    rows={2}
                    className="w-full text-xs p-2.5 rounded-md border border-slate-300 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    data-testid="correction-notes-input"
                  />
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white border border-slate-200 rounded-md hover:bg-slate-100 transition-colors"
            data-testid="preview-cancel-btn"
          >
            Cancel
          </button>

          <div className="flex items-center gap-2">
            {isTechAdmin ? (
              <span
                className="text-xs text-slate-500 italic bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200"
                data-testid="tech-admin-disabled-notice"
              >
                Read-Only (Mutations Disabled for Technical Admin)
              </span>
            ) : (
              <button
                type="button"
                onClick={handleApply}
                disabled={!canApplyCorrection}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-md shadow-xs transition-colors"
                data-testid="apply-correction-btn"
                title={
                  isBlockedBySeat
                    ? 'Correction is blocked by occupied seat conflict'
                    : isStale409
                    ? 'Please refresh data'
                    : 'Apply validated corrections to MongoDB'
                }
              >
                {applying ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Applying Correction…</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Apply Correction</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
