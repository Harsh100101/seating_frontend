import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  RefreshCw,
  Search,
  ShieldAlert,
  ArrowRight,
  SlidersHorizontal,
  Check,
  X,
  Info
} from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';

interface PendingRecord {
  id: string;
  sourceHash: string;
  excelRow: number;
  employeeCode?: string | null;
  employeeName?: string | null;
  workstation?: string | null;
  problem: string;
  category?: string | null;
  conflictingValue?: any;
  requiredDecision?: string | null;
  unit?: string | null;
  unitId?: string | null;
  building?: string | null;
  floor?: string | null;
  officeArea?: string | null;
  department?: string | null;
  section?: string | null;
  functionName?: string | null;
  status: 'PENDING' | 'NEEDS_MANUAL_INPUT' | 'READY_TO_VALIDATE' | 'RESOLVED' | 'APPLIED' | 'BLOCKED';
  resolutionDecision?: string | null;
  resolutionNotes?: string | null;
  resolvedById?: string | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface PendingResponse {
  records: PendingRecord[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  kpis: {
    total: number;
    pending: number;
    needsManualInput: number;
    readyToValidate: number;
    resolved: number;
    duplicateEmployeeGroups: number;
    duplicateWorkstationGroups: number;
    hierarchyConflicts: number;
    extraRecords: number;
  };
  viewer: {
    role: string;
    isReadOnly: boolean;
    unitScope: string | null;
  };
}

export const PendingCorrectionsPage: React.FC = () => {
  const { adminUser } = useAuth();
  const rawRole = (adminUser?.role || 'UNIT_ADMIN').toUpperCase().replace(/[\s-]+/g, '_');
  const role = rawRole === 'SUPERADMIN' ? 'SUPER_ADMIN' : rawRole === 'TECHADMIN' ? 'TECH_ADMIN' : rawRole;
  const isReadOnly = role === 'TECH_ADMIN';

  const [data, setData] = useState<PendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [problemFilter, setProblemFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedRecord, setSelectedRecord] = useState<PendingRecord | null>(null);

  // Resolution modal state
  const [resolutionDecision, setResolutionDecision] = useState<string>('KEEP_ROW');
  const [resolutionNotes, setResolutionNotes] = useState<string>('');
  const [resolving, setResolving] = useState<boolean>(false);
  const [resolveSuccess, setResolveSuccess] = useState<string | null>(null);

  const fetchCorrections = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') params.append('status', statusFilter);
      if (problemFilter !== 'ALL') params.append('problem', problemFilter);
      if (searchTerm.trim()) params.append('search', searchTerm.trim());

      const res = await apiRequest<PendingResponse>(`/data-quality/pending-corrections?${params.toString()}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Failed to load pending corrections.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCorrections();
  }, [statusFilter, problemFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCorrections();
  };

  const handleOpenModal = (record: PendingRecord) => {
    setSelectedRecord(record);
    setResolutionDecision(record.resolutionDecision || 'KEEP_ROW');
    setResolutionNotes(record.resolutionNotes || '');
    setResolveSuccess(null);
  };

  const handleResolve = async () => {
    if (!selectedRecord || isReadOnly) return;
    setResolving(true);
    setError(null);
    try {
      await apiRequest(`/data-quality/pending-corrections/${selectedRecord.id}/resolve`, {
        method: 'POST',
        body: JSON.stringify({
          decision: resolutionDecision,
          notes: resolutionNotes
        })
      });
      setResolveSuccess('Correction successfully resolved and recorded.');
      setTimeout(() => {
        setSelectedRecord(null);
        fetchCorrections();
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to submit conflict resolution.');
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">Data Quality & Pending Corrections</h1>
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-amber-100 text-amber-800 rounded-full border border-amber-200">
              Staged Review
            </span>
            {isReadOnly && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-full border border-slate-200">
                Tech Admin (Read-Only)
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authoritative source conflicts staged for client decision and resolution before production apply.
          </p>
        </div>

        {/* Sub-nav tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-medium">
            <Link
              to="/data-quality"
              className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-colors"
            >
              Conflicts Report
            </Link>
            <span className="px-3 py-1.5 rounded-md bg-white text-blue-700 font-bold shadow-2xs">
              Pending Corrections Review
            </span>
          </div>
          <button
            type="button"
            onClick={fetchCorrections}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-500 hover:text-rose-700"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* KPI Cards */}
      {data?.kpis && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">Total Staged</p>
            <p className="mt-1 text-2xl font-bold font-mono text-slate-900">{data.kpis.total}</p>
          </div>
          <div className="rounded-lg border border-rose-200 bg-rose-50/50 p-3 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-600">Needs Input</p>
            <p className="mt-1 text-2xl font-bold font-mono text-rose-700">{data.kpis.needsManualInput || data.kpis.pending}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-3 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-amber-600">Emp ID Clashes</p>
            <p className="mt-1 text-2xl font-bold font-mono text-amber-700">{data.kpis.duplicateEmployeeGroups}</p>
          </div>
          <div className="rounded-lg border border-purple-200 bg-purple-50/50 p-3 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-purple-600">Desk Clashes</p>
            <p className="mt-1 text-2xl font-bold font-mono text-purple-700">{data.kpis.duplicateWorkstationGroups}</p>
          </div>
          <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-3 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-blue-600">Hierarchy Clashes</p>
            <p className="mt-1 text-2xl font-bold font-mono text-blue-700">{data.kpis.hierarchyConflicts}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 shadow-2xs">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-emerald-600">Resolved</p>
            <p className="mt-1 text-2xl font-bold font-mono text-emerald-700">{data.kpis.resolved}</p>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <form onSubmit={handleSearch} className="flex items-center gap-2 flex-1 min-w-[280px]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by Emp Code, Name, Workstation, Dept, Area..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs font-semibold hover:bg-blue-700"
          >
            Filter
          </button>
        </form>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Problem:</span>
            <select
              value={problemFilter}
              onChange={(e) => setProblemFilter(e.target.value)}
              className="text-xs rounded border border-slate-200 py-1 px-2 focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Problems</option>
              <option value="DUPLICATE_EMPLOYEE_ID">Duplicate Employee ID</option>
              <option value="DUPLICATE_WORKSTATION">Duplicate Workstation</option>
              <option value="MISSING_HIERARCHY">Missing Hierarchy</option>
              <option value="AMBIGUOUS_HIERARCHY">Ambiguous Hierarchy</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs rounded border border-slate-200 py-1 px-2 focus:ring-1 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="NEEDS_MANUAL_INPUT">Needs Input</option>
              <option value="RESOLVED">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table of Records */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 uppercase text-[10px] tracking-wider font-semibold">
              <tr>
                <th className="py-2.5 px-3">Excel Row</th>
                <th className="py-2.5 px-3">Problem / Type</th>
                <th className="py-2.5 px-3">Employee</th>
                <th className="py-2.5 px-3">Workstation</th>
                <th className="py-2.5 px-3">Location Hierarchy</th>
                <th className="py-2.5 px-3">Required Decision</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {loading && (!data || data.records.length === 0) ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">Loading pending correction records...</td>
                </tr>
              ) : data && data.records.length > 0 ? (
                data.records.map((record) => {
                  const isResolved = record.status === 'RESOLVED' || record.status === 'APPLIED';
                  const isEmpProblem = record.problem === 'DUPLICATE_EMPLOYEE_ID';
                  const isWsProblem = record.problem === 'DUPLICATE_WORKSTATION';

                  return (
                    <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        Row {record.excelRow}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isEmpProblem ? 'bg-amber-100 text-amber-800' :
                          isWsProblem ? 'bg-purple-100 text-purple-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {record.problem.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        {record.employeeCode ? (
                          <div>
                            <span className="font-mono font-semibold text-slate-900">{record.employeeCode}</span>
                            {record.employeeName && <span className="text-slate-500 ml-1.5">({record.employeeName})</span>}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None / Vacant</span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-slate-800">
                        {record.workstation || <span className="text-slate-400 italic">None</span>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        <div className="truncate max-w-[220px]" title={`${record.unit || ''} > ${record.building || ''} > ${record.floor || ''} > ${record.officeArea || ''}`}>
                          {record.unit || 'Unit-1'} &bull; {record.building || 'Main'} &bull; {record.floor || 'Floor'} &bull; {record.officeArea || ''}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-[260px]">
                        <div className="truncate" title={record.requiredDecision || ''}>
                          {record.requiredDecision || 'Select authoritative record'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          isResolved ? 'bg-emerald-100 text-emerald-800' :
                          record.status === 'NEEDS_MANUAL_INPUT' ? 'bg-rose-100 text-rose-800' :
                          'bg-amber-100 text-amber-800'
                        }`}>
                          {isResolved ? <Check className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
                          {record.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenModal(record)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 rounded text-xs font-semibold text-slate-700 transition-colors"
                        >
                          {isResolved ? 'View' : 'Resolve'}
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No pending conflict records found matching current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Side-by-side Conflict Resolution Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Resolve Conflict — Row {selectedRecord.excelRow} ({selectedRecord.problem})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-slate-600 rounded-md p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {resolveSuccess ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-center font-semibold">
                  {resolveSuccess}
                </div>
              ) : (
                <>
                  {/* Conflict Overview Card */}
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                    <p className="font-semibold text-slate-700">Problem Description:</p>
                    <p className="text-slate-600">{selectedRecord.requiredDecision || 'Multiple conflicting assignments exist in the authoritative workbook.'}</p>
                    <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] font-mono border-t border-slate-200">
                      <div><span className="text-slate-400">Emp Code:</span> {selectedRecord.employeeCode || 'N/A'}</div>
                      <div><span className="text-slate-400">Workstation:</span> {selectedRecord.workstation || 'N/A'}</div>
                      <div><span className="text-slate-400">Location:</span> {selectedRecord.unit} &bull; {selectedRecord.building} &bull; {selectedRecord.floor}</div>
                      <div><span className="text-slate-400">Department:</span> {selectedRecord.department || 'N/A'}</div>
                    </div>
                  </div>

                  {/* Conflicting Value Preview if available */}
                  {selectedRecord.conflictingValue && (
                    <div className="space-y-1">
                      <p className="font-semibold text-slate-700">Conflicting Value Data:</p>
                      <pre className="p-2 bg-slate-900 text-slate-100 rounded text-[11px] overflow-x-auto max-h-36">
                        {JSON.stringify(selectedRecord.conflictingValue, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Resolution Decision Selector */}
                  <div className="space-y-2 pt-2">
                    <label className="block font-semibold text-slate-800">
                      Select Client Decision:
                    </label>
                    <select
                      value={resolutionDecision}
                      onChange={(e) => setResolutionDecision(e.target.value)}
                      disabled={isReadOnly}
                      className="w-full text-xs rounded border border-slate-300 p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                    >
                      <option value="KEEP_ROW">Keep Row {selectedRecord.excelRow} (Designated Primary)</option>
                      <option value="KEEP_ALTERNATIVE">Keep Alternative Conflicting Row</option>
                      <option value="MARK_VACANT">Mark Workstation as Vacant</option>
                      <option value="DISCARD_ROW">Discard Row (Duplicate Entry)</option>
                      <option value="MANUAL_OVERRIDE">Manual Client Override Approved</option>
                    </select>
                  </div>

                  {/* Notes / Rationale */}
                  <div className="space-y-1.5">
                    <label className="block font-semibold text-slate-800">
                      Resolution Notes / Rationale:
                    </label>
                    <textarea
                      rows={3}
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      disabled={isReadOnly}
                      placeholder="Enter the justification or client approval reference..."
                      className="w-full text-xs rounded border border-slate-300 p-2 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100"
                    />
                  </div>

                  {isReadOnly && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-amber-800 text-[11px]">
                      <Info className="w-3.5 h-3.5 inline mr-1" />
                      Technical Administrators have read-only audit permissions. Resolutions must be submitted by Super Admins or assigned Unit Admins.
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 p-4 border-t border-slate-100 bg-slate-50">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-3 py-1.5 border border-slate-300 rounded text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
              {!isReadOnly && !resolveSuccess && (
                <button
                  type="button"
                  onClick={handleResolve}
                  disabled={resolving}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                >
                  {resolving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Resolution
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingCorrectionsPage;
