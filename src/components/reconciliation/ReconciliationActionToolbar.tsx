import React, { useState } from 'react';
import {
  ShieldCheck,
  Wrench,
  FileEdit,
  HelpCircle,
  RotateCcw,
  Lock,
  AlertCircle,
} from 'lucide-react';
import {
  ReconciliationCase,
  resolveReconciliationCase,
  markReconciliationNeedsReview,
  reopenReconciliationCase,
} from '../../api/reconciliation';

interface ActionToolbarProps {
  caseItem: ReconciliationCase;
  userRole?: string;
  onOpenCorrectionPreview: () => void;
  onActionComplete: (updatedCase: ReconciliationCase) => void;
  className?: string;
}

export const ReconciliationActionToolbar: React.FC<ActionToolbarProps> = ({
  caseItem,
  userRole = 'SUPER_ADMIN',
  onOpenCorrectionPreview,
  onActionComplete,
  className = '',
}) => {
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [needsReviewPromptOpen, setNeedsReviewPromptOpen] = useState(false);
  const [reviewNote, setReviewNote] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  const isTechAdmin = userRole === 'TECH_ADMIN';
  const isSuperAdmin = userRole === 'SUPER_ADMIN';

  const isResolved = caseItem.status === 'RESOLVED' || caseItem.status === 'EXCEL_STALE';

  // 1. Keep Current System (Excel Stale / Resolved)
  const handleKeepCurrent = async () => {
    if (isTechAdmin) return;
    setLoadingAction('KEEP_CURRENT');
    setActionError(null);
    try {
      const updated = await resolveReconciliationCase(caseItem.id, {
        resolutionType: 'KEEP_CURRENT',
        notes: 'Kept current live system record (Excel deemed stale or expected change).',
      });
      onActionComplete(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to resolve case.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Formatting Only
  const handleFormattingOnly = async () => {
    if (isTechAdmin) return;
    setLoadingAction('FORMATTING_ONLY');
    setActionError(null);
    try {
      const updated = await resolveReconciliationCase(caseItem.id, {
        resolutionType: 'FORMATTING_ONLY',
        notes: 'Resolved as formatting/casing discrepancy only.',
      });
      onActionComplete(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to resolve formatting case.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Submit Needs Review note
  const handleSubmitNeedsReview = async () => {
    if (isTechAdmin || !reviewNote.trim()) return;
    setLoadingAction('NEEDS_REVIEW');
    setActionError(null);
    try {
      const updated = await markReconciliationNeedsReview(caseItem.id, {
        notes: reviewNote.trim(),
      });
      onActionComplete(updated);
      setNeedsReviewPromptOpen(false);
      setReviewNote('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to update review status.');
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Reopen case (SUPER_ADMIN only)
  const handleReopen = async () => {
    if (!isSuperAdmin) return;
    setLoadingAction('REOPEN');
    setActionError(null);
    try {
      const updated = await reopenReconciliationCase(caseItem.id, {
        notes: 'Reopened by Super Admin for re-review.',
      });
      onActionComplete(updated);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reopen case.');
    } finally {
      setLoadingAction(null);
    }
  };

  return (
    <div className={`space-y-3 ${className}`} data-testid="reconciliation-action-toolbar">
      {/* Error banner */}
      {actionError && (
        <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{actionError}</span>
        </div>
      )}

      {/* TECH_ADMIN Read-Only Banner */}
      {isTechAdmin && (
        <div
          className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-xs font-semibold text-amber-800"
          data-testid="tech-admin-readonly-banner"
        >
          <Lock className="w-4 h-4 text-amber-600 shrink-0" />
          <span>READ ONLY: Technical Admin has view-only privileges in Data Reconciliation. All mutation actions are disabled.</span>
        </div>
      )}

      {/* Needs Review Note Drawer/Prompt */}
      {needsReviewPromptOpen && !isTechAdmin && (
        <div className="p-3 rounded-lg border border-amber-200 bg-amber-50/70 space-y-2">
          <h4 className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            Mark for Manual Review
          </h4>
          <textarea
            value={reviewNote}
            onChange={(e) => setReviewNote(e.target.value)}
            placeholder="Specify what needs to be verified before resolving this discrepancy..."
            rows={2}
            className="w-full text-xs p-2 rounded-md border border-amber-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
            data-testid="needs-review-note-input"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setNeedsReviewPromptOpen(false);
                setReviewNote('');
              }}
              className="px-2.5 py-1 text-xs text-slate-600 hover:text-slate-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitNeedsReview}
              disabled={!reviewNote.trim() || loadingAction === 'NEEDS_REVIEW'}
              className="px-3 py-1 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md disabled:opacity-50"
              data-testid="submit-needs-review-btn"
            >
              {loadingAction === 'NEEDS_REVIEW' ? 'Saving…' : 'Save as Needs Review'}
            </button>
          </div>
        </div>
      )}

      {/* Action Buttons Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. Correct System (Opens Two-Step Preview) */}
        <button
          type="button"
          onClick={onOpenCorrectionPreview}
          disabled={isTechAdmin || isResolved || loadingAction !== null}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-md shadow-2xs transition-colors ${
            isTechAdmin
              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
          data-testid="correct-system-btn"
          title={isTechAdmin ? 'Disabled in Read-Only mode' : 'Open two-step correction preview'}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Correct Current System</span>
        </button>

        {/* 2. Keep Current System */}
        <button
          type="button"
          onClick={handleKeepCurrent}
          disabled={isTechAdmin || isResolved || loadingAction !== null}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
            isTechAdmin
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
          data-testid="keep-current-btn"
          title={isTechAdmin ? 'Disabled in Read-Only mode' : 'Keep current live system data and mark resolved'}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>{loadingAction === 'KEEP_CURRENT' ? 'Saving…' : 'Keep Current System'}</span>
        </button>

        {/* 3. Formatting Only */}
        <button
          type="button"
          onClick={handleFormattingOnly}
          disabled={isTechAdmin || isResolved || loadingAction !== null}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
            isTechAdmin
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
          data-testid="formatting-only-btn"
          title={isTechAdmin ? 'Disabled in Read-Only mode' : 'Resolve as harmless formatting difference'}
        >
          <FileEdit className="w-3.5 h-3.5 text-indigo-600" />
          <span>{loadingAction === 'FORMATTING_ONLY' ? 'Saving…' : 'Formatting Only'}</span>
        </button>

        {/* 4. Needs Review */}
        <button
          type="button"
          onClick={() => setNeedsReviewPromptOpen(true)}
          disabled={isTechAdmin || isResolved || loadingAction !== null || needsReviewPromptOpen}
          className={`inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border transition-colors ${
            isTechAdmin
              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
              : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed'
          }`}
          data-testid="needs-review-btn"
          title={isTechAdmin ? 'Disabled in Read-Only mode' : 'Mark case as requiring further review'}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>Needs Review</span>
        </button>

        {/* 5. Reopen Case (SUPER_ADMIN only on resolved cases) */}
        {isSuperAdmin && isResolved && (
          <button
            type="button"
            onClick={handleReopen}
            disabled={loadingAction !== null}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-md border border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
            data-testid="reopen-case-btn"
            title="Reopen previously resolved case (Super Admin only)"
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-600" />
            <span>{loadingAction === 'REOPEN' ? 'Reopening…' : 'Reopen Case'}</span>
          </button>
        )}
      </div>
    </div>
  );
};
