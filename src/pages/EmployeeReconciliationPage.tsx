import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Lock,
  ArrowLeft,
  ChevronRight,
  FileSpreadsheet,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  ReconciliationCase,
  ReconciliationSummary,
  ReconciliationFiltersQuery,
  fetchReconciliationSummary,
  fetchReconciliationCases,
  fetchReconciliationCase,
  BulkReconciliationPlan,
  generateReconciliationPlan,
  applyReconciliationPlan,
} from '../api/reconciliation';
import { ReconciliationSummaryCards } from '../components/reconciliation/ReconciliationSummaryCards';
import { ReconciliationFilters } from '../components/reconciliation/ReconciliationFilters';
import { ReconciliationTable } from '../components/reconciliation/ReconciliationTable';
import { ComparisonView } from '../components/reconciliation/ComparisonView';
import { EvidencePanel } from '../components/reconciliation/EvidencePanel';
import { ReconciliationActionToolbar } from '../components/reconciliation/ReconciliationActionToolbar';
import { CorrectionPreviewModal } from '../components/reconciliation/CorrectionPreviewModal';
import { BulkReconciliationPanel } from '../components/reconciliation/BulkReconciliationPanel';

export const EmployeeReconciliationPage: React.FC = () => {
  const { adminUser, isLoading: authLoading } = useAuth();

  // Normalize role
  const rawRole = (adminUser?.role || 'UNIT_ADMIN').toUpperCase().replace(/[\s-]+/g, '_');
  const role = rawRole === 'SUPERADMIN' ? 'SUPER_ADMIN' : rawRole === 'TECHADMIN' ? 'TECH_ADMIN' : rawRole;

  // Access control
  const isUnitAdmin = role === 'UNIT_ADMIN';
  const isTechAdmin = role === 'TECH_ADMIN';
  const isSuperAdmin = role === 'SUPER_ADMIN';

  // State
  const [summary, setSummary] = useState<ReconciliationSummary | null>(null);
  const [cases, setCases] = useState<ReconciliationCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<ReconciliationCase | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingCases, setLoadingCases] = useState(false);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bulkPlan, setBulkPlan] = useState<BulkReconciliationPlan | null>(null);
  const [bulkPlanLoading, setBulkPlanLoading] = useState(false);
  const [bulkApplyLoading, setBulkApplyLoading] = useState(false);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Pagination & Filters
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ReconciliationFiltersQuery>({
    page: 1,
    limit: 15,
    status: 'ALL',
    classification: 'ALL',
    unit: 'ALL',
    department: 'ALL',
    mismatchField: 'ALL',
    search: '',
  });

  // Modal State
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Load summary
  const loadSummary = useCallback(async () => {
    if (isUnitAdmin) return;
    setLoadingSummary(true);
    try {
      const data = await fetchReconciliationSummary();
      setSummary(data);
    } catch (err: any) {
      // Summary error fallback
    } finally {
      setLoadingSummary(false);
    }
  }, [isUnitAdmin]);

  // Load cases
  const loadCases = useCallback(async () => {
    if (isUnitAdmin) return;
    setLoadingCases(true);
    setError(null);
    try {
      const res = await fetchReconciliationCases({ ...filters, page, limit: 15 });
      setCases(res.cases);
      setTotal(res.total ?? res.cases.length);
      setTotalPages(res.totalPages ?? Math.max(1, Math.ceil((res.total ?? res.cases.length) / 15)));

      // If selected case is not in the new list, or none selected, pick the first
      if (res.cases.length > 0) {
        const stillSelected = selectedCase ? res.cases.find((c) => c.id === selectedCase.id) : null;
        if (stillSelected) {
          setSelectedCase(stillSelected);
        } else if (!selectedCase) {
          setSelectedCase(res.cases[0]);
        }
      } else {
        setSelectedCase(null);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load reconciliation cases.');
      setCases([]);
      setSelectedCase(null);
    } finally {
      setLoadingCases(false);
    }
  }, [filters, page, isUnitAdmin]);

  useEffect(() => {
    if (!authLoading && !isUnitAdmin) {
      loadSummary();
    }
  }, [authLoading, isUnitAdmin, loadSummary]);

  useEffect(() => {
    if (!authLoading && !isUnitAdmin) {
      loadCases();
    }
  }, [authLoading, isUnitAdmin, loadCases]);

  // Handle case inspection / refresh
  const handleSelectCase = async (item: ReconciliationCase) => {
    setSelectedCase(item);
    setLoadingDetails(true);
    try {
      const fullCase = await fetchReconciliationCase(item.id);
      setSelectedCase(fullCase);
    } catch {
      // Keep existing item if fetch details fails
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleRefreshCurrentCase = async () => {
    if (!selectedCase) return;
    try {
      const fullCase = await fetchReconciliationCase(selectedCase.id);
      setSelectedCase(fullCase);
      // Also update in list
      setCases((prev) => prev.map((c) => (c.id === fullCase.id ? fullCase : c)));
      loadSummary();
    } catch (err: any) {
      setError('Could not refresh case: ' + err.message);
    }
  };

  const handleActionComplete = (updatedCase: ReconciliationCase) => {
    setSelectedCase(updatedCase);
    setCases((prev) => prev.map((c) => (c.id === updatedCase.id ? updatedCase : c)));
    loadSummary();
  };

  const handleFilterChange = (newFilters: Partial<ReconciliationFiltersQuery>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPage(1);
  };

  const handleResetFilters = () => {
    setFilters({
      page: 1,
      limit: 15,
      status: 'ALL',
      classification: 'ALL',
      unit: 'ALL',
      department: 'ALL',
      mismatchField: 'ALL',
      search: '',
    });
    setPage(1);
  };

  const handleFilterCardClick = (key: string, value: string) => {
    handleFilterChange({ [key]: value, page: 1 });
  };

  const handleGenerateBulkPlan = async () => {
    setBulkPlanLoading(true);
    setBulkError(null);
    try {
      setBulkPlan(await generateReconciliationPlan());
    } catch (err: any) {
      setBulkError(err.message || 'Failed to generate reconciliation plan.');
    } finally {
      setBulkPlanLoading(false);
    }
  };

  const handleApplyBulkPlan = async () => {
    if (!bulkPlan) return;
    setBulkApplyLoading(true);
    setBulkError(null);
    try {
      await applyReconciliationPlan(bulkPlan.runId);
      await Promise.all([loadSummary(), loadCases()]);
      setBulkPlan(null);
    } catch (err: any) {
      setBulkError(err.message || 'Failed to apply reconciliation plan.');
    } finally {
      setBulkApplyLoading(false);
    }
  };

  // 0. AUTH LOADING VIEW
  if (authLoading) {
    return (
      <div className="max-w-[1750px] mx-auto px-4 sm:px-6 py-16 text-center text-slate-500">
        <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-600 mb-3" />
        <p className="text-sm font-medium">Loading reconciliation workspace...</p>
      </div>
    );
  }

  // 1. UNIT_ADMIN ACCESS DENIED VIEW
  if (isUnitAdmin) {
    return (
      <div
        className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4"
        data-testid="reconciliation-access-denied"
      >
        <div className="w-16 h-16 mx-auto rounded-full bg-rose-100 flex items-center justify-center text-rose-600">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access Denied</h1>
        <p className="text-sm text-slate-600 max-w-md mx-auto">
          You do not have permission to access Data Quality & Employee Reconciliation. This module is restricted to Super Admin and Technical Admin.
        </p>
        <div className="pt-4">
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1750px] mx-auto px-4 sm:px-6 py-5 space-y-5" data-testid="reconciliation-page">
      {/* Navigation Breadcrumbs & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link to="/data-quality" className="hover:text-blue-600 transition-colors">
              Data Quality
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold">Employee Reconciliation</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Employee Data Reconciliation
            </h1>
            {isTechAdmin && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300"
                data-testid="header-tech-admin-readonly-badge"
              >
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                READ ONLY
              </span>
            )}
            {isSuperAdmin && (
              <span
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-900 border border-purple-300"
                data-testid="header-super-admin-badge"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-700" />
                SUPER ADMIN
              </span>
            )}
          </div>
        </div>

        {/* Sub-page Navigation Tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-medium">
            <Link
              to="/data-quality"
              className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-colors"
            >
              Conflicts Report
            </Link>
            <span className="px-3 py-1.5 rounded-md bg-white text-blue-700 font-bold shadow-2xs">
              Employee Reconciliation
            </span>
          </div>

          <button
            type="button"
            onClick={() => {
              loadSummary();
              loadCases();
            }}
            disabled={loadingCases || loadingSummary}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            title="Refresh reconciliation data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingCases || loadingSummary ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* TECH_ADMIN PROMINENT READ-ONLY BANNER */}
      {isTechAdmin && (
        <div
          className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 shadow-2xs flex items-start gap-3"
          role="status"
          data-testid="prominent-tech-admin-banner"
        >
          <Lock className="w-5 h-5 text-amber-700 mt-0.5 shrink-0" />
          <div className="space-y-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-amber-950">
              READ ONLY MODE &mdash; Technical Administrator
            </h2>
            <p className="text-xs text-amber-900 leading-relaxed">
              Technical administrators have view-only observation privileges in the Data Reconciliation module. All live mutation actions (Keep Current, Correct System, Formatting Only, Needs Review, Apply Correction, Resolve, Reopen) are hidden or disabled. Live database modifications require Super Admin authorization.
            </p>
          </div>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-xs text-rose-800 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Top Summary Metrics Cards */}
      <ReconciliationSummaryCards
        summary={summary}
        loading={loadingSummary}
        activeFilter={filters.status}
        onFilterClick={handleFilterCardClick}
      />

      <BulkReconciliationPanel
        plan={bulkPlan}
        isSuperAdmin={isSuperAdmin}
        loading={bulkPlanLoading}
        applying={bulkApplyLoading}
        error={bulkError}
        onGenerate={handleGenerateBulkPlan}
        onApply={handleApplyBulkPlan}
      />

      {/* Search and Filters */}
      <ReconciliationFilters
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        totalResults={total}
        loading={loadingCases}
      />

      {/* Main Two-Column Work Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Cases Table (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Reconciliation Cases ({total})
            </h2>
            {selectedCase && (
              <span className="text-[11px] text-slate-500 font-mono">
                Selected: {selectedCase.employeeCode}
              </span>
            )}
          </div>

          <ReconciliationTable
            cases={cases}
            selectedCaseId={selectedCase?.id}
            onSelectCase={handleSelectCase}
            page={page}
            totalPages={totalPages}
            total={total}
            onPageChange={(newPage) => setPage(newPage)}
            loading={loadingCases}
          />
        </div>

        {/* Right Column: Case Details, Side-by-Side Comparison & Evidence Panel (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {selectedCase ? (
            <>
              {/* Action Toolbar */}
              <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-2xs space-y-2">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Resolution Actions
                  </h3>
                  <button
                    type="button"
                    onClick={handleRefreshCurrentCase}
                    disabled={loadingDetails}
                    className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1"
                    title="Reload current case"
                  >
                    <RefreshCw className={`w-3 h-3 ${loadingDetails ? 'animate-spin' : ''}`} />
                    <span>Reload Case</span>
                  </button>
                </div>

                <ReconciliationActionToolbar
                  caseItem={selectedCase}
                  userRole={role}
                  onOpenCorrectionPreview={() => setIsPreviewModalOpen(true)}
                  onActionComplete={handleActionComplete}
                />
              </div>

              {/* Side-by-Side Comparison UI */}
              <ComparisonView
                employeeCode={selectedCase.employeeCode}
                employeeName={selectedCase.employeeName}
                comparisons={selectedCase.fieldComparisons}
                mismatchCount={selectedCase.mismatchCount}
                allFieldsMatch={selectedCase.allFieldsMatch}
                caseStatus={selectedCase.status}
              />

              {/* Evidence Panel */}
              <EvidencePanel evidence={selectedCase.evidence} />
            </>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400 space-y-2 shadow-2xs">
              <FileSpreadsheet className="w-10 h-10 mx-auto text-slate-300" />
              <h3 className="text-sm font-semibold text-slate-700">No Case Selected</h3>
              <p className="text-xs text-slate-500">
                Select a reconciliation case from the list on the left to inspect field comparisons and evidence.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Two-Step Correction Preview Modal */}
      {selectedCase && (
        <CorrectionPreviewModal
          isOpen={isPreviewModalOpen}
          caseItem={selectedCase}
          userRole={role}
          onClose={() => setIsPreviewModalOpen(false)}
          onSuccess={handleActionComplete}
          onRefreshCase={handleRefreshCurrentCase}
        />
      )}
    </div>
  );
};
