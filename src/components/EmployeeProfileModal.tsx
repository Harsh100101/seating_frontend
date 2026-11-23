import React, { useEffect } from 'react';
import {
  X,
  Building,
  Monitor,
  Briefcase,
  Mail,
  Phone,
  Radio,
  Pencil,
  Copy,
  Check,
  User,
  Shield,
  FileText,
  MapPin,
  CheckCircle2,
  ArrowRightLeft,
  Armchair,
  History,
  UserX,
} from 'lucide-react';
import { apiRequest } from '../api/client';

export interface EmployeeProfileData {
  id: string;
  fullName: string;
  email?: string | null;
  employeeCode: string;
  designation?: string | null;
  grade?: string | null;
  phone?: string | null;
  ext?: string | null;
  section?: string | null;
  functionName?: string | null;
  reportingManager?: string | null;
  reportingTo?: string | null;
  hod?: string | null;
  remarks?: string | null;
  pcNumber?: string | null;
  officeArea?: string | null;
  subLocation?: string | null;
  departmentId?: string;
  department?: {
    id: string;
    name: string;
    code?: string;
    colorHex: string;
    unit?: {
      id: string;
      name: string;
      code?: string;
    } | null;
  } | null;
  seat?: {
    id: string;
    label: string;
    floorId: string;
    pcNumber?: string | null;
    officeArea?: string | null;
    floor?: {
      id?: string;
      name: string;
      floorNumber?: number;
      building?: {
        id?: string;
        name: string;
        plant?: {
          id?: string;
          name: string;
          unit?: {
            id?: string;
            name: string;
          };
        };
      };
    };
  } | null;
  unit?: { id: string; name: string; code?: string };
  plant?: { id: string; name: string; code?: string };
  building?: { id: string; name: string };
  floor?: { id: string; name: string; floorNumber?: number };
  isActive?: boolean;
}

interface Props {
  employee: EmployeeProfileData | null;
  onClose: () => void;
  onEdit?: (employee: EmployeeProfileData) => void;
  onAssignSeat?: (employee: EmployeeProfileData) => void;
  onStartTransfer?: (employee: EmployeeProfileData) => void;
  onDeactivate?: (employee: EmployeeProfileData) => void;
  isReadOnly?: boolean;
}

export const EmployeeProfileModal: React.FC<Props> = ({
  employee,
  onClose,
  onEdit,
  onAssignSeat,
  onStartTransfer,
  onDeactivate,
  isReadOnly = false,
}) => {
  const [copied, setCopied] = React.useState(false);
  const [transferHistory, setTransferHistory] = React.useState<Array<{ id: string; requestNumber?: string; status?: string; createdAt?: string; sourceUnitName?: string | null; targetUnitName?: string | null }>>([]);
  const [transferHistoryLoading, setTransferHistoryLoading] = React.useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (!employee) return;
    const controller = new AbortController();
    setTransferHistoryLoading(true);
    apiRequest<Array<{ id: string; requestNumber?: string; status?: string; createdAt?: string; sourceUnitName?: string | null; targetUnitName?: string | null }>>(
      `/transfer-requests?employeeId=${encodeURIComponent(employee.id)}&limit=8`,
      { signal: controller.signal }
    )
      .then((history) => setTransferHistory(Array.isArray(history) ? history : []))
      .catch((error) => {
        if (error?.name !== 'AbortError') setTransferHistory([]);
      })
      .finally(() => setTransferHistoryLoading(false));
    return () => controller.abort();
  }, [employee?.id]);

  if (!employee) return null;

  const copyEmail = () => {
    if (employee.email) {
      navigator.clipboard.writeText(employee.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Build breadcrumb string for seat location
  const formatSeatPath = () => {
    if (!employee.seat) return null;
    const parts: string[] = [];
    const b = employee.seat.floor?.building;
    const p = b?.plant;
    const u = p?.unit;
    const uName = u?.name || employee.unit?.name;
    const bName = b?.name || employee.building?.name;
    const fName = employee.seat.floor?.name || employee.floor?.name;

    if (uName) parts.push(uName);
    if (bName) parts.push(bName);
    if (fName) parts.push(fName);
    parts.push(employee.seat.label);
    return parts.join(' › ');
  };

  const seatPath = formatSeatPath();
  const managerName = employee.reportingManager || employee.reportingTo || null;
  const initials = employee.fullName
    ? employee.fullName
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'EM';

  return (
    <div
      className="employees-profile-drawer fixed inset-0 z-[100] bg-slate-900/20 backdrop-blur-xs flex items-stretch justify-end overflow-y-auto"
      onMouseDown={onClose}
    >
      <div
        className="bg-white w-full max-w-xl min-h-full shadow-2xl border-l border-slate-200 overflow-hidden flex flex-col text-xs animate-in slide-in-from-right duration-200"
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-profile-title"
      >
        {/* ================================================================= */}
        {/* MODAL HEADER                                                      */}
        {/* ================================================================= */}
        <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-gradient-to-r from-slate-50 via-white to-slate-50">
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
              style={{
                backgroundColor: employee.department?.colorHex || '#EA580C',
              }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  id="employee-profile-title"
                  className="font-bold text-slate-900 text-base sm:text-lg leading-tight truncate"
                >
                  {employee.fullName}
                </h2>
                <span className="font-mono text-[11px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  {employee.employeeCode}
                </span>
                {employee.isActive !== false ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    Inactive
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-xs mt-0.5 font-medium truncate">
                {employee.designation || 'Corporate Employee'}
                {employee.grade && (
                  <span className="font-mono text-slate-400 ml-1.5 font-normal">
                    · Grade {employee.grade}
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors ml-2 shrink-0"
            title="Close dialog"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* MODAL CONTENT / BODY                                              */}
        {/* ================================================================= */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* 1. PHYSICAL SEATING & HARDWARE */}
          <div className="p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                <Building className="w-4 h-4 text-slate-600" />
                Physical Seating & Workstation
              </span>
              {employee.seat ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  SEATED
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-200 text-slate-600">
                  UNASSIGNED
                </span>
              )}
            </div>

            <div className="text-slate-700 text-xs">
              {employee.seat ? (
                <div className="space-y-1">
                  <div className="font-semibold text-emerald-800 text-sm flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>{seatPath}</span>
                  </div>
                  {(employee.officeArea || employee.seat.officeArea) && (
                    <p className="text-[11px] text-slate-500 pl-5">
                      Office Area:{' '}
                      <span className="font-medium text-slate-700">
                        {employee.officeArea || employee.seat.officeArea}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 italic">
                  No workstation currently allocated in facility.
                </div>
              )}
            </div>

            {/* PC Asset Tag */}
            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
              <span className="text-slate-500 text-[11px] flex items-center gap-1.5">
                <Monitor className="w-3.5 h-3.5 text-blue-500" />
                PC Asset Number:
              </span>
              <span className="font-mono font-semibold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                {employee.pcNumber || employee.seat?.pcNumber || 'Unassigned Hardware'}
              </span>
            </div>
          </div>

          {/* 2. ORGANIZATIONAL HIERARCHY */}
          <div className="border border-slate-200/90 rounded-xl p-3.5 space-y-3 bg-white">
            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Organizational Hierarchy
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                  Department
                </span>
                <span className="font-semibold text-slate-900 flex items-center gap-1.5 mt-0.5">
                  {employee.department ? (
                    <>
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: employee.department.colorHex }}
                      />
                      <span>{employee.department.name}</span>
                      {employee.department.code && (
                        <span className="text-[10px] font-mono text-slate-400">
                          ({employee.department.code})
                        </span>
                      )}
                    </>
                  ) : (
                    '—'
                  )}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                  Section
                </span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {employee.section || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                  Function
                </span>
                <span className="font-medium text-slate-800 mt-0.5 block">
                  {employee.functionName || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                  Grade / Band
                </span>
                <span className="font-mono font-semibold text-slate-800 mt-0.5 block">
                  {employee.grade || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                  Reporting Manager
                </span>
                <span className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" />
                  {managerName || '—'}
                </span>
              </div>

              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold block">
                  Department Head (HOD)
                </span>
                <span className="font-medium text-slate-800 mt-0.5 flex items-center gap-1">
                  <Shield className="w-3 h-3 text-slate-400" />
                  {employee.hod || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. DIRECT CONTACT DETAILS */}
          <div className="border border-slate-200/90 rounded-xl p-3.5 space-y-2.5 bg-white">
            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <Mail className="w-4 h-4 text-blue-600" />
              Direct Contact
            </div>

            <div className="space-y-2 text-xs divide-y divide-slate-100">
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Mail className="w-3 h-3 text-slate-400" />
                  Corporate Email:
                </span>
                {employee.email ? (
                  <div className="flex items-center gap-1.5 font-mono">
                    <a
                      href={`mailto:${employee.email}`}
                      className="text-blue-600 hover:underline font-medium"
                    >
                      {employee.email}
                    </a>
                    <button
                      type="button"
                      onClick={copyEmail}
                      className="text-slate-400 hover:text-slate-700 p-1 rounded hover:bg-slate-100"
                      title="Copy email"
                    >
                      {copied ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                ) : (
                  <span className="text-slate-400 font-mono">—</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Mobile Phone:
                </span>
                {employee.phone ? (
                  <a
                    href={`tel:${employee.phone}`}
                    className="font-mono text-slate-800 font-medium hover:text-blue-600"
                  >
                    {employee.phone}
                  </a>
                ) : (
                  <span className="text-slate-400 font-mono">—</span>
                )}
              </div>

              <div className="flex items-center justify-between pt-2">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <Radio className="w-3 h-3 text-slate-400" />
                  Intercom Extension:
                </span>
                <span className="font-mono text-slate-800 font-medium">
                  {employee.ext || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. REMARKS / NOTES */}
          {employee.remarks && (
            <div className="border border-slate-200/90 rounded-xl p-3.5 space-y-1 bg-amber-50/40">
              <span className="font-bold text-slate-700 text-[11px] flex items-center gap-1">
                <FileText className="w-3.5 h-3.5 text-amber-600" />
                Remarks & Notes
              </span>
              <p className="text-slate-600 text-xs leading-relaxed">
                {employee.remarks}
              </p>
            </div>
          )}

          {/* 5. TRANSFER HISTORY */}
          <div className="border border-slate-200/90 rounded-xl p-3.5 space-y-2.5 bg-white">
            <div className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-600" />
              Transfer history
            </div>
            {transferHistoryLoading ? (
              <div className="space-y-2" aria-label="Loading transfer history">
                <div className="h-8 animate-pulse rounded bg-slate-100" />
                <div className="h-8 animate-pulse rounded bg-slate-100" />
              </div>
            ) : transferHistory.length === 0 ? (
              <p className="text-xs text-slate-400">No transfer requests recorded for this employee.</p>
            ) : (
              <div className="space-y-2">
                {transferHistory.map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-2.5 py-2">
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-semibold text-slate-800">{transfer.requestNumber || transfer.id.slice(0, 8)}</p>
                      <p className="truncate text-[10px] text-slate-500">{transfer.sourceUnitName || 'Source'} → {transfer.targetUnitName || 'Destination'}</p>
                    </div>
                    <span className="shrink-0 text-[10px] font-semibold capitalize text-slate-600">{(transfer.status || 'unknown').replaceAll('_', ' ').toLowerCase()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* MODAL FOOTER                                                      */}
        {/* ================================================================= */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 transition-colors shadow-2xs"
          >
            Close
          </button>
          {!isReadOnly && onAssignSeat && (
            <button type="button" onClick={() => onAssignSeat(employee)} className="employees-drawer-action employees-drawer-action-secondary">
              <Armchair className="w-3.5 h-3.5" /> {employee.seat ? 'Change seat' : 'Assign seat'}
            </button>
          )}
          {!isReadOnly && onStartTransfer && (
            <button type="button" onClick={() => onStartTransfer(employee)} className="employees-drawer-action employees-drawer-action-secondary">
              <ArrowRightLeft className="w-3.5 h-3.5" /> Transfer
            </button>
          )}
          {!isReadOnly && onDeactivate && employee.isActive !== false && (
            <button type="button" onClick={() => onDeactivate(employee)} className="employees-drawer-action employees-drawer-action-danger">
              <UserX className="w-3.5 h-3.5" /> Deactivate
            </button>
          )}
          {!isReadOnly && onEdit && (
            <button
              type="button"
              onClick={() => {
                onEdit(employee);
                onClose();
              }}
              className="employees-drawer-action employees-drawer-action-primary"
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit Profile & Workstation
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
export default EmployeeProfileModal;
