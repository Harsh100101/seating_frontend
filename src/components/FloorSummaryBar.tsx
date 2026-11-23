import React from 'react';
import { Armchair, UserCheck, CheckCircle2, Percent, Users, MapPin, MapPinOff } from 'lucide-react';

interface FloorSummaryBarProps {
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  occupancyRate: number;
  employeesOnFloor: number;
  placedSeats?: number;
  unplacedSeats?: number;
  floorName?: string;
  className?: string;
}

export const FloorSummaryBar: React.FC<FloorSummaryBarProps> = ({
  totalSeats,
  occupiedSeats,
  availableSeats,
  occupancyRate,
  employeesOnFloor,
  placedSeats,
  unplacedSeats,
  floorName,
  className = '',
}) => {
  return (
    <div
      role="region"
      aria-label="Floor occupancy summary"
      className={`bg-slate-900/90 border-b border-slate-800/80 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs backdrop-blur-md ${className}`}
    >
      <div className="flex items-center space-x-2">
        <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400">
          {floorName ? `${floorName} Capacity:` : 'Floor Occupancy:'}
        </span>
      </div>

      <div className="flex items-center flex-wrap gap-2 md:gap-4 font-mono text-xs">
        {/* Total Workstations */}
        <div
          className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800"
          title="Total Workstations on this floor"
        >
          <Armchair className="w-3.5 h-3.5 text-sky-400 shrink-0" />
          <span className="text-slate-400">Total:</span>
          <span className="font-bold text-white tabular-nums">{totalSeats}</span>
        </div>

        {placedSeats !== undefined && unplacedSeats !== undefined && (
          <>
            <div className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800" title="Workstations with a saved architectural floor-map position">
              <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-slate-400">Placed:</span>
              <span className="font-bold text-cyan-300 tabular-nums">{placedSeats}</span>
            </div>
            <div className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800" title="Workstations not yet positioned on the architectural floor map">
              <MapPinOff className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-slate-400">Unplaced:</span>
              <span className="font-bold text-slate-300 tabular-nums">{unplacedSeats}</span>
            </div>
          </>
        )}

        {/* Occupied Workstations */}
        <div
          className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800"
          title="Occupied Workstations"
        >
          <UserCheck className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="text-slate-400">Occupied:</span>
          <span className="font-bold text-orange-400 tabular-nums">{occupiedSeats}</span>
        </div>

        {/* Available Workstations */}
        <div
          className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800"
          title="Available Workstations"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <span className="text-slate-400">Available:</span>
          <span className="font-bold text-emerald-400 tabular-nums">{availableSeats}</span>
        </div>

        {/* Occupancy Rate */}
        <div
          className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800"
          title="Floor Occupancy Percentage"
        >
          <Percent className="w-3.5 h-3.5 text-purple-400 shrink-0" />
          <span className="text-slate-400">Occupancy:</span>
          <span
            className={`font-bold tabular-nums ${
              occupancyRate > 90
                ? 'text-rose-400'
                : occupancyRate > 75
                ? 'text-orange-400'
                : 'text-emerald-400'
            }`}
          >
            {occupancyRate.toFixed(1)}%
          </span>
        </div>

        {/* Employees on Floor */}
        <div
          className="flex items-center space-x-1.5 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800"
          title="Total Seated Employees on this Floor"
        >
          <Users className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span className="text-slate-400">Employees:</span>
          <span className="font-bold text-blue-300 tabular-nums">{employeesOnFloor}</span>
        </div>
      </div>
    </div>
  );
};
