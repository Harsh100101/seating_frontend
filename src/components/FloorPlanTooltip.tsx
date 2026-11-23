import React from 'react';
import { SeatData } from './SeatManagementModal';
import { UserCheck, CheckCircle2, AlertCircle, Clock } from 'lucide-react';

interface FloorPlanTooltipProps {
  seat: SeatData | null;
  position: { x: number; y: number } | null;
  containerBounds?: { width: number; height: number };
}

export const FloorPlanTooltip: React.FC<FloorPlanTooltipProps> = ({
  seat,
  position,
  containerBounds,
}) => {
  if (!seat || !position) return null;

  const isOccupied = Boolean(seat.employeeId && seat.employee);
  const employee = seat.employee;
  const dept = seat.department || (employee as any)?.department;
  const deptColor = dept?.colorHex || '#3b82f6';

  // Hierarchy & Location labels
  const unitName = seat.floor?.building?.plant?.unit?.name;
  const buildingName = seat.floor?.building?.name || 'Building';
  const floorName = seat.floor?.name || (seat.floor?.floorNumber !== undefined ? `Floor ${seat.floor.floorNumber}` : 'Floor');
  const officeName = seat.officeArea?.trim() || 'General Office';
  const areaName = seat.zone?.trim() || seat.officeArea?.trim() || 'General Area';

  // Status computation
  const isMaintenance = seat.status === 'MAINTENANCE';
  const isReserved = seat.status === 'RESERVED';
  const statusLabel = isMaintenance
    ? 'Maintenance'
    : isReserved
    ? 'Reserved'
    : isOccupied
    ? 'Occupied'
    : 'Available';

  const statusColorClass = isMaintenance
    ? 'text-amber-400 bg-amber-950/60 border-amber-500/30'
    : isReserved
    ? 'text-rose-400 bg-rose-950/60 border-rose-500/30'
    : isOccupied
    ? 'text-blue-400 bg-blue-950/60 border-blue-500/30'
    : 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30';

  // Dynamic viewport positioning: clamps to screen edges, flips left/down if near edges
  const tooltipWidth = 280;
  const tooltipHeight = isOccupied ? 250 : 160;
  const boundsW = typeof window !== 'undefined' ? window.innerWidth : (containerBounds?.width || 1920);
  const boundsH = typeof window !== 'undefined' ? window.innerHeight : (containerBounds?.height || 1080);
  const padding = 12;
  const cursorGap = 16;

  // Horizontal: default to right of cursor; flip left if overflowing right edge
  let left = position.x + cursorGap;
  if (left + tooltipWidth > boundsW - padding) {
    left = position.x - tooltipWidth - cursorGap;
  }
  // Clamp horizontal position within viewport
  if (left < padding) {
    left = padding;
  } else if (left + tooltipWidth > boundsW - padding) {
    left = Math.max(padding, boundsW - tooltipWidth - padding);
  }

  // Vertical: default near cursor; flip down if near top edge, flip up if near bottom edge
  let top = position.y - 12;
  if (top < padding) {
    top = position.y + cursorGap;
  }
  if (top + tooltipHeight > boundsH - padding) {
    top = position.y - tooltipHeight - cursorGap;
  }
  // Clamp vertical position within viewport
  if (top < padding) {
    top = padding;
  } else if (top + tooltipHeight > boundsH - padding) {
    top = Math.max(padding, boundsH - tooltipHeight - padding);
  }

  return (
    <div
      role="tooltip"
      aria-hidden="false"
      className="floor-plan-tooltip fixed z-50 pointer-events-none transition-opacity duration-150 shadow-2xl rounded-lg overflow-hidden border border-slate-700/80 bg-slate-900/95 backdrop-blur-md text-slate-100 text-xs w-[280px] animate-in fade-in zoom-in-95"
      style={{
        left: `${left}px`,
        top: `${top}px`,
      }}
    >
      {/* Header bar: Workstation ID & Status Badge */}
      <div
        className="px-3 py-2 flex items-center justify-between border-b border-slate-800"
        style={{
          backgroundColor: isOccupied ? `${deptColor}20` : '#10b98120',
          borderLeft: `4px solid ${isOccupied ? deptColor : isMaintenance ? '#f59e0b' : isReserved ? '#ef4444' : '#10b981'}`,
        }}
      >
        <div className="flex items-center space-x-1.5 font-mono font-bold text-sm tracking-wide text-white">
          <span>{seat.label}</span>
        </div>
        <span
          className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded border uppercase tracking-wider ${statusColorClass}`}
        >
          {isOccupied ? (
            <>
              <UserCheck className="w-2.5 h-2.5 mr-1 shrink-0" />
              {statusLabel}
            </>
          ) : isMaintenance ? (
            <>
              <AlertCircle className="w-2.5 h-2.5 mr-1 shrink-0" />
              {statusLabel}
            </>
          ) : isReserved ? (
            <>
              <Clock className="w-2.5 h-2.5 mr-1 shrink-0" />
              {statusLabel}
            </>
          ) : (
            <>
              <CheckCircle2 className="w-2.5 h-2.5 mr-1 shrink-0" />
              {statusLabel}
            </>
          )}
        </span>
      </div>

      {/* Body: Employee (ID — Full Name), Department, Office, Area, Status */}
      <div className="p-3 space-y-2 text-[11px]">
        {/* Employee Section */}
        <div>
          <div className="floor-plan-tooltip-label text-[10px] font-mono font-semibold uppercase text-slate-400">Employee</div>
          {isOccupied && employee ? (
            <div className="mt-0.5">
              <div className="floor-plan-tooltip-value text-xs font-bold text-white leading-snug">
                <span className="font-mono text-amber-400">{employee.employeeCode}</span>
                <span className="text-slate-400 font-normal"> — </span>
                <span>{employee.fullName}</span>
              </div>
              {employee.designation && (
                <div className="floor-plan-tooltip-muted text-[10px] text-slate-400 mt-0.5 truncate">{employee.designation}</div>
              )}
            </div>
          ) : (
            <div className="floor-plan-tooltip-available text-emerald-400/90 font-medium mt-0.5">
              {isMaintenance ? 'Workstation undergoing maintenance' : isReserved ? 'Workstation reserved' : 'Workstation available for assignment'}
            </div>
          )}
        </div>

        {/* Department Section */}
        <div className="pt-1.5 border-t border-slate-800/80">
          <div className="floor-plan-tooltip-label text-[10px] font-mono font-semibold uppercase text-slate-400">Department</div>
          <div className="flex items-center space-x-1.5 mt-0.5">
            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: deptColor }} />
            <span className="floor-plan-tooltip-value text-slate-200 font-medium truncate">{dept?.name || 'Unassigned'}</span>
            {dept?.code && <span className="floor-plan-tooltip-muted text-[10px] font-mono text-slate-400">({dept.code})</span>}
          </div>
        </div>

        {/* Office & Area Section */}
        <div className="pt-1.5 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[10px]">
          <div>
            <div className="floor-plan-tooltip-label font-mono font-semibold uppercase text-slate-400">Office</div>
            <div className="floor-plan-tooltip-value text-slate-200 font-sans font-medium mt-0.5 truncate">{officeName}</div>
          </div>
          <div>
            <div className="floor-plan-tooltip-label font-mono font-semibold uppercase text-slate-400">Area</div>
            <div className="floor-plan-tooltip-value text-slate-200 font-sans font-medium mt-0.5 truncate">{areaName}</div>
          </div>
        </div>

        {/* Hierarchy Context */}
        <div className="floor-plan-tooltip-muted pt-1.5 border-t border-slate-800 text-[10px] text-slate-400 space-y-0.5 font-mono">
          <div className="truncate">
            <span className="floor-plan-tooltip-label text-slate-500">Location: </span>
            <span className="floor-plan-tooltip-value text-slate-300 font-sans">
              {unitName ? `${unitName} • ` : ''}{buildingName} • {floorName}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
