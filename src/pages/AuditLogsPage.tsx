import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDebounce } from '../hooks/useDebounce';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../api/client';
import { PageHeroHeader } from '../components/PageHeroHeader';
import {
  ShieldAlert,
  ShieldCheck,
  Search,
  ChevronDown,
  ChevronRight,
  GitPullRequest,
  Armchair,
  Building,
  KeyRound,
  Users,
  Layers,
  Globe,
  RefreshCw,
  Terminal,
  Lock
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  adminId: string;
  admin?: {
    id: string;
    name: string;
    email: string;
  };
  metadata?: any;
  details?: any;
  createdAt?: string;
  timestamp?: string;
}

type AuditCategory =
  | 'ALL'
  | 'AUTH'
  | 'HIERARCHY'
  | 'DEPARTMENTS'
  | 'WORKSTATIONS'
  | 'EMPLOYEES'
  | 'TRANSFER_PIPELINE';

const CATEGORY_TABS: { label: string; key: AuditCategory; icon: React.ComponentType<{ className?: string }> }[] = [
  { label: 'All Events', key: 'ALL', icon: Terminal },
  { label: 'Auth & Sessions', key: 'AUTH', icon: KeyRound },
  { label: 'Hierarchy', key: 'HIERARCHY', icon: Building },
  { label: 'Departments', key: 'DEPARTMENTS', icon: Layers },
  { label: 'Workstations', key: 'WORKSTATIONS', icon: Armchair },
  { label: 'Employees', key: 'EMPLOYEES', icon: Users },
  { label: 'Transfer Pipeline', key: 'TRANSFER_PIPELINE', icon: GitPullRequest },
];

export const AuditLogsPage: React.FC = () => {
  const { adminUser } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [selectedCategory, setSelectedCategory] = useState<AuditCategory>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN' || adminUser?.role === 'TECH_ADMIN';

  const loadLogs = async () => {
    setLoading(true);
    try {
      const url = debouncedSearch
        ? `/audit-logs?q=${encodeURIComponent(debouncedSearch)}&limit=150`
        : '/audit-logs?limit=150';
      const res = await apiRequest<{ logs?: AuditLogItem[]; data?: AuditLogItem[] }>(url);
      setLogs(res.logs || res.data || []);
    } catch (err) {
      console.error('Failed to load audit logs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) {
      loadLogs();
    }
  }, [debouncedSearch, isSuperAdmin]);

  // Client-side category categorization filter
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const act = log.action.toUpperCase();
      const ent = (log.entityType || '').toUpperCase();

      if (selectedCategory === 'AUTH') {
        return ent === 'AUTH' || ent === 'ADMINUSER' || act.includes('LOGIN') || act.includes('LOGOUT');
      }

      if (selectedCategory === 'HIERARCHY') {
        return (
          ['UNIT', 'PLANT', 'BUILDING', 'FLOOR'].includes(ent) ||
          act.startsWith('UNIT_') ||
          act.startsWith('PLANT_') ||
          act.startsWith('BUILDING_') ||
          act.startsWith('FLOOR_')
        );
      }

      if (selectedCategory === 'DEPARTMENTS') {
        return ent === 'DEPARTMENT' || act.includes('DEPT');
      }

      if (selectedCategory === 'WORKSTATIONS') {
        return ent === 'SEAT' || act.startsWith('SEAT_') || act.includes('LAYOUT');
      }

      if (selectedCategory === 'EMPLOYEES') {
        return ent === 'EMPLOYEE' || act.startsWith('EMPLOYEE_') || act.startsWith('EMP_');
      }

      if (selectedCategory === 'TRANSFER_PIPELINE') {
        return (
          ent.includes('TRANSFER') ||
          act.includes('TRANSFER') ||
          act.includes('APPROVED') ||
          act.includes('REJECTED')
        );
      }

      return true;
    });
  }, [logs, selectedCategory]);

  if (!isSuperAdmin) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-100 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Access Restricted</h1>
        <p className="text-sm text-slate-500 max-w-md mx-auto">
          Forensic audit logs are strictly confidential and restricted to <strong className="text-slate-800">SUPER_ADMIN</strong> sessions only.
        </p>
      </div>
    );
  }

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const getRoleStyle = (role?: string) => {
    switch (role) {
      case 'TECH_ADMIN':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold';
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'UNIT_ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'HOD':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'MANAGER':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getActionStyle = (action: string) => {
    if (action.includes('REJECTED') || action.includes('DELETED')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (action.includes('APPROVED') || action.includes('CREATED') || action.includes('ASSIGNED')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (action.includes('TRANSFER')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    if (action.includes('LOGIN') || action.includes('LOGOUT')) {
      return 'bg-sky-50 text-sky-700 border-sky-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="ios-page max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-5 font-sans antialiased text-slate-900">
      <PageHeroHeader
        id="audit-logs-title"
        eyebrow="System activity"
        title="Audit Logs"
        description="Review administrative actions, monitor system activity and track important changes across the workspace."
        icon={ShieldCheck}
        actions={<>
          <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-900 border border-purple-200 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase"><Lock className="w-2.5 h-2.5" /> Privileged Admin Access</span>
          <div className="flex items-center gap-2">
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={loadLogs} className="inline-flex items-center h-8 px-3 border border-slate-200 rounded-md text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 transition-all shadow-xs">
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 text-slate-400 ${loading ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              Refresh Trail
            </motion.button>
          </div>
        </>}
      />
      {/* Forensic Search & Category Pills */}
      <div className="ios-toolbar space-y-3">
        {/* Search Input */}
        <div className="relative w-full sm:w-96">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" strokeWidth={1.75} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search action, entity ID, actor email, or metadata..."
            className="w-full h-8.5 pl-8.5 pr-3 border border-slate-200 rounded-md text-xs bg-white focus:bg-white focus:outline-none focus:border-slate-400 transition-colors shadow-2xs font-mono"
          />
        </div>

        {/* Category Pills Bar */}
        <div className="flex flex-wrap items-center gap-1.5">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isSelected = selectedCategory === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setSelectedCategory(tab.key)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                  isSelected
                    ? 'bg-slate-900 text-white border-slate-900 shadow-2xs'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                <Icon className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Forensic Log Table */}
      <div className="ios-table-card bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100 text-xs">
            <thead className="bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="w-8 px-2 py-2.5"></th>
                <th className="px-3 py-2.5 text-left font-mono">Timestamp</th>
                <th className="px-3 py-2.5 text-left">Action Event</th>
                <th className="px-3 py-2.5 text-left">Entity &amp; Target ID</th>
                <th className="px-3 py-2.5 text-left">Actor Identity</th>
                <th className="px-3 py-2.5 text-left">Role</th>
                <th className="px-3 py-2.5 text-left">IP Address</th>
                <th className="px-3 py-2.5 text-left">Metadata Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 tabular-nums">
              {filteredLogs.length > 0 ? (
                filteredLogs.map((log) => {
                  const dateStr = log.createdAt || log.timestamp;
                  const dateObj = dateStr ? new Date(dateStr) : null;
                  const payload = log.metadata || log.details || {};
                  const isExpanded = expandedLogId === log.id;
                  const actorRole = payload.actorRole || 'SUPER_ADMIN';
                  const ipAddr = payload.ipAddress || '127.0.0.1';
                  const actorName = log.admin?.name || payload.actorName || log.admin?.email || 'System';

                  return (
                    <React.Fragment key={log.id}>
                      <tr
                        onClick={() => toggleExpand(log.id)}
                        className={`cursor-pointer transition-colors h-10 ${
                          isExpanded ? 'bg-purple-50/40' : 'hover:bg-slate-50/80'
                        }`}
                      >
                        <td className="px-2 py-2 text-center text-slate-400">
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5 mx-auto text-purple-600" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5 mx-auto text-slate-400" />
                          )}
                        </td>
                        <td className="px-3 py-2 text-[11px] font-mono text-slate-600 whitespace-nowrap">
                          {dateObj
                            ? dateObj.toLocaleString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })
                            : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold uppercase border ${getActionStyle(
                              log.action
                            )}`}
                          >
                            {log.action}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-800">
                          <span className="font-semibold text-slate-900">{log.entityType}</span>
                          <span className="text-slate-400 ml-1.5">
                            #{log.entityId ? log.entityId.slice(0, 8) : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-[11px] text-slate-800 font-medium">
                          <div className="flex flex-col">
                            <span>{actorName}</span>
                            {log.admin?.email && (
                              <span className="text-[10px] text-slate-400 font-mono">{log.admin.email}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-mono font-bold uppercase border ${getRoleStyle(
                              actorRole
                            )}`}
                          >
                            {actorRole}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1">
                            <Globe className="w-2.5 h-2.5 text-slate-400" />
                            {ipAddr}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-mono text-[11px] text-slate-500 max-w-xs truncate">
                          <span className="bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100 block truncate">
                            {JSON.stringify(payload)}
                          </span>
                        </td>
                      </tr>

                      {/* Expandable JSON Metadata Diff Inspector */}
                      {isExpanded && (
                        <tr className="bg-slate-50 text-slate-700">
                          <td colSpan={8} className="p-4 font-mono text-xs">
                            <div className="flex items-center justify-between pb-2 border-b border-slate-200 text-[11px] text-slate-500">
                              <span className="flex items-center gap-1.5 text-purple-400 font-semibold uppercase">
                                <Terminal className="w-3.5 h-3.5" />
                                Forensic Payload Inspector (Immutable Document ID: {log.id})
                              </span>
                              <span>Entity: {log.entityType} ({log.entityId})</span>
                            </div>
                            <pre className="mt-2.5 overflow-x-auto text-[11px] leading-relaxed text-emerald-700 bg-white p-3 rounded border border-slate-200">
                              {JSON.stringify(payload, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    {loading ? 'Querying forensic ledger...' : 'No forensic audit events matching query.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
export default AuditLogsPage;
