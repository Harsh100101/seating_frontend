import React, { useState, useEffect } from 'react';
import { apiRequest } from '../api/client';
import {
  X,
  UserCheck,
  UserX,
  Search,
  AlertTriangle,
  Lock,
} from 'lucide-react';

interface SeatData {
  id: string;
  label: string;
  type: string;
  status: string;
  x: number;
  y: number;
  rotation: number;
  floorId: string;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    colorHex: string;
  } | null;
  employeeId?: string | null;
  employee?: {
    id: string;
    fullName: string;
    email: string;
    employeeCode: string;
  } | null;
}

interface SeatInspectorDrawerProps {
  seat: SeatData | null;
  onClose: () => void;
  onUpdated: () => void;
}

export const SeatInspectorDrawer: React.FC<SeatInspectorDrawerProps> = ({
  seat,
  onClose,
  onUpdated,
}) => {
  const [unassignedEmployees, setUnassignedEmployees] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  useEffect(() => {
    if (seat) {
      // Fetch unassigned employees
      apiRequest<any>('/employees?limit=200')
        .then((res) => {
          const unassigned = (res.data || []).filter((e: any) => !e.seat);
          setUnassignedEmployees(unassigned);
          if (unassigned.length > 0) {
            setSelectedEmpId(unassigned[0].id);
          }
        })
        .catch(console.error);
    }
  }, [seat]);

  if (!seat) return null;

  const handleAssign = async () => {
    if (!selectedEmpId) return;
    setLoadingAction(true);
    try {
      await apiRequest(`/seats/${seat.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ employeeId: selectedEmpId }),
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to assign seat');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleUnassign = async () => {
    setLoadingAction(true);
    try {
      await apiRequest(`/seats/${seat.id}/unassign`, {
        method: 'POST',
      });
      onUpdated();
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to unassign seat');
    } finally {
      setLoadingAction(false);
    }
  };

  const filteredUnassigned = unassignedEmployees.filter(
    (e) =>
      e.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.employeeCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="ios-inspector-drawer fixed inset-y-0 right-0 z-50 w-full sm:w-[420px] bg-white border-l border-slate-200 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-xl">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-orange-600">
            Seat Inspector
          </span>
          <h2 className="text-xl font-bold text-slate-900 mt-0.5">{seat.label}</h2>
        </div>
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          aria-label="Close seat inspector"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-5 space-y-6 flex-1 overflow-y-auto">
        {/* Metadata */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Seat Type</span>
            <span className="font-semibold text-slate-800">{seat.type}</span>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Status</span>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                seat.status === 'AVAILABLE'
                  ? 'bg-emerald-50 text-emerald-700'
                  : seat.status === 'MAINTENANCE'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-orange-50 text-orange-700'
              }`}
            >
              {seat.status}
            </span>
          </div>

          {seat.department && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Department</span>
              <span className="flex items-center font-medium text-slate-800">
                <span
                  className="w-2.5 h-2.5 rounded-full mr-2"
                  style={{ backgroundColor: seat.department.colorHex }}
                />
                {seat.department.name}
              </span>
            </div>
          )}

          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Coordinates</span>
            <span className="font-mono text-xs text-slate-600">
              X: {Math.round(seat.x)}, Y: {Math.round(seat.y)} ({seat.rotation}°)
            </span>
          </div>
        </div>

        {/* Current Occupant Section */}
        <div className="border-t border-slate-100 pt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Current Assignment
            </h3>
            <div className="flex items-center text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
              <Lock className="w-3 h-3 mr-1 text-slate-500 shrink-0" />
              <span>Admin Controlled Static Desk</span>
            </div>
          </div>

          {seat.employee ? (
            <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-950 text-sm">
                  {seat.employee.fullName}
                </span>
                <span className="text-xs font-mono font-medium text-emerald-700">
                  {seat.employee.employeeCode}
                </span>
              </div>
              <div className="text-xs text-emerald-800/80">{seat.employee.email}</div>

              <div className="pt-2">
                <button
                  onClick={handleUnassign}
                  disabled={loadingAction}
                  className="w-full flex items-center justify-center py-2 px-3 border border-red-300 rounded-lg text-xs font-semibold text-red-700 bg-white hover:bg-red-50 transition-colors shadow-xs"
                >
                  <UserX className="w-3.5 h-3.5 mr-1.5" />
                  Unassign Employee (Release Desk)
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
              <span className="text-sm text-slate-600 block">Desk is currently vacant.</span>
              {seat.status !== 'AVAILABLE' && (
                <div className="text-xs text-amber-700 flex items-center justify-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                  Desk status must be AVAILABLE to assign.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Assignment Workflow */}
        {!seat.employee && seat.status === 'AVAILABLE' && (
          <div className="border-t border-slate-100 pt-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Assign Staff Member
            </h3>

            <div className="space-y-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Filter unassigned staff..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                {filteredUnassigned.length > 0 ? (
                  filteredUnassigned.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.fullName} ({emp.employeeCode})
                    </option>
                  ))
                ) : (
                  <option value="">No unassigned staff available</option>
                )}
              </select>

              <button
                onClick={handleAssign}
                disabled={loadingAction || !selectedEmpId}
                className="w-full flex items-center justify-center py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm shadow-orange-600/20 disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4 mr-2" />
                Confirm 1:1 Desk Assignment
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
