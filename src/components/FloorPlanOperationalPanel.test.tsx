import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { FloorPlanOperationalPanel, AssignableEmployee } from './FloorPlanOperationalPanel';
import { SeatData } from './SeatManagementModal';

describe('FloorPlanOperationalPanel Drag & Drop Features', () => {
  const dummyEmployees: AssignableEmployee[] = [
    {
      id: 'emp-1',
      employeeCode: 'EMP001',
      fullName: 'Alice Smith',
      department: { id: 'dept-1', name: 'IT' },
    },
    {
      id: 'emp-2',
      employeeCode: 'EMP002',
      fullName: 'Bob Jones',
      department: { id: 'dept-1', name: 'IT' },
    },
  ];

  const unplacedSeat1: SeatData = {
    id: 'ws-1',
    label: 'WS-01',
    floorId: 'flr-1',
    type: 'STANDARD_DESK',
    rotation: 0,
    x: 0,
    y: 0,
    status: 'AVAILABLE',
    placementSource: null,
  };

  const unplacedSeat2: SeatData = {
    id: 'ws-2',
    label: 'WS-02',
    floorId: 'flr-1',
    type: 'STANDARD_DESK',
    rotation: 0,
    x: 0,
    y: 0,
    status: 'OCCUPIED',
    placementSource: null,
    employeeId: 'emp-99',
    employee: { id: 'emp-99', fullName: 'Charlie Brown', employeeCode: 'EMP099' } as any,
  };

  const placedSeatAvailable: SeatData = {
    id: 'ws-3',
    label: 'WS-03',
    floorId: 'flr-1',
    type: 'STANDARD_DESK',
    rotation: 0,
    x: 100,
    y: 150,
    status: 'AVAILABLE',
    placementSource: 'MANUAL',
  };

  it('Drag Type A: in Edit Layout mode, left panel lists unplaced workstations with draggable={true} and drag handles', () => {
    const seats = [unplacedSeat1, unplacedSeat2, placedSeatAvailable];
    const isSeatPlaced = (s: SeatData) => s.placementSource === 'MANUAL' && s.x > 0 && s.y > 0;

    const html = renderToStaticMarkup(
      <FloorPlanOperationalPanel
        seats={seats}
        selectedSeat={null}
        offices={[]}
        areas={[]}
        departments={[]}
        office="ALL"
        area="ALL"
        departmentId="ALL"
        status="ALL"
        unassigned={dummyEmployees}
        employeeSearch=""
        unassignedLoading={false}
        isEditing={true}
        canAssign={true}
        canDragEmployeesToMap={true}
        hasFloorMap={true}
        isSeatPlaced={isSeatPlaced}
        onOfficeChange={vi.fn()}
        onAreaChange={vi.fn()}
        onDepartmentChange={vi.fn()}
        onStatusChange={vi.fn()}
        onEmployeeSearchChange={vi.fn()}
        onSeatSelect={vi.fn()}
        onBack={vi.fn()}
        onAssignmentRequested={vi.fn()}
        onEmployeeDragStart={vi.fn()}
        onPlaceSeat={vi.fn()}
      />
    );

    // Should indicate edit layout mode
    expect(html).toContain('Edit layout mode');
    expect(html).toContain('Unplaced Workstations');

    // Should list unplaced workstations WS-01 and WS-02
    expect(html).toContain('WS-01');
    expect(html).toContain('WS-02');
    // WS-03 is placed, so it should NOT be listed in the unplaced workstations list
    expect(html).not.toContain('title="Drag WS-03 onto the floor map to place it"');

    // WS-01 is available, WS-02 is occupied
    expect(html).toContain('AVAILABLE');
    expect(html).toContain('OCCUPIED');
    expect(html).toContain('Charlie Brown');

    // Should have draggable="true" and cursor-grab on the items
    expect(html).toContain('draggable="true"');
    expect(html).toContain('cursor-grab');

    // Counts: Placed: 1, Unplaced: 2
    expect(html).toContain('>Placed</span><span class="text-base font-bold text-emerald-400 font-mono">1</span>');
    expect(html).toContain('>Unplaced</span><span class="text-base font-bold text-orange-400 font-mono">2</span>');
  });

  it('Drag Type B: in Normal mode with 0 placed workstations, employee drag is disabled with helpful message', () => {
    const seats = [unplacedSeat1, unplacedSeat2];
    const isSeatPlaced = (s: SeatData) => s.placementSource === 'MANUAL' && s.x > 0 && s.y > 0;

    const html = renderToStaticMarkup(
      <FloorPlanOperationalPanel
        seats={seats}
        selectedSeat={null}
        offices={[]}
        areas={[]}
        departments={[]}
        office="ALL"
        area="ALL"
        departmentId="ALL"
        status="ALL"
        unassigned={dummyEmployees}
        employeeSearch=""
        unassignedLoading={false}
        isEditing={false}
        canAssign={true}
        canDragEmployeesToMap={true}
        hasFloorMap={true}
        isSeatPlaced={isSeatPlaced}
        onOfficeChange={vi.fn()}
        onAreaChange={vi.fn()}
        onDepartmentChange={vi.fn()}
        onStatusChange={vi.fn()}
        onEmployeeSearchChange={vi.fn()}
        onSeatSelect={vi.fn()}
        onBack={vi.fn()}
        onAssignmentRequested={vi.fn()}
        onEmployeeDragStart={vi.fn()}
      />
    );

    // Should show drag disabled explanation
    expect(html).toContain('Drag disabled:');
    expect(html).toContain('0 workstations placed on this floor');

    // Employees should have cursor-not-allowed and draggable="false"
    expect(html).toContain('cursor-not-allowed');
    expect(html).toContain('draggable="false"');
  });

  it('Drag Type B: in Normal mode when placed available workstations exist, employee drag is enabled', () => {
    const seats = [unplacedSeat1, placedSeatAvailable];
    const isSeatPlaced = (s: SeatData) => s.placementSource === 'MANUAL' && s.x > 0 && s.y > 0;

    const html = renderToStaticMarkup(
      <FloorPlanOperationalPanel
        seats={seats}
        selectedSeat={null}
        offices={[]}
        areas={[]}
        departments={[]}
        office="ALL"
        area="ALL"
        departmentId="ALL"
        status="ALL"
        unassigned={dummyEmployees}
        employeeSearch=""
        unassignedLoading={false}
        isEditing={false}
        canAssign={true}
        canDragEmployeesToMap={true}
        hasFloorMap={true}
        isSeatPlaced={isSeatPlaced}
        onOfficeChange={vi.fn()}
        onAreaChange={vi.fn()}
        onDepartmentChange={vi.fn()}
        onStatusChange={vi.fn()}
        onEmployeeSearchChange={vi.fn()}
        onSeatSelect={vi.fn()}
        onBack={vi.fn()}
        onAssignmentRequested={vi.fn()}
        onEmployeeDragStart={vi.fn()}
      />
    );

    // Should enable drag
    expect(html).toContain('draggable="true"');
    expect(html).toContain('cursor-grab');
    expect(html).toContain('title="Drag onto a placed, available workstation to assign"');
  });

  it('keeps employee drag disabled when available workstations are all unplaced', () => {
    const seats = [unplacedSeat1, { ...unplacedSeat2, x: 100, y: 100, placementSource: 'MANUAL' as const }];
    const isSeatPlaced = (s: SeatData) => s.placementSource === 'MANUAL' && s.x > 0 && s.y > 0;

    const html = renderToStaticMarkup(
      <FloorPlanOperationalPanel
        seats={seats}
        selectedSeat={null}
        offices={[]}
        areas={[]}
        departments={[]}
        office="ALL"
        area="ALL"
        departmentId="ALL"
        status="ALL"
        unassigned={dummyEmployees}
        employeeSearch=""
        unassignedLoading={false}
        isEditing={false}
        canAssign={true}
        canDragEmployeesToMap={true}
        hasFloorMap={true}
        isSeatPlaced={isSeatPlaced}
        onOfficeChange={vi.fn()}
        onAreaChange={vi.fn()}
        onDepartmentChange={vi.fn()}
        onStatusChange={vi.fn()}
        onEmployeeSearchChange={vi.fn()}
        onSeatSelect={vi.fn()}
        onBack={vi.fn()}
        onAssignmentRequested={vi.fn()}
        onEmployeeDragStart={vi.fn()}
      />
    );

    expect(html).toContain('no placed available workstations on this floor');
    expect(html).toContain('draggable="false"');
  });

  it('Unplace Workstation & Reverse Drag: renders reverse drag drop zone and Move to Unplaced action', () => {
    const seats = [unplacedSeat1, placedSeatAvailable];
    const isSeatPlaced = (s: SeatData) => s.placementSource === 'MANUAL' && s.x > 0 && s.y > 0;
    const onUnplaceSeatMock = vi.fn();

    const html = renderToStaticMarkup(
      <FloorPlanOperationalPanel
        seats={seats}
        selectedSeat={placedSeatAvailable}
        offices={[]}
        areas={[]}
        departments={[]}
        office="ALL"
        area="ALL"
        departmentId="ALL"
        status="ALL"
        unassigned={dummyEmployees}
        employeeSearch=""
        unassignedLoading={false}
        isEditing={true}
        canAssign={true}
        canDragEmployeesToMap={true}
        hasFloorMap={true}
        isSeatPlaced={isSeatPlaced}
        onOfficeChange={vi.fn()}
        onAreaChange={vi.fn()}
        onDepartmentChange={vi.fn()}
        onStatusChange={vi.fn()}
        onEmployeeSearchChange={vi.fn()}
        onSeatSelect={vi.fn()}
        onBack={vi.fn()}
        onAssignmentRequested={vi.fn()}
        onEmployeeDragStart={vi.fn()}
        onUnplaceSeat={onUnplaceSeatMock}
      />
    );

    // Reverse drag drop zone is present
    expect(html).toContain('Drop here to remove from floor map');

    // Selected placed workstation card renders with "Move to Unplaced" button
    expect(html).toContain('Move to Unplaced');
    expect(html).toContain('WS-03');
  });
});
