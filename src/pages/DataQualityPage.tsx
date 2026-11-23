import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, RefreshCw, ShieldAlert } from 'lucide-react';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { normalizeAdminRole } from '../utils/adminRole';

type IssueRecord = { id: string; employeeCode?: string; fullName?: string; floor?: string | null; label?: string };

interface QualityReport {
  generatedAt: string;
  summary: Record<string, number>;
  issues: {
    duplicateEmployeeCodes: Array<{ employeeCode: string; records: IssueRecord[] }>;
    duplicateSeats: Array<{ key: string; label: string; floor: string | null; count: number; seatIds: string[] }>;
    missingManager: IssueRecord[];
    missingHod: IssueRecord[];
    occupiedWithoutEmployee: IssueRecord[];
    activeEmployeesWithoutSeat: IssueRecord[];
  };
}

const issueLabels: Array<{ key: keyof QualityReport['issues']; label: string; description: string }> = [
  { key: 'duplicateEmployeeCodes', label: 'Duplicate employee codes', description: 'Same employee code appears more than once.' },
  { key: 'duplicateSeats', label: 'Duplicate seats', description: 'Same floor and seat label appears more than once.' },
  { key: 'missingManager', label: 'Missing manager', description: 'Active employee has no reporting manager.' },
  { key: 'missingHod', label: 'Missing HOD', description: 'Active employee has no HOD.' },
  { key: 'occupiedWithoutEmployee', label: 'Broken occupied seats', description: 'Seat references an employee record that is not available.' },
  { key: 'activeEmployeesWithoutSeat', label: 'Active employees without seat', description: 'Active employee is currently unassigned.' },
];

export const DataQualityPage: React.FC = () => {
  const { adminUser } = useAuth();
  const role = normalizeAdminRole(adminUser?.role);
  const isUnitAdmin = role === 'UNIT_ADMIN';

  const [report, setReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      // UNIT_ADMIN scope is derived by the API from the authenticated account;
      // never trust a browser-supplied Unit identifier for this report.
      setReport(await apiRequest<QualityReport>('/reports/data-quality'));
    } catch (err: any) {
      setError(err.message || 'Data quality report could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, [adminUser?.role, adminUser?.assignedUnitId, isUnitAdmin]);

  const issueTotal = useMemo(() => {
    if (!report) return 0;
    return issueLabels.reduce((total, item) => total + (report.summary[item.key] || 0), 0);
  }, [report]);

  return (
    <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Data Quality & Conflicts</h1>
          <p className="text-xs text-slate-500 mt-1">Read-only checks for employee, seat and hierarchy consistency{isUnitAdmin ? ' in your assigned Unit' : ''}.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100/80 p-0.5 text-xs font-medium">
            <span className="px-3 py-1.5 rounded-md bg-white text-blue-700 font-bold shadow-2xs">
              Conflicts Report
            </span>
            <Link
              to="/data-quality/pending-corrections"
              className="px-3 py-1.5 rounded-md text-slate-600 hover:text-slate-900 transition-colors"
            >
              Pending Corrections Review
            </Link>
          </div>
          <button type="button" onClick={loadReport} disabled={loading} className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh report
          </button>
        </div>
      </div>

      {error && <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">{error}</div>}

      {loading && !report ? (
        <div className="rounded-lg border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Running data quality checks...</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              ['Employees', report.summary.employees],
              ['Seats', report.summary.seats],
              ['Occupied', report.summary.occupiedSeats],
              ['Vacant', report.summary.vacantSeats],
              ['Issues', issueTotal],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-slate-200 bg-white p-3 shadow-2xs">
                <p className="text-[10px] uppercase tracking-wider font-semibold text-slate-400">{label}</p>
                <p className={`mt-1 text-2xl font-bold font-mono ${label === 'Issues' && Number(value) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>{value}</p>
              </div>
            ))}
          </div>

          {issueTotal === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <CheckCircle2 className="w-5 h-5" /> No data quality conflicts found in the current scope.
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {issueLabels.map((item) => {
                const records = report.issues[item.key] as any[];
                const count = report.summary[item.key] || 0;
                return (
                  <section key={item.key} className="rounded-lg border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="flex items-start justify-between gap-3 p-4 border-b border-slate-100">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="w-4 h-4 text-rose-500 mt-0.5" />
                        <div><h2 className="text-sm font-bold text-slate-900">{item.label}</h2><p className="text-[11px] text-slate-500 mt-0.5">{item.description}</p></div>
                      </div>
                      <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-bold font-mono text-rose-700">{count}</span>
                    </div>
                    <div className="max-h-56 overflow-auto divide-y divide-slate-100">
                      {records.slice(0, 25).map((record, index) => {
                        const text = record.employeeCode || record.label || record.fullName || record.key || `Record ${index + 1}`;
                        const detail = record.fullName || (record.floor ? `Floor: ${record.floor}` : record.records?.map((entry: IssueRecord) => entry.fullName).join(', '));
                        return <div key={`${item.key}-${record.id || record.key || index}`} className="px-4 py-2 text-xs"><p className="font-semibold text-slate-800">{text}</p>{detail && <p className="text-[11px] text-slate-500 truncate">{detail}</p>}</div>;
                      })}
                      {records.length > 25 && <p className="px-4 py-2 text-[11px] text-slate-400">Showing first 25 of {records.length} records.</p>}
                    </div>
                  </section>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-slate-400">Last checked: {new Date(report.generatedAt).toLocaleString()}</p>
        </>
      ) : (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800"><AlertTriangle className="inline w-4 h-4 mr-1" /> No report data available.</div>
      )}
    </div>
  );
};
