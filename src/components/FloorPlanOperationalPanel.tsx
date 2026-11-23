import React, { useMemo, useState } from 'react';
import { Armchair, ArrowLeft, CheckCircle2, GripVertical, Search, Undo2, Users } from 'lucide-react';
import { SeatData } from './SeatManagementModal';

export interface AssignableEmployee {
  id: string;
  employeeCode: string;
  fullName: string;
  department?: { id: string; name: string; code?: string } | null;
  unit?: { id: string; name: string; code?: string } | null;
  designation?: string | null;
  section?: string | null;
  functionName?: string | null;
}

interface Props {
  seats: SeatData[];
  selectedSeat: SeatData | null;
  offices: string[];
  areas: string[];
  departments: Array<{ id: string; name: string }>;
  office: string;
  area: string;
  departmentId: string;
  status: 'ALL' | 'OCCUPIED' | 'AVAILABLE';
  unassigned: AssignableEmployee[];
  employeeSearch: string;
  unassignedLoading: boolean;
  isEditing: boolean;
  canAssign: boolean;
  canDragEmployeesToMap: boolean;
  hasFloorMap: boolean;
  isSeatPlaced: (seat: SeatData) => boolean;
  onOfficeChange: (value: string) => void;
  onAreaChange: (value: string) => void;
  onDepartmentChange: (value: string) => void;
  onStatusChange: (value: 'ALL' | 'OCCUPIED' | 'AVAILABLE') => void;
  onEmployeeSearchChange: (value: string) => void;
  onSeatSelect: (seat: SeatData) => void;
  onBack: () => void;
  onAssignmentRequested: (seat: SeatData, employee: AssignableEmployee) => void;
  onManageSeat?: (seat: SeatData) => void;
  onEmployeeDragStart: (employee: AssignableEmployee) => void;
  onPlaceSeat?: (seat: SeatData) => void;
  onUnplaceSeat?: (seat: SeatData) => void;
  onWorkstationDragStart?: (seat: SeatData) => void;
}

const occupancy = (seat: SeatData) => Boolean(seat.employeeId && seat.employee);

export const FloorPlanOperationalPanel: React.FC<Props> = ({
  seats,
  selectedSeat,
  offices,
  areas,
  departments,
  office,
  area,
  departmentId,
  status,
  unassigned,
  employeeSearch,
  unassignedLoading,
  isEditing,
  canAssign,
  canDragEmployeesToMap,
  hasFloorMap,
  isSeatPlaced,
  onOfficeChange,
  onAreaChange,
  onDepartmentChange,
  onStatusChange,
  onEmployeeSearchChange,
  onSeatSelect,
  onBack,
  onAssignmentRequested,
  onManageSeat,
  onEmployeeDragStart,
  onPlaceSeat,
  onUnplaceSeat,
  onWorkstationDragStart,
}) => {
  const filteredSeats = useMemo(() => seats.filter((seat) => {
    if (office !== 'ALL' && seat.officeArea?.trim() !== office) return false;
    if (area !== 'ALL' && (seat.zone?.trim() || seat.officeArea?.trim()) !== area) return false;
    if (departmentId !== 'ALL' && seat.departmentId !== departmentId && seat.employee?.departmentId !== departmentId) return false;
    if (status === 'OCCUPIED' && !occupancy(seat)) return false;
    if (status === 'AVAILABLE' && occupancy(seat)) return false;
    return true;
  }), [area, departmentId, office, seats, status]);

  const placedSeats = useMemo(() => seats.filter((s) => isSeatPlaced(s)), [isSeatPlaced, seats]);
  const placedAvailableSeats = useMemo(
    () => placedSeats.filter((s) => !occupancy(s) && s.status === 'AVAILABLE'),
    [placedSeats]
  );
  const canDragEmployees = canDragEmployeesToMap && !isEditing && hasFloorMap && placedSeats.length > 0 && placedAvailableSeats.length > 0;
  const [isDragOverPanel, setIsDragOverPanel] = useState(false);

  const dragDisabledReason = useMemo(() => {
    if (!hasFloorMap) {
      return 'Map drag is unavailable: No architectural floor map configured.';
    }
    if (placedSeats.length === 0) {
      return 'Employee drag is disabled: 0 workstations placed on this floor. Switch to Edit Layout to place workstations first.';
    }
    if (placedAvailableSeats.length === 0) {
      return 'Employee drag is disabled because there are no placed available workstations on this floor.';
    }
    if (!canAssign) {
      return 'Employee drag is disabled: You do not have permission to assign workstations.';
    }
    return undefined;
  }, [canAssign, hasFloorMap, placedAvailableSeats.length, placedSeats.length]);

  const selectedOccupied = selectedSeat && occupancy(selectedSeat);
  const unit = selectedSeat?.floor?.building?.plant?.unit?.name || '—';
  const building = selectedSeat?.floor?.building?.name || '—';
  const floor = selectedSeat?.floor?.name || '—';

  const employeeRow = (employee: AssignableEmployee, includeAssign = false) => (
    <div
      key={employee.id}
      draggable={canDragEmployees}
      onDragStart={(event) => {
        if (!canDragEmployees) {
          event.preventDefault();
          return;
        }
        event.dataTransfer.effectAllowed = 'copy';
        event.dataTransfer.setData('application/x-seating-employee', JSON.stringify(employee));
        event.dataTransfer.setData('text/plain', employee.fullName);
        onEmployeeDragStart(employee);
      }}
      className={`rounded-md border border-slate-800 bg-slate-950/80 px-2.5 py-2 text-left transition-colors ${
        canDragEmployees
          ? 'cursor-grab active:cursor-grabbing hover:border-sky-500/60'
          : 'cursor-not-allowed opacity-75'
      }`}
      title={canDragEmployees ? 'Drag onto a placed, available workstation to assign' : dragDisabledReason}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-slate-100">{employee.fullName}</p>
          <p className="font-mono text-[10px] text-amber-300">{employee.employeeCode}</p>
          <p className="truncate text-[10px] text-slate-400">{employee.department?.name || 'No department'}</p>
        </div>
        {includeAssign && selectedSeat && canAssign && (
          <button
            type="button"
            onClick={() => onAssignmentRequested(selectedSeat, employee)}
            className="shrink-0 rounded bg-orange-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-orange-500"
          >
            Assign
          </button>
        )}
      </div>
    </div>
  );

  if (isEditing) {
    const unplacedSeats = seats.filter((seat) => !isSeatPlaced(seat));

    const handlePanelDrop = (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault();
      setIsDragOverPanel(false);
      const workstationId = event.dataTransfer.getData('application/x-seating-workstation') || event.dataTransfer.getData('text/plain');
      if (workstationId) {
        const target = seats.find((s) => s.id === workstationId || s.label.toLowerCase() === workstationId.toLowerCase());
        if (target && isSeatPlaced(target)) {
          onUnplaceSeat?.(target);
        }
      }
    };

    return (
      <aside
        className={`floor-plan-sidebar w-[320px] shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/95 p-3 text-slate-100 flex flex-col transition-colors ${
          isDragOverPanel ? 'bg-slate-900 ring-2 ring-orange-500/80 ring-inset' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          setIsDragOverPanel(true);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragOverPanel(false);
          }
        }}
        onDrop={handlePanelDrop}
      >
        <div className="pb-3 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wide text-orange-400 font-mono">Edit layout mode</p>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-orange-950/80 text-orange-300 border border-orange-800/40">
              Active
            </span>
          </div>
          <p className="mt-1 text-[11px] leading-4 text-slate-400">
            Drag workstations from this list onto the floor map, or drag placed markers back to unplace.
          </p>
        </div>

        {/* Status Counters */}
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-slate-800 bg-slate-950/70 p-2 text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Placed</span>
            <span className="text-base font-bold text-emerald-400 font-mono">{placedSeats.length}</span>
          </div>
          <div className="rounded border border-slate-800 bg-slate-950/70 p-2 text-center">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Unplaced</span>
            <span className="text-base font-bold text-orange-400 font-mono">{unplacedSeats.length}</span>
          </div>
        </div>

        {/* Selected Placed Workstation Action Card */}
        {selectedSeat && isSeatPlaced(selectedSeat) && (
          <div className="mt-3 rounded-lg border border-orange-500/60 bg-orange-950/40 p-2.5 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-white">{selectedSeat.label}</span>
                  <span className={`text-[9px] font-semibold px-1 py-0.2 rounded ${
                    occupancy(selectedSeat) ? 'bg-blue-950 text-blue-300' : 'bg-emerald-950 text-emerald-300'
                  }`}>
                    {occupancy(selectedSeat) ? 'OCCUPIED' : 'AVAILABLE'}
                  </span>
                </div>
                {occupancy(selectedSeat) && selectedSeat.employee ? (
                  <p className="mt-1 text-[10px] text-amber-300 font-mono truncate max-w-[170px]">
                    {selectedSeat.employee.employeeCode} — {selectedSeat.employee.fullName}
                  </p>
                ) : (
                  <p className="mt-0.5 text-[10px] text-slate-400">{selectedSeat.officeArea || 'Placed on map'}</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onUnplaceSeat?.(selectedSeat)}
                className="shrink-0 rounded bg-rose-600/90 hover:bg-rose-500 px-2.5 py-1 text-[11px] font-semibold text-white shadow-xs transition-colors flex items-center gap-1"
                title="Remove marker from map and return to unplaced list"
              >
                <Undo2 className="h-3 w-3" />
                Move to Unplaced
              </button>
            </div>
          </div>
        )}

        {/* Reverse Drag Drop Target Zone */}
        <div
          className={`mt-3 p-2.5 rounded-lg border-2 border-dashed transition-all flex items-center justify-center gap-2 text-xs font-mono select-none ${
            isDragOverPanel
              ? 'border-orange-500 bg-orange-950/60 text-orange-200 ring-2 ring-orange-500/40'
              : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            setIsDragOverPanel(true);
          }}
          onDragLeave={() => setIsDragOverPanel(false)}
          onDrop={handlePanelDrop}
        >
          <Undo2 className="h-4 w-4 text-orange-400 shrink-0" />
          <span>Drop here to remove from floor map</span>
        </div>

        {/* Unplaced Workstations Section */}
        <section className="mt-4 flex-1 flex flex-col min-h-0">
          <div className="mb-2 flex items-center justify-between">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-300 font-mono">
              <Armchair className="h-3.5 w-3.5 text-orange-400" />
              Unplaced Workstations
            </p>
            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
              {unplacedSeats.length}
            </span>
          </div>

          {unplacedSeats.length === 0 ? (
            <div className="p-4 rounded border border-slate-800 bg-slate-950/40 text-center text-slate-500 my-auto">
              <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-emerald-400" />
              <p className="font-semibold text-xs text-slate-300">All Workstations Placed</p>
              <p className="text-[10px] mt-1 text-slate-500">Every workstation has a visual map position. Drag placed markers on the map to adjust.</p>
            </div>
          ) : (
            <div className="space-y-1.5 overflow-y-auto pr-0.5 flex-1 max-h-[calc(100vh-270px)]">
              {unplacedSeats.map((seat) => {
                const isOccupied = occupancy(seat);
                return (
                  <div
                    key={seat.id}
                    data-workstation-id={seat.id}
                    data-id={seat.id}
                    draggable={true}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'move';
                      event.dataTransfer.setData('application/x-seating-workstation', seat.id);
                      event.dataTransfer.setData('text/plain', seat.label);
                      onWorkstationDragStart?.(seat);
                    }}
                    className="group rounded-md border border-slate-800 bg-slate-950/80 p-2 transition-all hover:border-orange-500/60 hover:bg-slate-900 cursor-grab active:cursor-grabbing select-none"
                    title={`Drag ${seat.label} onto the floor map to place it`}
                  >
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <GripVertical className="h-4 w-4 text-slate-500 group-hover:text-orange-400 shrink-0 cursor-grab" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-xs font-bold text-slate-100">{seat.label}</span>
                            <span className={`text-[9px] font-semibold px-1 py-0.2 rounded ${
                              isOccupied ? 'bg-blue-950 text-blue-300' : 'bg-emerald-950 text-emerald-300'
                            }`}>
                              {isOccupied ? 'OCCUPIED' : 'AVAILABLE'}
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-slate-400">
                            {isOccupied && seat.employee
                              ? `${seat.employee.employeeCode} — ${seat.employee.fullName}`
                              : seat.officeArea || 'Unassigned Area'}
                          </p>
                        </div>
                      </div>
                      {onPlaceSeat && (
                        <button
                          type="button"
                          onClick={() => onPlaceSeat(seat)}
                          className="shrink-0 rounded bg-orange-600/80 px-2 py-1 text-[10px] font-medium text-white hover:bg-orange-500 flex items-center gap-0.5"
                          title="Place at center of map"
                        >
                          Place
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </aside>
    );
  }

  if (selectedSeat) {
    const employee = selectedSeat.employee;
    return (
      <aside className="floor-plan-sidebar w-[320px] shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/95 p-3 text-slate-100">
        <button type="button" onClick={onBack} className="mb-3 inline-flex items-center gap-1 text-xs text-slate-400 hover:text-white">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to seat list
        </button>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-mono text-sm font-bold text-white">{selectedSeat.label}</h2>
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${selectedOccupied ? 'bg-blue-950 text-blue-300' : 'bg-emerald-950 text-emerald-300'}`}>
              {selectedOccupied ? 'OCCUPIED' : selectedSeat.status}
            </span>
          </div>
          <dl className="mt-3 space-y-1 text-[11px] text-slate-400">
            <div className="flex justify-between gap-2"><dt>Unit</dt><dd className="text-right text-slate-200">{unit}</dd></div>
            <div className="flex justify-between gap-2"><dt>Building</dt><dd className="text-right text-slate-200">{building}</dd></div>
            <div className="flex justify-between gap-2"><dt>Floor</dt><dd className="text-right text-slate-200">{floor}</dd></div>
            <div className="flex justify-between gap-2"><dt>Office</dt><dd className="text-right text-slate-200">{selectedSeat.officeArea || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt>Area</dt><dd className="text-right text-slate-200">{selectedSeat.zone || selectedSeat.officeArea || '—'}</dd></div>
            <div className="flex justify-between gap-2"><dt>Visual position</dt><dd className="text-right text-slate-200">{hasFloorMap && isSeatPlaced(selectedSeat) ? 'Placed on floor map' : 'Not placed on floor map'}</dd></div>
          </dl>
          {canAssign && onManageSeat && (
            <button
              type="button"
              onClick={() => onManageSeat(selectedSeat)}
              className="mt-3 w-full rounded border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:border-orange-500/60 hover:bg-slate-800"
            >
              Manage seat
            </button>
          )}
        </div>

        {selectedOccupied && employee ? (
          <section className="mt-3 rounded-lg border border-blue-900/50 bg-slate-950/70 p-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-blue-300">Employee / seat details</p>
            <p className="text-sm font-bold text-white">{employee.fullName}</p>
            <p className="font-mono text-xs text-amber-300">{employee.employeeCode}</p>
            <dl className="mt-3 space-y-1 text-[11px] text-slate-400">
              <div className="flex justify-between gap-2"><dt>Department</dt><dd className="text-right text-slate-200">{selectedSeat.department?.name || employee.departmentId || '—'}</dd></div>
              {employee.functionName && <div className="flex justify-between gap-2"><dt>Function</dt><dd className="text-right text-slate-200">{employee.functionName}</dd></div>}
              {employee.section && <div className="flex justify-between gap-2"><dt>Section</dt><dd className="text-right text-slate-200">{employee.section}</dd></div>}
              {employee.designation && <div className="flex justify-between gap-2"><dt>Designation</dt><dd className="text-right text-slate-200">{employee.designation}</dd></div>}
              <div className="flex justify-between gap-2"><dt>Workstation</dt><dd className="font-mono text-right text-slate-200">{selectedSeat.label}</dd></div>
            </dl>
          </section>
        ) : (
          <section className="mt-3">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-300">Assign employee</p>
            <label className="relative block">
              <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
              <input
                value={employeeSearch}
                onChange={(event) => onEmployeeSearchChange(event.target.value)}
                placeholder="Search employee ID / name"
                className="h-8 w-full rounded border border-slate-700 bg-slate-950 pl-7 pr-2 text-xs text-white placeholder:text-slate-600 focus:border-orange-500 focus:outline-none"
              />
            </label>
            <p className="mt-1.5 text-[10px] text-slate-500">Only active, unseated employees eligible in your authorized scope are shown.</p>
            <div className="mt-2 space-y-1.5">
              {unassignedLoading ? <p className="p-2 text-xs text-slate-500">Searching employees…</p> : unassigned.length > 0 ? unassigned.map((employee) => employeeRow(employee, true)) : <p className="p-2 text-xs text-slate-500">No eligible unassigned employees found.</p>}
            </div>
          </section>
        )}
      </aside>
    );
  }

  return (
    <aside className="floor-plan-sidebar w-[320px] shrink-0 overflow-y-auto border-r border-slate-800 bg-slate-900/95 p-3 text-slate-100">
      <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-300">Filters</p>
      <div className="grid grid-cols-2 gap-2">
        <select value={office} onChange={(event) => { onOfficeChange(event.target.value); onAreaChange('ALL'); }} className="h-8 rounded border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200">
          <option value="ALL">All offices</option>{offices.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={area} onChange={(event) => onAreaChange(event.target.value)} className="h-8 rounded border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200">
          <option value="ALL">All areas</option>{areas.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <select value={departmentId} onChange={(event) => onDepartmentChange(event.target.value)} className="h-8 rounded border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200">
          <option value="ALL">All departments</option>{departments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
        <select value={status} onChange={(event) => onStatusChange(event.target.value as Props['status'])} className="h-8 rounded border border-slate-800 bg-slate-950 px-2 text-[11px] text-slate-200">
          <option value="ALL">All seats</option><option value="OCCUPIED">Occupied</option><option value="AVAILABLE">Available</option>
        </select>
      </div>

      <section className="mt-4">
        <div className="mb-2 flex items-center justify-between"><p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Seats / workstations</p><span className="font-mono text-[10px] text-slate-500">{filteredSeats.length}</span></div>
        <div className="space-y-1.5">
          {filteredSeats.map((seat) => (
            <button key={seat.id} type="button" onClick={() => onSeatSelect(seat)} className="w-full rounded-md border border-slate-800 bg-slate-950/80 px-2.5 py-2 text-left hover:border-orange-500/60">
              <div className="flex items-center justify-between gap-2"><span className="font-mono text-xs font-bold text-slate-100">{seat.label}</span><span className={`text-[10px] font-semibold ${occupancy(seat) ? 'text-blue-300' : 'text-emerald-300'}`}>{occupancy(seat) ? 'OCCUPIED' : seat.status}</span></div>
              <p className="mt-0.5 truncate text-[10px] text-slate-400">{occupancy(seat) ? `${seat.employee?.employeeCode} — ${seat.employee?.fullName}` : 'Available'}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="mt-4 border-t border-slate-800 pt-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <Users className="h-3 w-3" /> Unassigned employees
          </p>
          <span className="font-mono text-[10px] text-slate-500">{unassigned.length}</span>
        </div>
        <label className="relative block">
          <Search className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-500" />
          <input
            value={employeeSearch}
            onChange={(event) => onEmployeeSearchChange(event.target.value)}
            placeholder="Search ID / name"
            className="h-8 w-full rounded border border-slate-700 bg-slate-950 pl-7 pr-2 text-xs text-white placeholder:text-slate-600"
          />
        </label>
        {dragDisabledReason ? (
          <div className="mt-2 rounded bg-amber-950/40 border border-amber-800/40 p-2 text-[10px] text-amber-300">
            <span className="font-semibold">Drag disabled:</span> {dragDisabledReason}
          </div>
        ) : (
          <p className="mt-1 text-[10px] text-slate-400">
            Drag an employee onto a placed, available workstation marker on the map to assign.
          </p>
        )}
        <div className="mt-2 space-y-1.5">
          {unassignedLoading ? (
            <p className="p-2 text-xs text-slate-500">Loading…</p>
          ) : unassigned.length > 0 ? (
            unassigned.map((employee) => employeeRow(employee))
          ) : (
            <p className="p-2 text-xs text-slate-500">No unassigned employees found.</p>
          )}
        </div>
      </section>
      <div className="mt-4 flex items-center gap-2 rounded border border-slate-800 bg-slate-950/60 p-2 text-[10px] text-slate-400"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> Select a seat for details or assignment.</div>
    </aside>
  );
};
