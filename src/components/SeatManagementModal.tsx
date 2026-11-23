import { motion } from 'framer-motion';
import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../api/client';
import {
  X,
  UserCheck,
  UserX,
  UserPlus,
  Edit2,
  Trash2,
  Check,
  MapPin,
  Save,
  AlertTriangle,
  Building,
  Search,
  Plus,
  List,
} from 'lucide-react';

export interface SeatData {
  id: string;
  label: string;
  type: string;
  status: string;
  x: number;
  y: number;
  placementSource?: 'MANUAL' | 'IMPORT' | 'LEGACY_AUTO' | null;
  rotation: number;
  width?: number;
  height?: number;
  floorId: string;
  pcNumber?: string | null;
  officeArea?: string | null;
  zone?: string | null;
  remarks?: string | null;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    colorHex: string;
    code?: string;
  } | null;
  employeeId?: string | null;
  employee?: {
    id: string;
    fullName: string;
    email: string;
    employeeCode: string;
    designation?: string | null;
    departmentId?: string | null;
    section?: string | null;
    functionName?: string | null;
    reportingManager?: string | null;
    reportingTo?: string | null;
    hod?: string | null;
    ext?: string | null;
    grade?: string | null;
    isActive?: boolean | null;
  } | null;
  floor?: {
    id: string;
    name: string;
    floorNumber: number;
    building?: {
      id: string;
      name: string;
      code: string;
      plant?: {
        id: string;
        name: string;
        unit?: {
          id: string;
          name: string;
          code: string;
        };
      };
    };
  } | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
  colorHex: string;
  unitId?: string | null;
}

interface SeatManagementModalProps {
  seat: SeatData | null;
  onClose: () => void;
  onUpdated: (shouldClose?: boolean) => void;
  initialMode?: 'allocate' | 'manage';
}

interface CategorySelectorProps {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  onChange: (value: string) => void;
}

const CategorySelector: React.FC<CategorySelectorProps> = ({
  label,
  value,
  options,
  placeholder,
  onChange,
}) => {
  const [customEntry, setCustomEntry] = useState(Boolean(value && !options.includes(value)));

  const toggleMode = () => {
    setCustomEntry((current) => !current);
    onChange('');
  };

  return (
    <div className="ios-category-field">
      <div className="ios-category-label-row">
        <label>{label}</label>
        <button
          type="button"
          onClick={toggleMode}
          aria-label={customEntry ? `Use ${label} list` : `Add new ${label}`}
          title={customEntry ? `Use ${label} list` : `Add new ${label}`}
          aria-pressed={customEntry}
        >
          {customEntry ? <List aria-hidden="true" /> : <Plus aria-hidden="true" />}
        </button>
      </div>
      {customEntry ? (
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`Enter ${label.toLowerCase()}`}
          autoComplete="off"
          spellCheck={false}
        />
      ) : (
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      )}
    </div>
  );
};

const getInitials = (name?: string | null): string => {
  if (!name || typeof name !== 'string') return 'EM';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'EM';
  return parts.map((n) => n[0]).join('').slice(0, 2).toUpperCase();
};

export const SeatManagementModal: React.FC<SeatManagementModalProps> = ({
  seat,
  onClose,
  onUpdated,
  initialMode = 'manage',
}) => {
  const [activeTab, setActiveTab] = useState<'person' | 'settings'>('person');

  // Employees & departments
  const [allEmployees, setAllEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [empDeptFilter, setEmpDeptFilter] = useState('ALL');
  const [empBuildingFilter, setEmpBuildingFilter] = useState('ALL');
  const [empFloorFilter, setEmpFloorFilter] = useState('ALL');
  const [empOfficeAreaFilter, setEmpOfficeAreaFilter] = useState('ALL');
  const [empSectionFilter, setEmpSectionFilter] = useState('ALL');
  const [empFunctionFilter, setEmpFunctionFilter] = useState('ALL');
  const [empReportingToFilter, setEmpReportingToFilter] = useState('ALL');
  const [empHodFilter, setEmpHodFilter] = useState('ALL');
  const [empStatusFilter, setEmpStatusFilter] = useState<'UNSEATED' | 'ALL' | 'SEATED'>('UNSEATED');
  const [empActiveFilter, setEmpActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ACTIVE');
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Quick Add Employee Form State
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newEmpName, setNewEmpName] = useState('');
  const [newEmpCode, setNewEmpCode] = useState('');
  const [newEmpEmail, setNewEmpEmail] = useState('');
  const [newEmpDeptId, setNewEmpDeptId] = useState('');
  const [newEmpSection, setNewEmpSection] = useState('');
  const [newEmpFunction, setNewEmpFunction] = useState('');
  const [newEmpReportingTo, setNewEmpReportingTo] = useState('');
  const [newEmpHod, setNewEmpHod] = useState('');

  // Edit Employee Form State
  const [editEmpName, setEditEmpName] = useState('');
  const [editEmpEmail, setEditEmpEmail] = useState('');
  const [editEmpDeptId, setEditEmpDeptId] = useState('');
  const [isEditingEmp, setIsEditingEmp] = useState(false);

  // Seat Edit Form State
  const [seatLabel, setSeatLabel] = useState(seat?.label || '');
  const [seatType, setSeatType] = useState(seat?.type || 'STANDARD_DESK');
  const [seatStatus, setSeatStatus] = useState(seat?.status || 'AVAILABLE');
  const [seatDeptId, setSeatDeptId] = useState(seat?.departmentId || '');
  const [seatOfficeArea, setSeatOfficeArea] = useState(seat?.officeArea || '');
  const [seatPcNumber, setSeatPcNumber] = useState(seat?.pcNumber || '');

  // Sync state when seat changes
  useEffect(() => {
    if (seat) {
      if (initialMode === 'allocate') {
        setActiveTab('person');
      }
      setSeatLabel(seat.label ?? '');
      setSeatType(seat.type ?? 'STANDARD_DESK');
      setSeatStatus(seat.status ?? 'AVAILABLE');
      setSeatDeptId(seat.departmentId ?? '');
      setSeatOfficeArea(seat.officeArea ?? '');
      setSeatPcNumber(seat.pcNumber ?? '');
      setFeedbackMsg(null);
      setShowQuickAdd(false);
      setIsEditingEmp(false);
      setEmpDeptFilter('ALL');
      setEmpBuildingFilter('ALL');
      setEmpFloorFilter('ALL');
      setEmpOfficeAreaFilter('ALL');
      setEmpSectionFilter('ALL');
      setEmpFunctionFilter('ALL');
      setEmpReportingToFilter('ALL');
      setEmpHodFilter('ALL');
      setEmpStatusFilter('UNSEATED');
      setEmpActiveFilter('ACTIVE');
      setSearchFilter('');
      setNewEmpDeptId('');

      if (seat.employee) {
        setEditEmpName(seat.employee.fullName ?? '');
        setEditEmpEmail(seat.employee.email ?? '');
        setEditEmpDeptId(seat.departmentId ?? '');
      }

      // Fetch employees for this seat's unit
      const seatUnitId = seat.floor?.building?.plant?.unit?.id;
      const empUrl = `/employees?limit=2000${seatUnitId ? `&unitId=${seatUnitId}` : ''}`;
      apiRequest<any>(empUrl)
        .then((res) => {
          const list = res?.data || res?.employees || (Array.isArray(res) ? res : []);
          setAllEmployees(list);
          const unassigned = list.filter((e: any) => !e.seat || e.seat?.id === seat.id);
          if (unassigned.length > 0) {
            setSelectedEmpId(unassigned[0].id);
          } else if (list.length > 0) {
            setSelectedEmpId(list[0].id);
          }
        })
        .catch(console.error);

      // Fetch departments
      apiRequest<Department[]>(`/departments${seatUnitId ? `?unitId=${seatUnitId}` : ''}`)
        .then((res) => {
          const depts = res || [];
          setDepartments(depts);
        })
        .catch(console.error);
    }
  }, [seat, initialMode]);

  if (!seat) return null;

  const showNotify = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 1. Confirm & Allocate Workstation (Assign Existing Employee or Relocate Seated Employee)
  const handleAssignExisting = async () => {
    if (!selectedEmpId || !seat) return;
    setLoading(true);
    try {
      const targetEmp = allEmployees.find((e) => e.id === selectedEmpId);
      if (targetEmp?.seat?.id && targetEmp.seat.id !== seat.id) {
        // Direct relocation of already-seated employee
        await apiRequest(`/seats/${targetEmp.seat.id}/transfer`, {
          method: 'POST',
          body: JSON.stringify({ targetSeatId: seat.id }),
        });
        showNotify(`Relocated ${targetEmp.fullName} to ${seat.label}!`);
      } else {
        await apiRequest(`/seats/${seat.id}/assign`, {
          method: 'POST',
          body: JSON.stringify({ employeeId: selectedEmpId }),
        });
        showNotify(`Workstation ${seat.label} allocated to ${targetEmp?.fullName || 'employee'}!`);
      }
      onUpdated(true);
    } catch (err: any) {
      showNotify(err.message || 'Failed to assign employee', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 2. Quickly create and assign a new employee
  const handleQuickCreateAndAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmpName.trim() || !newEmpCode.trim() || !newEmpDeptId) {
      showNotify('Full Name, Employee Code, and Department are required', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await apiRequest<any>(`/seats/${seat.id}/quick-assign`, {
        method: 'POST',
        body: JSON.stringify({
          fullName: newEmpName.trim(),
          employeeCode: newEmpCode.trim().toUpperCase(),
          email: newEmpEmail.trim() || undefined,
          departmentId: newEmpDeptId,
          section: newEmpSection.trim() || undefined,
          functionName: newEmpFunction.trim() || undefined,
          reportingTo: newEmpReportingTo.trim() || undefined,
          hod: newEmpHod.trim() || undefined,
        }),
      });

      showNotify(`Employee ${res.employee?.fullName || newEmpName} created and assigned to ${seat.label}!`);
      setShowQuickAdd(false);
      setNewEmpName('');
      setNewEmpCode('');
      setNewEmpEmail('');
      setNewEmpDeptId('');
      setNewEmpSection('');
      setNewEmpFunction('');
      setNewEmpReportingTo('');
      setNewEmpHod('');
      onUpdated(true);
    } catch (err: any) {
      showNotify(err.message || 'Failed to create & assign employee', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 3. Unassign or remove an employee
  const handleUnassignEmployee = async () => {
    const occupantName = seat.employee?.fullName || 'employee';
    if (!window.confirm(`Are you sure you want to remove ${occupantName} from ${seat.label}?`)) {
      return;
    }
    setLoading(true);
    try {
      await apiRequest(`/seats/${seat.id}/unassign`, {
        method: 'POST',
      });
      showNotify('Employee removed. Seat is now vacant.');
      onUpdated(true);
    } catch (err: any) {
      showNotify(err.message || 'Failed to remove employee', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 4. Edit employee details
  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!seat.employee) return;
    setLoading(true);
    try {
      await apiRequest(`/employees/${seat.employee.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fullName: editEmpName.trim(),
          email: editEmpEmail.trim() || undefined,
          departmentId: editEmpDeptId || undefined,
        }),
      });
      showNotify('Employee details updated successfully!');
      setIsEditingEmp(false);
      onUpdated(false);
    } catch (err: any) {
      showNotify(err.message || 'Failed to update employee', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 5. Update Seat Metadata
  const handleUpdateSeatInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiRequest(`/seats/${seat.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          label: seatLabel.trim(),
          type: seatType,
          status: seatStatus,
          departmentId: seatDeptId || null,
          officeArea: seatOfficeArea.trim() || null,
          pcNumber: seatPcNumber.trim() || null,
        }),
      });
      showNotify('Seat configuration updated!');
      onUpdated(false);
    } catch (err: any) {
      showNotify(err.message || 'Failed to update seat info', 'error');
    } finally {
      setLoading(false);
    }
  };

  // 8. Delete Seat from Floor Plan
  const handleDeleteSeat = async () => {
    if (!window.confirm(`Permanently delete workstation "${seat.label}" from floor plan?`)) {
      return;
    }
    setLoading(true);
    try {
      await apiRequest(`/seats/${seat.id}`, { method: 'DELETE' });
      showNotify('Workstation deleted from floor plan.');
      onUpdated(true);
      onClose();
    } catch (err: any) {
      showNotify(err.message || 'Failed to delete workstation', 'error');
    } finally {
      setLoading(false);
    }
  };

  const uniqueEmployees = useMemo(() => {
    const seen = new Set<string>();
    return allEmployees.filter((employee) => {
      if (!employee) return false;
      const code = String(employee.employeeCode || '').trim().toLowerCase();
      const key = code ? `code:${code}` : `id:${employee.id}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [allEmployees]);

  const employeeFilterOptions = useMemo(() => {
    const distinct = (getValue: (employee: any) => unknown) => Array.from(
      new Set(
        uniqueEmployees
          .map((employee) => String(getValue(employee) || '').trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b));

    const departmentMap = new Map<string, string>();
    uniqueEmployees.forEach((employee) => {
      const id = employee.department?.id || employee.departmentId;
      const name = String(employee.department?.name || '').trim();
      if (id && name) departmentMap.set(id, name);
    });

    return {
      departments: Array.from(departmentMap, ([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      buildings: distinct((employee) => employee.building?.name || employee.seat?.floor?.building?.name),
      floors: distinct((employee) => employee.floor?.name || employee.seat?.floor?.name),
      officeAreas: distinct((employee) => employee.officeArea || employee.seat?.officeArea),
      sections: distinct((employee) => employee.section),
      functions: distinct((employee) => employee.functionName),
      reportingTo: distinct((employee) => employee.reportingTo || employee.reportingManager),
      hods: distinct((employee) => employee.hod),
    };
  }, [uniqueEmployees]);

  const newEmployeeCategoryOptions = useMemo(() => {
    const pool = newEmpDeptId
      ? uniqueEmployees.filter((employee) => (employee.department?.id || employee.departmentId) === newEmpDeptId)
      : uniqueEmployees;
    const distinct = (getValue: (employee: any) => unknown) => Array.from(
      new Set(pool.map((employee) => String(getValue(employee) || '').trim()).filter(Boolean)),
    ).sort((a, b) => a.localeCompare(b));

    return {
      sections: distinct((employee) => employee.section),
      functions: distinct((employee) => employee.functionName),
      reportingTo: distinct((employee) => employee.reportingTo || employee.reportingManager),
      hods: distinct((employee) => employee.hod),
    };
  }, [uniqueEmployees, newEmpDeptId]);

  const resetEmployeeFilters = () => {
    setEmpDeptFilter('ALL');
    setEmpBuildingFilter('ALL');
    setEmpFloorFilter('ALL');
    setEmpOfficeAreaFilter('ALL');
    setEmpSectionFilter('ALL');
    setEmpFunctionFilter('ALL');
    setEmpReportingToFilter('ALL');
    setEmpHodFilter('ALL');
    setEmpStatusFilter('UNSEATED');
    setEmpActiveFilter('ACTIVE');
    setSearchFilter('');
  };

  // Match the Employees directory filters while remaining scoped to this workstation's unit.
  const filteredEmployees = useMemo(() => {
    return uniqueEmployees.filter((e) => {
      if (!e) return false;
      if (empStatusFilter === 'UNSEATED' && e.seat && e.seat.id !== seat.id) return false;
      if (empStatusFilter === 'SEATED' && !e.seat) return false;
      if (empDeptFilter !== 'ALL' && e.departmentId !== empDeptFilter && e.department?.id !== empDeptFilter) return false;
      if (empBuildingFilter !== 'ALL' && (e.building?.name || e.seat?.floor?.building?.name || '') !== empBuildingFilter) return false;
      if (empFloorFilter !== 'ALL' && (e.floor?.name || e.seat?.floor?.name || '') !== empFloorFilter) return false;
      if (empOfficeAreaFilter !== 'ALL' && (e.officeArea || e.seat?.officeArea || '') !== empOfficeAreaFilter) return false;
      if (empSectionFilter !== 'ALL' && (e.section || '') !== empSectionFilter) return false;
      if (empFunctionFilter !== 'ALL' && (e.functionName || '') !== empFunctionFilter) return false;
      if (empReportingToFilter !== 'ALL' && (e.reportingTo || e.reportingManager || '') !== empReportingToFilter) return false;
      if (empHodFilter !== 'ALL' && (e.hod || '') !== empHodFilter) return false;
      if (empActiveFilter === 'ACTIVE' && e.isActive === false) return false;
      if (empActiveFilter === 'INACTIVE' && e.isActive !== false) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase().trim();
        const searchable = [
          e.fullName,
          e.employeeCode,
          e.email,
          e.designation,
          e.department?.name,
          e.section,
          e.functionName,
          e.reportingTo || e.reportingManager,
          e.hod,
          e.officeArea || e.seat?.officeArea,
          e.building?.name || e.seat?.floor?.building?.name,
          e.floor?.name || e.seat?.floor?.name,
        ].some((value) => String(value || '').toLowerCase().includes(q));
        if (!searchable) return false;
      }
      return true;
    });
  }, [uniqueEmployees, empStatusFilter, empDeptFilter, empBuildingFilter, empFloorFilter, empOfficeAreaFilter, empSectionFilter, empFunctionFilter, empReportingToFilter, empHodFilter, empActiveFilter, searchFilter, seat?.id]);

  useEffect(() => {
    if (filteredEmployees.length > 0) {
      if (!filteredEmployees.some((e) => e.id === selectedEmpId)) {
        setSelectedEmpId(filteredEmployees[0].id);
      }
    } else {
      setSelectedEmpId('');
    }
  }, [filteredEmployees, selectedEmpId]);

  const selectedEmployee = useMemo(
    () => uniqueEmployees.find((employee) => employee.id === selectedEmpId) || null,
    [uniqueEmployees, selectedEmpId],
  );

  const seatLocationPath = useMemo(() => {
    if (!seat) return '';
    const parts: string[] = [];
    const b = seat.floor?.building;
    const u = b?.plant?.unit;
    if (u?.name) parts.push(u.name);
    if (b?.name) parts.push(b.name);
    if (seat.floor?.name) parts.push(`${seat.floor.name}${seat.floor.floorNumber ? ` (L${seat.floor.floorNumber})` : ''}`);
    return parts.join(' › ');
  }, [seat]);

  const displayShortLabel = (seat.label || 'WS').replace('WS-', '').replace('CABIN-', 'C');

  return (
    <div
      onClick={onClose}
      className="ios-seat-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm font-sans antialiased"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.32, ease: [0.25, 0.1, 0.25, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="ios-seat-dialog relative w-full max-w-[600px] bg-slate-900 border border-slate-800 rounded-[20px] shadow-2xl overflow-hidden flex flex-col max-h-[84vh] text-slate-100"
      >
        {/* Properties Inspector Header */}
        <div className="ios-seat-header px-4 py-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="ios-seat-avatar w-10 h-10 rounded-[12px] flex items-center justify-center font-semibold text-xs text-white border border-slate-700/80 shadow-xs"
              style={{
                backgroundColor: seat.department?.colorHex || '#ea580c',
              }}
            >
              {displayShortLabel}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-semibold text-white tracking-tight">{seat.label || 'Workstation'}</h2>
                <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-sm bg-slate-800 text-slate-300 border border-slate-700">
                  {seat.type}
                </span>
                <span
                  className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded-sm border ${
                    seat.status === 'AVAILABLE'
                      ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/50'
                      : seat.status === 'MAINTENANCE'
                      ? 'bg-amber-950/50 text-amber-400 border-amber-800/50'
                      : 'bg-red-950/50 text-red-400 border-red-800/50'
                  }`}
                >
                  {seat.status}
                </span>
              </div>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="flex items-center space-x-1">
                  <MapPin className="w-3 h-3 text-orange-400" strokeWidth={1.75} />
                  <span>{seat.officeArea || 'Main Workstation Bay'}</span>
                </span>
                {seat.pcNumber && (
                  <span className="text-cyan-400 font-mono">• PC: {seat.pcNumber}</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="ios-seat-close w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            aria-label="Close workstation inspector"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Feedback Alert */}
        {feedbackMsg && (
          <div
            className={`ios-seat-feedback px-4 py-2.5 text-xs flex items-center justify-between border-b ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40'
                : 'bg-red-950/40 text-red-300 border-red-800/40'
            }`}
          >
            <span className="flex items-center">
              {feedbackMsg.type === 'success' ? (
                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" strokeWidth={1.75} />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-red-400" strokeWidth={1.75} />
              )}
              {feedbackMsg.text}
            </span>
          </div>
        )}

        {/* Linear-Style Segmented Navigation Tab Switcher */}
        <div className="ios-seat-tabs-wrap px-4 py-2 border-b border-slate-800 bg-slate-900/50">
          <div className="ios-seat-tabs grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-[12px] border border-slate-800/80">
            <button
              type="button"
              onClick={() => setActiveTab('person')}
              className={`ios-seat-tab ${activeTab === 'person' ? 'is-active' : ''}`}
            >
              <UserCheck className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Person & Staff</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className={`ios-seat-tab ${activeTab === 'settings' ? 'is-active' : ''}`}
            >
              <Edit2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Desk Settings</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="ios-seat-body p-4 flex-1 overflow-y-auto space-y-3 text-slate-200 text-xs">
          {/* TAB 1: PERSON & STAFF (ADD / EDIT / UNASSIGN) */}
          {activeTab === 'person' && (
            <div className="space-y-4">
              {seat.employee ? (
                /* CURRENT OCCUPANT SECTION */
                <div className="bg-slate-950 border border-slate-800 rounded-md p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400 flex items-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5" />
                      Occupied Workstation
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsEditingEmp(!isEditingEmp)}
                      className="text-xs text-orange-400 hover:text-orange-300 font-medium flex items-center transition-colors"
                    >
                      <Edit2 className="w-3 h-3 mr-1" strokeWidth={1.75} />
                      {isEditingEmp ? 'Cancel' : 'Edit Employee'}
                    </button>
                  </div>

                  {!isEditingEmp ? (
                    /* Occupant Profile View */
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-900 rounded-md border border-slate-800">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center font-mono font-bold text-slate-200 text-xs shrink-0">
                          {getInitials(seat.employee.fullName)}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-white tracking-tight">
                            {seat.employee.fullName || 'Unnamed Employee'}
                          </h4>
                          <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-0.5">
                            <span className="font-mono text-orange-400 font-medium">
                              {seat.employee.employeeCode || 'NO-CODE'}
                            </span>
                            <span>•</span>
                            <span className="text-slate-300">{seat.employee.email || 'No email registered'}</span>
                          </div>
                          {seat.department && (
                            <div className="mt-1 flex items-center text-[11px]">
                              <span
                                className="w-1.5 h-1.5 rounded-full mr-1.5"
                                style={{ backgroundColor: seat.department.colorHex || '#ea580c' }}
                              />
                              <span className="text-slate-400">{seat.department.name}</span>
                            </div>
                          )}
                          {/* Industrial Factory Attributes */}
                          <div className="mt-1.5 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-slate-400 font-mono">
                            {seat.employee.section && (
                              <span>Sec: <strong className="text-slate-300">{seat.employee.section}</strong></span>
                            )}
                            {seat.employee.functionName && (
                              <span>• Fn: <strong className="text-slate-300">{seat.employee.functionName}</strong></span>
                            )}
                            {(seat.employee.reportingTo || seat.employee.reportingManager) && (
                              <span>• Rep: <strong className="text-slate-300">{seat.employee.reportingTo || seat.employee.reportingManager}</strong></span>
                            )}
                            {seat.employee.hod && (
                              <span>• HOD: <strong className="text-slate-300">{seat.employee.hod}</strong></span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={handleUnassignEmployee}
                        disabled={loading}
                        className="inline-flex items-center justify-center h-8 px-2.5 bg-red-950/40 hover:bg-red-900/50 text-red-300 border border-red-800/60 rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                      >
                        <UserX className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                        Release Desk
                      </button>
                    </div>
                  ) : (
                    /* Edit Employee Details Form */
                    <form onSubmit={handleUpdateEmployee} className="space-y-2.5 p-3 bg-slate-900 rounded-md border border-slate-800">
                      <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                        Edit Occupant Details
                      </h4>
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">Full Name</label>
                        <input
                          type="text"
                          value={editEmpName}
                          onChange={(e) => setEditEmpName(e.target.value)}
                          required
                          className="w-full h-8 bg-slate-950 border border-slate-800 rounded-md px-2.5 text-xs text-white focus:outline-none focus:border-slate-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">Email</label>
                        <input
                          type="email"
                          value={editEmpEmail}
                          onChange={(e) => setEditEmpEmail(e.target.value)}
                          className="w-full h-8 bg-slate-950 border border-slate-800 rounded-md px-2.5 text-xs text-white focus:outline-none focus:border-slate-600"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-medium text-slate-400 block mb-1">Department</label>
                        <select
                          value={editEmpDeptId}
                          onChange={(e) => setEditEmpDeptId(e.target.value)}
                          className="w-full h-8 bg-slate-950 border border-slate-800 rounded-md px-2 text-xs text-white focus:outline-none focus:border-slate-600"
                        >
                          {departments.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="flex justify-end space-x-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setIsEditingEmp(false)}
                          className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md text-xs font-medium"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={loading}
                          className="h-8 px-3 bg-orange-600 hover:bg-orange-500 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                        >
                          Save Changes
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              ) : (
                /* VACANT SEAT - ASSIGN OR CREATE NEW EMPLOYEE */
                <div className="space-y-3">
                  {/* Selected Seat Summary Banner */}
                  <div className="ios-seat-summary p-3 bg-slate-950 border border-slate-800 rounded-md space-y-1.5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-sm font-bold text-white">{seat.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {seat.type ? seat.type.replace(/_/g, ' ') : 'Standard Desk'}
                        </span>
                        {seat.pcNumber && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-800/60">
                            PC: {seat.pcNumber}
                          </span>
                        )}
                      </div>
                      <span className="ios-seat-available px-2.5 py-1 bg-emerald-950/50 text-emerald-400 text-[11px] font-semibold rounded-full border border-emerald-800/50">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Available · Ready to allocate
                      </span>
                    </div>
                    {seatLocationPath && (
                      <p className="text-[11px] font-mono text-amber-400/90 flex items-center space-x-1">
                        <Building className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{seatLocationPath}</span>
                      </p>
                    )}
                    <div className="flex items-center space-x-3 text-[11px] text-slate-400 font-mono">
                      <span>Area / Zone: <strong className="text-slate-200">{seat.officeArea || seat.zone || 'General Bay'}</strong></span>
                      {seat.department?.name && (
                        <span>Dept: <strong className="text-slate-200">{seat.department.name}</strong></span>
                      )}
                    </div>
                  </div>

                  {/* Mode Selector: Existing vs Quick-Add */}
                  <div className="ios-seat-mode-grid grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(false)}
                      className={`ios-seat-mode-card ${!showQuickAdd ? 'is-active' : ''}`}
                    >
                      <UserCheck className="w-4 h-4 text-emerald-400 mb-1" strokeWidth={1.75} />
                      <div className="text-xs font-semibold">Assign Existing Employee</div>
                      <div className="text-[10px] text-slate-500">From unit roster / relocation</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowQuickAdd(true)}
                      className={`ios-seat-mode-card ${showQuickAdd ? 'is-active' : ''}`}
                    >
                      <UserPlus className="w-4 h-4 text-amber-400 mb-1" strokeWidth={1.75} />
                      <div className="text-xs font-semibold">Quick Register New</div>
                      <div className="text-[10px] text-slate-500">Atomic create &amp; assign</div>
                    </button>
                  </div>

                  {/* Option 1: Smart Employee Picker */}
                  {!showQuickAdd ? (
                    <div className="ios-seat-panel bg-slate-950 border border-slate-800 rounded-md p-3 space-y-2.5">
                      <div className="flex items-center justify-between gap-3">
                        <label className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                          Smart Employee Picker
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono text-slate-500">
                            {filteredEmployees.length} matching / {uniqueEmployees.length} total
                          </span>
                          <button type="button" onClick={resetEmployeeFilters} className="ios-filter-reset text-[10px] font-semibold">
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Primary filters */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-1">
                            Department
                          </label>
                          <select
                            value={empDeptFilter}
                            onChange={(e) => setEmpDeptFilter(e.target.value)}
                            className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2 text-xs text-white focus:outline-none focus:border-slate-600"
                          >
                            <option value="ALL">All Departments ({employeeFilterOptions.departments.length})</option>
                            {employeeFilterOptions.departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-[10px] font-mono text-slate-400 block mb-1">
                            Seating Status
                          </label>
                          <select
                            value={empStatusFilter}
                            onChange={(e) => setEmpStatusFilter(e.target.value as any)}
                            className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2 text-xs text-white focus:outline-none focus:border-slate-600 font-mono"
                          >
                            <option value="UNSEATED">Unassigned / Unseated (Default)</option>
                            <option value="ALL">All Employees (Include Seated)</option>
                            <option value="SEATED">Already Seated (Relocation)</option>
                          </select>
                        </div>
                      </div>

                      <details className="ios-employee-filters">
                        <summary>More filters</summary>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                          <label>
                            Building
                            <select value={empBuildingFilter} onChange={(e) => setEmpBuildingFilter(e.target.value)}>
                              <option value="ALL">All Buildings</option>
                              {employeeFilterOptions.buildings.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label>
                            Floor
                            <select value={empFloorFilter} onChange={(e) => setEmpFloorFilter(e.target.value)}>
                              <option value="ALL">All Floors</option>
                              {employeeFilterOptions.floors.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label>
                            Office / Area
                            <select value={empOfficeAreaFilter} onChange={(e) => setEmpOfficeAreaFilter(e.target.value)}>
                              <option value="ALL">All Office Areas</option>
                              {employeeFilterOptions.officeAreas.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label>
                            Section
                            <select value={empSectionFilter} onChange={(e) => setEmpSectionFilter(e.target.value)}>
                              <option value="ALL">All Sections</option>
                              {employeeFilterOptions.sections.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label>
                            Function
                            <select value={empFunctionFilter} onChange={(e) => setEmpFunctionFilter(e.target.value)}>
                              <option value="ALL">All Functions</option>
                              {employeeFilterOptions.functions.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label>
                            Reporting To
                            <select value={empReportingToFilter} onChange={(e) => setEmpReportingToFilter(e.target.value)}>
                              <option value="ALL">All Reporting Managers</option>
                              {employeeFilterOptions.reportingTo.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label>
                            HOD
                            <select value={empHodFilter} onChange={(e) => setEmpHodFilter(e.target.value)}>
                              <option value="ALL">All HODs</option>
                              {employeeFilterOptions.hods.map((value) => <option key={value} value={value}>{value}</option>)}
                            </select>
                          </label>
                          <label>
                            Active Status
                            <select value={empActiveFilter} onChange={(e) => setEmpActiveFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}>
                              <option value="ACTIVE">Active Employees (Default)</option>
                              <option value="ALL">All Employment Statuses</option>
                              <option value="INACTIVE">Inactive Employees</option>
                            </select>
                          </label>
                        </div>
                      </details>

                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search name, employee code, email, department, manager..."
                          value={searchFilter}
                          onChange={(e) => setSearchFilter(e.target.value)}
                          className="w-full h-8 pl-8 pr-2.5 bg-slate-900 border border-slate-800 rounded-md text-xs text-white focus:outline-none focus:border-slate-600"
                        />
                      </div>

                      <select
                        value={selectedEmpId}
                        onChange={(e) => setSelectedEmpId(e.target.value)}
                        className="w-full h-9 bg-slate-900 border border-slate-800 rounded-md px-2 text-xs text-white focus:outline-none focus:border-slate-600 font-mono"
                      >
                        {filteredEmployees.length > 0 ? (
                          filteredEmployees.map((emp) => {
                            const isSeated = Boolean(emp.seat);
                            return (
                              <option key={emp.id} value={emp.id}>
                                {emp.fullName || 'Unnamed'} ({emp.employeeCode || 'NO-CODE'}) — {emp.department?.name || 'Department not set'}
                                {isSeated ? ` [Currently at: ${emp.seat.label}]` : ' [UNASSIGNED]'}
                              </option>
                            );
                          })
                        ) : (
                          <option value="">No matching employees found</option>
                        )}
                      </select>

                      {selectedEmployee && (
                        <div className="ios-employee-verification">
                          <div className="min-w-0">
                            <strong>{selectedEmployee.fullName || 'Unnamed employee'}</strong>
                            <span>{selectedEmployee.employeeCode || 'Employee code not set'}</span>
                          </div>
                          <div className="min-w-0 text-right">
                            <strong>{selectedEmployee.department?.name || 'Department not set'}</strong>
                            <span>
                              {[selectedEmployee.section, selectedEmployee.functionName].filter(Boolean).join(' · ') || 'Section / function not set'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Selected employee info / relocation alert */}
                      {selectedEmployee?.seat && (
                        <div className="p-2 rounded bg-amber-950/40 border border-amber-800/40 text-[11px] text-amber-300 font-mono flex items-center space-x-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>
                            Direct Relocation: <strong>{selectedEmployee.fullName}</strong> will be moved from current desk <strong>{selectedEmployee.seat.label}</strong> to <strong>{seat.label}</strong>.
                          </span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={handleAssignExisting}
                        disabled={loading || !selectedEmpId}
                        className="ios-seat-primary w-full h-10 flex items-center justify-center px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-[11px] text-sm shadow-md transition-colors disabled:opacity-50"
                      >
                        <UserCheck className="w-4 h-4 mr-1.5" strokeWidth={2} />
                        <span>Confirm &amp; Allocate Workstation</span>
                      </button>
                    </div>
                  ) : (
                    /* Option 2: Quick-Add New Person Form */
                    <form onSubmit={handleQuickCreateAndAssign} className="ios-seat-panel bg-slate-950 border border-slate-800 rounded-md p-3 space-y-2.5">
                      <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-emerald-400 flex items-center">
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                        Atomic Quick Register & Assign
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">
                            Full Name *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Ramesh Chandra"
                            value={newEmpName}
                            onChange={(e) => setNewEmpName(e.target.value)}
                            required
                            className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2.5 text-xs text-white focus:outline-none focus:border-slate-600"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">
                            Employee Code *
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. EMP-1042"
                            value={newEmpCode}
                            onChange={(e) => setNewEmpCode(e.target.value)}
                            required
                            className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2.5 text-xs text-white focus:outline-none focus:border-slate-600 uppercase font-mono"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">
                            Email
                          </label>
                          <input
                            type="email"
                            placeholder="user@shaktiman.com"
                            value={newEmpEmail}
                            onChange={(e) => setNewEmpEmail(e.target.value)}
                            className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2.5 text-xs text-white focus:outline-none focus:border-slate-600"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-medium text-slate-400 block mb-1">
                            Department *
                          </label>
                          <select
                            value={newEmpDeptId}
                            onChange={(e) => {
                              setNewEmpDeptId(e.target.value);
                              setNewEmpSection('');
                              setNewEmpFunction('');
                              setNewEmpReportingTo('');
                              setNewEmpHod('');
                            }}
                            required
                            className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2 text-xs text-white focus:outline-none focus:border-slate-600"
                          >
                            <option value="" disabled>Select Department</option>
                            {departments.map((d) => (
                              <option key={d.id} value={d.id}>
                                {d.name} ({d.code})
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-500">
                        Choose from the unit list, or use New to enter another value.
                      </p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <CategorySelector
                          label="Section"
                          value={newEmpSection}
                          options={newEmployeeCategoryOptions.sections}
                          placeholder="Select Section"
                          onChange={setNewEmpSection}
                        />
                        <CategorySelector
                          label="Function"
                          value={newEmpFunction}
                          options={newEmployeeCategoryOptions.functions}
                          placeholder="Select Function"
                          onChange={setNewEmpFunction}
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <CategorySelector
                          label="Reporting To"
                          value={newEmpReportingTo}
                          options={newEmployeeCategoryOptions.reportingTo}
                          placeholder="Select Reporting Manager"
                          onChange={setNewEmpReportingTo}
                        />
                        <CategorySelector
                          label="HOD"
                          value={newEmpHod}
                          options={newEmployeeCategoryOptions.hods}
                          placeholder="Select HOD"
                          onChange={setNewEmpHod}
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-8 flex items-center justify-center px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50 mt-1"
                      >
                        <UserPlus className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                        Register & Assign to {seat.label}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: DESK SETTINGS & DELETE */}
          {activeTab === 'settings' && (
            <div className="space-y-4">
              <form onSubmit={handleUpdateSeatInfo} className="ios-seat-panel bg-slate-950 border border-slate-800 rounded-md p-3 space-y-3">
                <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                  Workstation Configuration
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Desk Label
                    </label>
                    <input
                      type="text"
                      value={seatLabel}
                      onChange={(e) => setSeatLabel(e.target.value)}
                      required
                      className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2.5 text-xs text-white font-mono focus:outline-none focus:border-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Desk Type
                    </label>
                    <select
                      value={seatType}
                      onChange={(e) => setSeatType(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2 text-xs text-white focus:outline-none focus:border-slate-600"
                    >
                      <option value="STANDARD_DESK">Standard Desk (Open Bay)</option>
                      <option value="CABIN">Executive Cabin (Glass Office)</option>
                      <option value="CUBICLE">Cubicle Pod</option>
                      <option value="STANDING_DESK">Ergonomic Standing Desk</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Availability Status
                    </label>
                    <select
                      value={seatStatus}
                      onChange={(e) => setSeatStatus(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2 text-xs text-white focus:outline-none focus:border-slate-600"
                    >
                      <option value="AVAILABLE">AVAILABLE (Active for Seating)</option>
                      <option value="MAINTENANCE">MAINTENANCE (Hardware/IT Repair)</option>
                      <option value="RESERVED">RESERVED (VIP / Reserved Bay)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Allocated Department
                    </label>
                    <select
                      value={seatDeptId}
                      onChange={(e) => setSeatDeptId(e.target.value)}
                      className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2 text-xs text-white focus:outline-none focus:border-slate-600"
                    >
                      <option value="">All Departments (Flexible)</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      Seating Area / Zone
                    </label>
                    <input
                      type="text"
                      value={seatOfficeArea}
                      onChange={(e) => setSeatOfficeArea(e.target.value)}
                      placeholder="e.g. South Bay 1 - Engineering"
                      className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2.5 text-xs text-white focus:outline-none focus:border-slate-600"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-slate-400 block mb-1">
                      PC Number / Hardware Asset
                    </label>
                    <input
                      type="text"
                      value={seatPcNumber}
                      onChange={(e) => setSeatPcNumber(e.target.value)}
                      placeholder="e.g. PC-ENG-204"
                      className="w-full h-8 bg-slate-900 border border-slate-800 rounded-md px-2.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-slate-600"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full h-8 flex items-center justify-center px-3 bg-orange-600 hover:bg-orange-500 text-white rounded-md text-xs font-medium transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                  Update Workstation Properties
                </button>
              </form>

              {/* DANGER ZONE: DELETE WORKSTATION */}
              <div className="bg-red-950/20 border border-red-900/40 rounded-md p-3 space-y-2">
                <h4 className="text-[10px] font-mono font-semibold uppercase tracking-wider text-red-400 flex items-center">
                  <Trash2 className="w-3 h-3 mr-1.5" strokeWidth={1.75} />
                  Danger Zone
                </h4>
                <p className="text-[11px] text-slate-400">
                  Permanently remove workstation <strong className="text-white font-mono">{seat.label}</strong> from floor plan.
                </p>
                <button
                  type="button"
                  onClick={handleDeleteSeat}
                  disabled={loading}
                  className="h-8 px-3 bg-red-900/40 hover:bg-red-800/60 text-red-300 border border-red-700/60 rounded-md text-xs font-medium transition-colors disabled:opacity-50 flex items-center"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.75} />
                  Delete Workstation
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
