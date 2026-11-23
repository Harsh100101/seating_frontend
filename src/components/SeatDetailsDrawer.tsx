import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  User,
  MapPin,
  Monitor,
  Phone,
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  UserCheck,
  Edit2,
} from 'lucide-react';
import { SeatData } from './SeatManagementModal';

interface SeatDetailsDrawerProps {
  seat: SeatData | null;
  onClose: () => void;
  onEdit?: (seat: SeatData) => void;
  canEdit?: boolean;
}

export const SeatDetailsDrawer: React.FC<SeatDetailsDrawerProps> = ({
  seat,
  onClose,
  onEdit,
  canEdit = false,
}) => {
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!seat) return null;

  const isOccupied = Boolean(seat.employeeId && seat.employee);
  const employee = seat.employee;
  const dept = seat.department || (employee as any)?.department;
  const deptColor = dept?.colorHex || '#3b82f6';

  // Format type nicely
  const formattedType = (seat.type || 'STANDARD_DESK')
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Location Hierarchy string
  const unitName = seat.floor?.building?.plant?.unit?.name || 'Unit';
  const buildingName = seat.floor?.building?.name || 'Building';
  const floorName = seat.floor?.name || `Floor ${seat.floor?.floorNumber ?? ''}`;
  const areaName = seat.officeArea || seat.zone || 'General Area';

  return (
    <AnimatePresence>
      <motion.aside
        ref={drawerRef}
        key="seat-details-drawer"
        role="dialog"
        aria-label={`Workstation details for ${seat.label}`}
        aria-modal="false"
        initial={{ x: '100%', opacity: 0.5 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: '100%', opacity: 0 }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="absolute top-0 right-0 bottom-0 w-80 md:w-96 z-40 bg-slate-900/98 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col text-slate-100 overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-base shadow-inner"
              style={{
                backgroundColor: isOccupied ? `${deptColor}22` : '#10b98122',
                color: isOccupied ? deptColor : '#10b981',
                border: `1.5px solid ${isOccupied ? deptColor : '#10b981'}`,
              }}
            >
              {seat.label.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4) || 'WS'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-white tracking-tight">{seat.label}</h2>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold tracking-wide uppercase ${
                    isOccupied
                      ? 'bg-blue-950/80 text-blue-400 border border-blue-800/60'
                      : seat.status === 'MAINTENANCE'
                      ? 'bg-amber-950/80 text-amber-400 border border-amber-800/60'
                      : seat.status === 'RESERVED'
                      ? 'bg-red-950/80 text-red-400 border border-red-800/60'
                      : 'bg-emerald-950/80 text-emerald-400 border border-emerald-800/60'
                  }`}
                >
                  {isOccupied ? (
                    <>
                      <UserCheck className="w-2.5 h-2.5 mr-1" />
                      Occupied
                    </>
                  ) : seat.status === 'MAINTENANCE' ? (
                    <>
                      <AlertCircle className="w-2.5 h-2.5 mr-1" />
                      Maintenance
                    </>
                  ) : seat.status === 'RESERVED' ? (
                    <>
                      <Clock className="w-2.5 h-2.5 mr-1" />
                      Reserved
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                      Available
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{formattedType}</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {canEdit && onEdit && (
              <button
                type="button"
                onClick={() => onEdit(seat)}
                className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                title="Edit Workstation Layout & Assignment"
                aria-label="Edit Workstation"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Close panel (Esc)"
              aria-label="Close details panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs">
          {/* Section 1: Occupant Information (if Occupied) */}
          {isOccupied && employee ? (
            <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
                  Assigned Employee
                </span>
                <span className="font-mono text-xs font-bold text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40">
                  {employee.employeeCode}
                </span>
              </div>

              <div>
                <p className="text-sm font-bold text-white">{employee.fullName}</p>
                {employee.designation && (
                  <p className="text-xs text-slate-400 mt-0.5 font-medium">{employee.designation}</p>
                )}
              </div>

              {dept && (
                <div className="flex items-center space-x-2 pt-1">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: deptColor }}
                  />
                  <span className="font-medium text-slate-200">{dept.name}</span>
                  {dept.code && (
                    <span className="font-mono text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                      {dept.code}
                    </span>
                  )}
                </div>
              )}

              {/* Extra Employee details */}
              <div className="grid grid-cols-2 gap-2 pt-2 text-[11px] text-slate-400 border-t border-slate-850">
                {employee.section && (
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Section</span>
                    <span className="text-slate-200 font-medium">{employee.section}</span>
                  </div>
                )}
                {employee.functionName && (
                  <div>
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Function</span>
                    <span className="text-slate-200 font-medium">{employee.functionName}</span>
                  </div>
                )}
                {(employee.reportingTo || employee.reportingManager) && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">Reporting To</span>
                    <span className="text-slate-200 font-medium">
                      {employee.reportingTo || employee.reportingManager}
                    </span>
                  </div>
                )}
                {employee.hod && (
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[10px] uppercase font-mono">HOD</span>
                    <span className="text-slate-200 font-medium">{employee.hod}</span>
                  </div>
                )}
                {employee.email && (
                  <div className="col-span-2 flex items-center space-x-1.5 text-slate-300 truncate">
                    <Mail className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{employee.email}</span>
                  </div>
                )}
                {((employee as any).phone || (employee as any).ext) && (
                  <div className="col-span-2 flex items-center space-x-1.5 text-slate-300">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>
                      {(employee as any).phone || ''} {((employee as any).ext ? `(Ext: ${(employee as any).ext})` : '')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-slate-950/70 border border-emerald-900/30 rounded-lg p-4 space-y-2">
              <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-emerald-400 flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                Vacant Workstation
              </span>
              <p className="text-xs text-slate-400">
                This workstation is currently available for allocation.
              </p>
            </div>
          )}

          {/* Section 2: Location Hierarchy */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2.5">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1.5 text-orange-400" />
              Physical Location
            </span>

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500 font-mono text-[11px]">Location / Unit:</span>
                <span className="font-semibold text-slate-200">{unitName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500 font-mono text-[11px]">Building:</span>
                <span className="text-slate-200 font-medium">{buildingName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-850">
                <span className="text-slate-500 font-mono text-[11px]">Floor:</span>
                <span className="text-slate-200 font-medium">{floorName}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500 font-mono text-[11px]">Area / Office:</span>
                <span className="text-emerald-400 font-medium">{areaName}</span>
              </div>
            </div>
          </div>

          {/* Section 3: Hardware & Specifications */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-lg p-4 space-y-2">
            <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center">
              <Monitor className="w-3.5 h-3.5 mr-1.5 text-purple-400" />
              Workstation Details
            </span>

            <div className="grid grid-cols-2 gap-2 text-xs pt-1">
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">PC Number</span>
                <span className="text-slate-200 font-mono">{seat.pcNumber || '—'}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Type</span>
                <span className="text-slate-200">{formattedType}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Coordinates</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  X: {Math.round(seat.x)}, Y: {Math.round(seat.y)}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block text-[10px] font-mono uppercase">Dimensions</span>
                <span className="text-slate-400 font-mono text-[11px]">
                  {Math.round(seat.width || 64)} × {Math.round(seat.height || 48)}
                </span>
              </div>
              {seat.remarks && (
                <div className="col-span-2 pt-1 border-t border-slate-850">
                  <span className="text-slate-500 block text-[10px] font-mono uppercase">Remarks</span>
                  <span className="text-slate-300 italic">{seat.remarks}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500">
          <span>Read-only inspection</span>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors text-xs font-medium"
          >
            Close
          </button>
        </div>
      </motion.aside>
    </AnimatePresence>
  );
};
