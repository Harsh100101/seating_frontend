import React from 'react';
import { SeatData } from './SeatManagementModal';
import { Armchair, ArrowRight, Check } from 'lucide-react';

interface UnplacedWorkstationsDrawerProps {
  isOpen: boolean;
  unplacedSeats: SeatData[];
  onPlaceSeat: (seat: SeatData) => void;
  onClose: () => void;
  onDragStart?: (seat: SeatData) => void;
}

export const UnplacedWorkstationsDrawer: React.FC<UnplacedWorkstationsDrawerProps> = ({
  isOpen,
  unplacedSeats,
  onPlaceSeat,
  onClose,
  onDragStart,
}) => {
  if (!isOpen) return null;

  return (
    <aside
      className="absolute top-12 left-4 z-30 w-72 max-h-[calc(100%-4rem)] bg-slate-900/95 border border-slate-800 rounded-lg shadow-2xl flex flex-col text-slate-100 overflow-hidden backdrop-blur-md"
      aria-label="Unplaced Workstations"
    >
      <div className="px-3.5 py-2.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Armchair className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-bold text-white tracking-wide uppercase font-mono">
            Unplaced Workstations
          </h3>
          <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 rounded text-slate-300">
            {unplacedSeats.length}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-400 hover:text-white text-xs px-1"
          title="Close unplaced workstations panel"
        >
          ×
        </button>
      </div>

      <div className="p-3 overflow-y-auto space-y-2 flex-1 text-xs">
        {unplacedSeats.length === 0 ? (
          <div className="py-6 text-center text-slate-500 space-y-1">
            <Check className="w-6 h-6 mx-auto text-emerald-400/80 mb-1" />
            <p className="font-semibold text-slate-300 text-xs">All Workstations Placed</p>
            <p className="text-[11px] text-slate-500">Every workstation on this floor is positioned on the plan.</p>
          </div>
        ) : (
          unplacedSeats.map((seat) => (
            <div
              key={seat.id}
              draggable
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('application/x-seating-workstation', seat.id);
                event.dataTransfer.setData('text/plain', seat.label);
                onDragStart?.(seat);
              }}
              className="p-2 rounded bg-slate-950 border border-slate-800 flex items-center justify-between group hover:border-orange-500/50 transition-colors"
            >
              <div>
                <span className="font-mono font-bold text-white">{seat.label}</span>
                <span className="text-[10px] text-slate-400 block font-mono">
                  {seat.officeArea || 'Unassigned Area'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onPlaceSeat(seat)}
                className="px-2 py-1 bg-orange-600 hover:bg-orange-500 text-white rounded text-[11px] font-medium flex items-center space-x-1"
                title="Place this workstation on the canvas center"
              >
                <span>Place</span>
                <ArrowRight className="w-2.5 h-2.5" />
              </button>
            </div>
          ))
        )}
      </div>

      <div className="px-3 py-2 bg-slate-950/60 border-t border-slate-800 text-[10px] text-slate-500 font-mono">
        Drag a workstation onto the plan, or place it in the center then drag to refine.
      </div>
    </aside>
  );
};
