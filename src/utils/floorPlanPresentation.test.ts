import { describe, expect, it } from 'vitest';
import {
  buildLayoutPayload,
  calculateCanonicalMarkerDragPosition,
  calculateNormalizedDropCoordinates,
  canManageFloorPlan,
  computeVisualMarkerOffsets,
  findSeatAtCanvasCoordinates,
  formatFloorSeatCount,
  getEmployeeInitials,
  getFloorPlanViewState,
  getTruncatedEmployeeName,
  getWorkstationAriaLabel,
  getZoomDetailLevel,
  hasFloorPlanAsset,
  hasSavedFloorPlanPosition,
  isFloorVisibleInFloorPlan,
  resolveFloorPlanSource,
  sanitizeLayoutSaveError,
  shouldClearMapMarkerState,
  uniqueFloorOptionsById,
  unplaceWorkstation,
} from './floorPlanPresentation';

describe('floor plan presentation helpers', () => {
  it('recognizes only a real configured asset as ready', () => {
    expect(hasFloorPlanAsset('/floor-plans/unit2-floor2.png')).toBe(true);
    expect(hasFloorPlanAsset('  ')).toBe(false);
    expect(hasFloorPlanAsset(null)).toBe(false);
  });

  it('keeps seeded assets public and routes uploaded assets through the protected API', () => {
    expect(resolveFloorPlanSource('floor-2', '/floor-plans/unit2-floor2.png'))
      .toBe('/floor-plans/unit2-floor2.png');
    expect(resolveFloorPlanSource('floor/2', '/uploads/floors/floor-2.png'))
      .toBe('/api/floors/floor%2F2/image');
  });

  it('allows floor-plan management only to existing administrator roles', () => {
    expect(canManageFloorPlan('SUPER_ADMIN')).toBe(true);
    expect(canManageFloorPlan('TECH_ADMIN')).toBe(true);
    expect(canManageFloorPlan('UNIT_ADMIN')).toBe(true);
    expect(canManageFloorPlan('EMPLOYEE')).toBe(false);
    expect(canManageFloorPlan(null)).toBe(false);
  });

  it('keeps the map canvas out of incomplete hierarchy and no-map states', () => {
    expect(getFloorPlanViewState({ buildingId: '', floorId: '', imageUrl: null })).toBe('SELECT_HIERARCHY');
    expect(getFloorPlanViewState({ buildingId: 'building-1', floorId: 'floor-1', imageUrl: null })).toBe('NO_FLOOR_MAP');
    expect(getFloorPlanViewState({ buildingId: 'building-1', floorId: 'floor-1', imageUrl: '/floor-plans/a.png' })).toBe('CANVAS');
  });

  it('treats zero as a valid saved coordinate while preserving explicit placement state', () => {
    expect(hasSavedFloorPlanPosition(100, 200, 'MANUAL')).toBe(true);
    expect(hasSavedFloorPlanPosition(100, 200, 'IMPORT')).toBe(true);
    expect(hasSavedFloorPlanPosition(100, 200, 'LEGACY_AUTO')).toBe(false);
    expect(hasSavedFloorPlanPosition(100, 200)).toBe(false);
    expect(hasSavedFloorPlanPosition(100, 0, 'MANUAL')).toBe(true);
    expect(hasSavedFloorPlanPosition(0, 200, 'MANUAL')).toBe(true);
    expect(hasSavedFloorPlanPosition(0, 0, 'MANUAL')).toBe(true);
    expect(hasSavedFloorPlanPosition(-1, 0, 'MANUAL')).toBe(false);
    expect(hasSavedFloorPlanPosition(undefined, undefined)).toBe(false);
  });

  it('deduplicates only repeated floor IDs and preserves distinct records with similar names', () => {
    const floors = uniqueFloorOptionsById([
      { id: 'floor-2', name: 'Floor 2' },
      { id: 'floor-2', name: 'Floor 2 duplicate delivery' },
      { id: 'legacy-2nd-floor', name: '2nd FLOOR' },
    ]);
    expect(floors).toEqual([
      { id: 'floor-2', name: 'Floor 2' },
      { id: 'legacy-2nd-floor', name: '2nd FLOOR' },
    ]);
  });

  it('keeps floor seat counts visually secondary and explicit', () => {
    expect(formatFloorSeatCount(1)).toBe('1 seat');
    expect(formatFloorSeatCount(41)).toBe('41 seats');
    expect(formatFloorSeatCount(0)).toBe('0 seats');
  });

  it('hides only completely unused floors from the operational selector', () => {
    expect(isFloorVisibleInFloorPlan({ workstationCount: 0, floorMapConfigured: false, hasLayoutData: false })).toBe(false);
    expect(isFloorVisibleInFloorPlan({ workstationCount: 0, floorMapConfigured: true, hasLayoutData: false })).toBe(true);
    expect(isFloorVisibleInFloorPlan({ workstationCount: 1, floorMapConfigured: false, hasLayoutData: false })).toBe(true);
    expect(isFloorVisibleInFloorPlan({ workstationCount: 0, floorMapConfigured: false, hasLayoutData: true })).toBe(true);
  });

  it('clears a map marker popup when its workstation is unplaced or filtered out', () => {
    const placed = new Set(['ws-1', 'ws-2']);
    const visible = new Set(['ws-1']);

    expect(shouldClearMapMarkerState('ws-1', placed, visible)).toBe(false);
    expect(shouldClearMapMarkerState('ws-2', placed, visible)).toBe(true);
    expect(shouldClearMapMarkerState('ws-3', placed, visible)).toBe(true);
    expect(shouldClearMapMarkerState(null, placed, visible)).toBe(false);
  });

  it('calculates normalized drop coordinates correctly with zoom and pan', () => {
    const containerBounds = { left: 100, top: 50 };
    const canvasWidth = 1600;
    const canvasHeight = 1000;

    // Standard 1x zoom, zero pan, drop at client (900, 550) -> viewport (800, 500)
    // Desk 64x48 centered -> unadjusted (800 - 32 = 768, 500 - 24 = 476)
    const result1x = calculateNormalizedDropCoordinates({
      clientX: 900,
      clientY: 550,
      containerBounds,
      stagePos: { x: 0, y: 0 },
      stageScale: 1,
      canvasWidth,
      canvasHeight,
      itemWidth: 64,
      itemHeight: 48,
    });
    expect(result1x.xRatio).toBeGreaterThan(0);
    expect(result1x.xRatio).toBeLessThan(1);
    expect(result1x.clampedX).toBe(768);
    expect(result1x.clampedY).toBe(476);
    expect(hasSavedFloorPlanPosition(result1x.clampedX, result1x.clampedY, 'MANUAL')).toBe(true);

    // Zoomed in 2x with pan (x: 100, y: 100)
    const resultZoomPan = calculateNormalizedDropCoordinates({
      clientX: 500, // viewportX = 400. canvasX = (400 - 100) / 2 = 150
      clientY: 350, // viewportY = 300. canvasY = (300 - 100) / 2 = 100
      containerBounds,
      stagePos: { x: 100, y: 100 },
      stageScale: 2,
      canvasWidth,
      canvasHeight,
      itemWidth: 64,
      itemHeight: 48,
    });
    expect(resultZoomPan.clampedX).toBe(150 - 32);
    expect(resultZoomPan.clampedY).toBe(100 - 24);

    // Clamping out-of-bounds drop at top-left
    const resultNegative = calculateNormalizedDropCoordinates({
      clientX: 0,
      clientY: 0,
      containerBounds,
      stagePos: { x: 0, y: 0 },
      stageScale: 1,
      canvasWidth,
      canvasHeight,
    });
    expect(resultNegative.clampedX).toBe(0);
    expect(resultNegative.clampedY).toBe(0);
    expect(resultNegative.xRatio).toBeGreaterThanOrEqual(0);
    expect(resultNegative.yRatio).toBeGreaterThanOrEqual(0);

    // Clamping out-of-bounds drop beyond canvas
    const resultFar = calculateNormalizedDropCoordinates({
      clientX: 10000,
      clientY: 10000,
      containerBounds,
      stagePos: { x: 0, y: 0 },
      stageScale: 1,
      canvasWidth,
      canvasHeight,
      itemWidth: 64,
      itemHeight: 48,
    });
    expect(resultFar.clampedX).toBe(canvasWidth - 64);
    expect(resultFar.clampedY).toBe(canvasHeight - 48);
  });

  it('finds seat markers at canvas coordinates taking zoom and pan into account', () => {
    const containerBounds = { left: 0, top: 0 };
    const seats = [
      { id: 's1', label: 'WS-01', x: 100, y: 100, width: 64, height: 48, status: 'AVAILABLE', employeeId: null },
      { id: 's2', label: 'WS-02', x: 200, y: 100, width: 64, height: 48, status: 'OCCUPIED', employeeId: 'emp-1' },
    ];

    // Pointer over WS-01 with scale=1, pos={0, 0}
    const hit1 = findSeatAtCanvasCoordinates({
      clientX: 120,
      clientY: 120,
      containerBounds,
      stagePos: { x: 0, y: 0 },
      stageScale: 1,
      seats,
    });
    expect(hit1?.id).toBe('s1');

    // Pointer over WS-02 with scale=1.5, pos={50, 50}
    // clientX = 50 + 210 * 1.5 = 365
    // clientY = 50 + 110 * 1.5 = 215
    const hit2 = findSeatAtCanvasCoordinates({
      clientX: 365,
      clientY: 215,
      containerBounds,
      stagePos: { x: 50, y: 50 },
      stageScale: 1.5,
      seats,
    });
    expect(hit2?.id).toBe('s2');

    // Pointer outside any seat
    const miss = findSeatAtCanvasCoordinates({
      clientX: 500,
      clientY: 500,
      containerBounds,
      stagePos: { x: 0, y: 0 },
      stageScale: 1,
      seats,
    });
    expect(miss).toBeUndefined();
  });

  it('unplaceWorkstation clears placementSource to null without resetting x,y or losing employee assignment', () => {
    const placedSeat = {
      id: 'seat-101',
      label: 'WS-01',
      x: 350,
      y: 420,
      width: 64,
      height: 48,
      placementSource: 'MANUAL',
      employeeId: 'emp-42',
      employee: { id: 'emp-42', fullName: 'John Doe', employeeCode: 'EMP042' },
      status: 'OCCUPIED',
    };

    expect(hasSavedFloorPlanPosition(placedSeat.x, placedSeat.y, placedSeat.placementSource)).toBe(true);

    const unplaced = unplaceWorkstation(placedSeat);
    expect(unplaced.placementSource).toBeNull();
    // Coordinates must NOT be reset to 0,0
    expect(unplaced.x).toBe(350);
    expect(unplaced.y).toBe(420);
    // Employee assignment must remain completely intact
    expect(unplaced.employeeId).toBe('emp-42');
    expect(unplaced.employee.fullName).toBe('John Doe');
    expect(unplaced.status).toBe('OCCUPIED');

    // hasSavedFloorPlanPosition must evaluate to false
    expect(hasSavedFloorPlanPosition(unplaced.x, unplaced.y, unplaced.placementSource)).toBe(false);
  });

  it('keeps collision presentation offsets out of canonical drag persistence', () => {
    const result = calculateCanonicalMarkerDragPosition({
      persistent: { x: 100, y: 200 },
      presentation: { x: 118, y: 188 },
      dragged: { x: 168, y: 238 },
      canvasWidth: 500,
      canvasHeight: 400,
      markerWidth: 54,
      markerHeight: 30,
    });

    // The user moved the displayed marker by +50px; saved position follows
    // that movement from its canonical origin rather than saving offset +18/-12.
    expect(result).toEqual({ x: 150, y: 250 });
  });

  it('allows zero-origin markers through save payloads without converting them to unplaced seats', () => {
    const payload = buildLayoutPayload([
      { id: 'zero-x', label: 'WS-00X', x: 0, y: 120, placementSource: 'MANUAL' },
      { id: 'zero-y', label: 'WS-00Y', x: 200, y: 0, placementSource: 'IMPORT' },
      { id: 'zero-both', label: 'WS-000', x: 0, y: 0, placementSource: 'MANUAL' },
    ]);
    expect(payload.placements.map((seat) => seat.id)).toEqual(['zero-x', 'zero-y', 'zero-both']);
    expect(payload.unplacedSeatIds).toEqual([]);
  });

  describe('buildLayoutPayload', () => {
    it('computes strictly disjoint placements and unplacedSeatIds', () => {
      const seats = [
        { id: 'seat-1', label: 'WS-01', x: 100, y: 150, placementSource: 'MANUAL', width: 64, height: 48 },
        { id: 'seat-2', label: 'WS-02', x: 200, y: 250, placementSource: 'MANUAL', width: 64, height: 48 },
        { id: 'seat-3', label: 'WS-03', x: 300, y: 350, placementSource: null, width: 64, height: 48 },
        { id: 'seat-4', label: 'WS-04', x: 0, y: 0, placementSource: null, width: 64, height: 48 },
      ];

      const payload = buildLayoutPayload(seats);

      // Placements contains exactly placed seats
      expect(payload.placements.map((p) => p.id)).toEqual(['seat-1', 'seat-2']);
      expect(payload.placements.every((p) => p.placementSource === 'MANUAL')).toBe(true);

      // Unplaced contains exactly unplaced seat IDs
      expect(payload.unplacedSeatIds).toEqual(['seat-3', 'seat-4']);

      // Backward compatibility: seats mirrors placements
      expect(payload.seats).toEqual(payload.placements);

      // Strictly disjoint: no unplaced ID exists in placements
      const placedIds = new Set(payload.placements.map((p) => p.id));
      for (const unplacedId of payload.unplacedSeatIds) {
        expect(placedIds.has(unplacedId)).toBe(false);
      }
    });

    it('deduplicates seat IDs and strips temporary prefixes', () => {
      const seats = [
        { id: 'seat-1', label: 'WS-01', x: 100, y: 150, placementSource: 'MANUAL' },
        { id: 'seat-1', label: 'WS-01-dupe', x: 120, y: 160, placementSource: 'MANUAL' },
        { id: 'temp-new-1', label: 'WS-99', x: 400, y: 400, placementSource: 'MANUAL' },
        { id: 'seat-3', label: 'WS-03', x: 300, y: 300, placementSource: null },
        { id: 'seat-3', label: 'WS-03-dupe', x: 300, y: 300, placementSource: null },
        { id: 'temp-unplaced-new', label: 'WS-100', x: 0, y: 0, placementSource: null },
      ];

      const payload = buildLayoutPayload(seats);

      // Placed seat-1 deduplicated to 1 item
      const placedSeat1 = payload.placements.filter((p) => p.id === 'seat-1');
      expect(placedSeat1).toHaveLength(1);

      // temp-new-1 has id undefined for creation
      const tempPlaced = payload.placements.find((p) => p.label === 'WS-99');
      expect(tempPlaced).toBeDefined();
      expect(tempPlaced?.id).toBeUndefined();

      // unplacedSeatIds contains seat-3 once, and excludes temp unplaced
      expect(payload.unplacedSeatIds).toEqual(['seat-3']);
    });

    it('enforces disjointness even if conflicting data is supplied', () => {
      // Simulate edge case where an ID was mistakenly placed and unplaced
      const seats = [
        { id: 'seat-conflict', label: 'WS-X', x: 100, y: 100, placementSource: 'MANUAL' },
        { id: 'seat-conflict', label: 'WS-X', x: 100, y: 100, placementSource: null },
      ];

      const payload = buildLayoutPayload(seats);
      const placedIds = new Set(payload.placements.map((p) => p.id));
      for (const id of payload.unplacedSeatIds) {
        expect(placedIds.has(id)).toBe(false);
      }
    });
  });

  describe('sanitizeLayoutSaveError', () => {
    it('sanitizes raw Prisma updateMany errors', () => {
      const rawError = 'Invalid prisma.seat.updateMany() invocation:\nWrite conflict in transaction on collection seating.Seat';
      const sanitized = sanitizeLayoutSaveError(rawError);
      expect(sanitized).toBe('Could not save layout because another update occurred. Your unsaved layout changes are still preserved.');
    });

    it('sanitizes MongoDB write conflicts and transaction errors', () => {
      expect(sanitizeLayoutSaveError('WriteConflict error: Transaction 42 conflict'))
        .toBe('Could not save layout because another update occurred. Your unsaved layout changes are still preserved.');
      expect(sanitizeLayoutSaveError('MongoServerError: deadlock detected in transaction'))
        .toBe('Could not save layout because another update occurred. Your unsaved layout changes are still preserved.');
    });

    it('sanitizes generic or undefined errors to friendly conflict fallback', () => {
      expect(sanitizeLayoutSaveError(null))
        .toBe('Could not save layout because another update occurred. Your unsaved layout changes are still preserved.');
      expect(sanitizeLayoutSaveError(''))
        .toBe('Could not save layout because another update occurred. Your unsaved layout changes are still preserved.');
    });

    it('preserves clean user validation messages', () => {
      const boundsError = "Seat 'WS-05' coordinates out of canvas bounds";
      expect(sanitizeLayoutSaveError(boundsError)).toBe(boundsError);

      const dupeError = "Duplicate seat label 'WS-01' on floor";
      expect(sanitizeLayoutSaveError(dupeError)).toBe(dupeError);
    });
  });

  describe('getZoomDetailLevel', () => {
    it('categorizes zoom scale into LOW (< 0.60), NORMAL (0.60-1.30), and HIGH (> 1.30) detail levels', () => {
      // 37% zoom (0.37) -> LOW (< 0.60: show only WS label + status dot)
      expect(getZoomDetailLevel(0.37)).toBe('LOW');
      // Low zoom boundary: < 0.60
      expect(getZoomDetailLevel(0.50)).toBe('LOW');
      expect(getZoomDetailLevel(0.599)).toBe('LOW');

      // 60% boundary -> NORMAL (0.60 to 1.30: show WS label + employee ID or Vacant)
      expect(getZoomDetailLevel(0.60)).toBe('NORMAL');
      // 75% zoom (0.75) -> NORMAL
      expect(getZoomDetailLevel(0.75)).toBe('NORMAL');
      // 100% zoom (1.00) -> NORMAL
      expect(getZoomDetailLevel(1.00)).toBe('NORMAL');
      // 125% zoom (1.25) -> NORMAL
      expect(getZoomDetailLevel(1.25)).toBe('NORMAL');
      // 130% boundary -> NORMAL
      expect(getZoomDetailLevel(1.30)).toBe('NORMAL');

      // High zoom: > 1.30 (ultra-compact: WS label + employee ID, no full name expansion)
      expect(getZoomDetailLevel(1.301)).toBe('HIGH');
      // 150% zoom (1.50) -> HIGH
      expect(getZoomDetailLevel(1.50)).toBe('HIGH');
      expect(getZoomDetailLevel(2.00)).toBe('HIGH');
    });

    it('safely handles non-finite numbers and unexpected input', () => {
      expect(getZoomDetailLevel(NaN)).toBe('NORMAL');
      expect(getZoomDetailLevel(Infinity)).toBe('HIGH');
      expect(getZoomDetailLevel(-Infinity)).toBe('LOW');
      expect(getZoomDetailLevel(undefined as any)).toBe('NORMAL');
      expect(getZoomDetailLevel(null as any)).toBe('NORMAL');
    });
  });

  describe('getEmployeeInitials', () => {
    it('extracts first and last initials for multi-word employee names', () => {
      // e.g. 'Raj Rahulbhai Patil' -> 'RP'
      expect(getEmployeeInitials('Raj Rahulbhai Patil')).toBe('RP');
      // e.g. 'Nishant Kumar' -> 'NK'
      expect(getEmployeeInitials('Nishant Kumar')).toBe('NK');
      // e.g. 'Sojitra Devansh Mehulbhai' -> 'SM'
      expect(getEmployeeInitials('Sojitra Devansh Mehulbhai')).toBe('SM');
      // 4-word name -> first and last word initials
      expect(getEmployeeInitials('Krishna Vinayak Singh Yadav')).toBe('KY');
    });

    it('extracts single initial for single-word names', () => {
      expect(getEmployeeInitials('Cher')).toBe('C');
      expect(getEmployeeInitials('admin')).toBe('A');
    });

    it('handles extra whitespaces and safely falls back on empty or null inputs', () => {
      expect(getEmployeeInitials('   Raj   Patil   ')).toBe('RP');
      expect(getEmployeeInitials('')).toBe('');
      expect(getEmployeeInitials('   ')).toBe('');
      expect(getEmployeeInitials(null)).toBe('');
      expect(getEmployeeInitials(undefined)).toBe('');
    });
  });

  describe('getTruncatedEmployeeName', () => {
    it('formats multi-word full names as First Name + Second Word Initial', () => {
      // e.g. 'Raj Rahulbhai Patil' -> 'Raj R.'
      expect(getTruncatedEmployeeName('Raj Rahulbhai Patil')).toBe('Raj R.');
      // e.g. 'Nishant Kumar' -> 'Nishant K.'
      expect(getTruncatedEmployeeName('Nishant Kumar')).toBe('Nishant K.');
      // e.g. 'Sojitra Devansh Mehulbhai' -> 'Sojitra D.'
      expect(getTruncatedEmployeeName('Sojitra Devansh Mehulbhai')).toBe('Sojitra D.');
    });

    it('returns single word names intact if within length', () => {
      expect(getTruncatedEmployeeName('Cher')).toBe('Cher');
      expect(getTruncatedEmployeeName('Admin')).toBe('Admin');
    });

    it('bounds long names when maxLength is provided to prevent marker expansion', () => {
      // 'Raj R.' has length 6
      expect(getTruncatedEmployeeName('Raj Rahulbhai Patil', 5)).toBe('Raj R');
      expect(getTruncatedEmployeeName('Raj Rahulbhai Patil', 10)).toBe('Raj R.');

      // Long first name bounding
      expect(getTruncatedEmployeeName('Bipinkumar Vishwanath Jani', 10)).toBe('Bipinkumar');
      expect(getTruncatedEmployeeName('Supercalifragilisticexpialidocious', 12)).toBe('Supercalifra');
    });

    it('safely handles empty or missing values', () => {
      expect(getTruncatedEmployeeName('')).toBe('');
      expect(getTruncatedEmployeeName('   ')).toBe('');
      expect(getTruncatedEmployeeName(null)).toBe('');
      expect(getTruncatedEmployeeName(undefined)).toBe('');
    });
  });

  describe('getWorkstationAriaLabel', () => {
    it('builds accessible label for occupied workstations', () => {
      const label = getWorkstationAriaLabel({
        label: 'WS-03',
        employee: {
          employeeCode: '23321',
          fullName: 'Raj Rahulbhai Patil',
        },
      });
      expect(label).toBe('WS-03, occupied by employee 23321, Raj Rahulbhai Patil');
    });

    it('builds accessible label for available workstations', () => {
      expect(getWorkstationAriaLabel({ label: 'WS-08' })).toBe('WS-08, available');
      expect(getWorkstationAriaLabel({ label: 'WS-08', status: 'AVAILABLE' })).toBe('WS-08, available');
    });

    it('handles maintenance and reserved statuses', () => {
      expect(getWorkstationAriaLabel({ label: 'WS-09', status: 'MAINTENANCE' })).toBe('WS-09, maintenance');
      expect(getWorkstationAriaLabel({ label: 'WS-10', status: 'RESERVED' })).toBe('WS-10, reserved');
    });

    it('handles partial employee details gracefully', () => {
      expect(getWorkstationAriaLabel({
        label: 'WS-01',
        employee: { employeeCode: '21974' },
      })).toBe('WS-01, occupied by employee 21974');

      expect(getWorkstationAriaLabel({
        label: 'WS-02',
        employee: { fullName: 'Dhruvilkumar Vasava' },
      })).toBe('WS-02, occupied by Dhruvilkumar Vasava');

      expect(getWorkstationAriaLabel({
        label: 'WS-04',
        status: 'OCCUPIED',
      })).toBe('WS-04, occupied');
    });
  });

  describe('computeVisualMarkerOffsets', () => {
    it('detects collisions and computes visual offsets for near-coordinate desks using ultra-compact dimensions (~54x30px)', () => {
      // Test physically overlapping ultra-compact markers (54x30)
      // Seat 1 at (656, 507), Seat 2 at (670, 520) - heavily overlapping with 54x30 box
      const seats = [
        { id: 'ws-01', label: 'WS-01', x: 656, y: 507 },
        { id: 'ws-03', label: 'WS-03', x: 670, y: 520 },
        { id: 'ws-99', label: 'WS-99', x: 1200, y: 800 }, // Far away
      ];

      // Calling without options uses ultra-compact defaults (54x30, minGap: 4)
      const offsetMap = computeVisualMarkerOffsets(seats);

      // WS-01 and WS-03 collide
      const offset01 = offsetMap.get('ws-01');
      const offset03 = offsetMap.get('ws-03');
      const offset99 = offsetMap.get('ws-99');

      expect(offset01?.hasCollision).toBe(true);
      expect(offset03?.hasCollision).toBe(true);

      // Visual coordinates should be offset to prevent label occlusion
      expect(offset01?.visualY).not.toBe(507);
      expect(offset03?.visualY).not.toBe(520);
      expect(offset01!.visualY).toBeLessThan(offset03!.visualY);

      // Separated bounding boxes should no longer occlude
      const ws01Bottom = offset01!.visualY + 30;
      const ws03Top = offset03!.visualY;
      expect(ws03Top).toBeGreaterThanOrEqual(ws01Bottom);

      // WS-99 is far away and should have no collision or offset
      expect(offset99?.hasCollision).toBe(false);
      expect(offset99?.visualX).toBe(1200);
      expect(offset99?.visualY).toBe(800);
    });

    it('NEVER mutates stored/physical coordinates in the input seats array', () => {
      // Freeze input objects to guarantee zero mutation
      const originalSeat1 = Object.freeze({ id: 's1', x: 656, y: 507, width: 54, height: 30 });
      const originalSeat2 = Object.freeze({ id: 's2', x: 670, y: 520, width: 54, height: 30 });
      const seats = [originalSeat1, originalSeat2];

      const offsetMap = computeVisualMarkerOffsets(seats);

      // Physical coordinates MUST remain completely unchanged
      expect(originalSeat1.x).toBe(656);
      expect(originalSeat1.y).toBe(507);
      expect(originalSeat2.x).toBe(670);
      expect(originalSeat2.y).toBe(520);

      // Visual offsets are presentation-only
      expect(offsetMap.get('s1')?.visualY).toBeDefined();
      expect(offsetMap.get('s2')?.visualY).toBeDefined();
    });

    it('handles normalized ratio test coordinates (e.g. x=0.50, 0.505, 0.51)', () => {
      const seats = [
        { id: 'ratio-1', x: 0.50, y: 0.50 },
        { id: 'ratio-2', x: 0.505, y: 0.50 },
        { id: 'ratio-3', x: 0.51, y: 0.50 },
      ];

      const offsetMap = computeVisualMarkerOffsets(seats, {
        markerWidth: 0.04,
        markerHeight: 0.03,
        minGap: 0.005,
      });

      expect(offsetMap.size).toBe(3);
      expect(offsetMap.get('ratio-1')?.hasCollision).toBe(true);
      expect(offsetMap.get('ratio-2')?.hasCollision).toBe(true);
      expect(offsetMap.get('ratio-3')?.hasCollision).toBe(true);

      // Check that visual offsets dispersed the overlapping markers
      const r1 = offsetMap.get('ratio-1')!;
      const r2 = offsetMap.get('ratio-2')!;
      const r3 = offsetMap.get('ratio-3')!;

      // Physical coordinates unchanged
      expect(seats[0].x).toBe(0.50);
      expect(seats[1].x).toBe(0.505);
      expect(seats[2].x).toBe(0.51);

      // Visual coordinates shifted
      const distinctPositions = new Set([
        `${r1.visualX},${r1.visualY}`,
        `${r2.visualX},${r2.visualY}`,
        `${r3.visualX},${r3.visualY}`,
      ]);
      expect(distinctPositions.size).toBe(3);
    });

    it('handles empty and single seat inputs without error', () => {
      expect(computeVisualMarkerOffsets([])).toEqual(new Map());

      const single = [{ id: 'solo', x: 100, y: 150 }];
      const singleMap = computeVisualMarkerOffsets(single);
      expect(singleMap.get('solo')).toEqual({
        visualX: 100,
        visualY: 150,
        hasCollision: false,
      });
    });

    it('performance benchmark: executes efficiently under 50ms for 100+ seats with ultra-compact markers', () => {
      const seatCount = 120;
      const seats: Array<{ id: string; x: number; y: number; width: number; height: number }> = [];

      for (let i = 0; i < seatCount; i++) {
        // Create 10 clusters of tightly packed seats to stress-test collision detection
        const cluster = Math.floor(i / 12);
        const indexInCluster = i % 12;
        seats.push({
          id: `bench-seat-${i}`,
          x: (cluster % 4) * 300 + (indexInCluster % 3) * 20,
          y: Math.floor(cluster / 4) * 300 + Math.floor(indexInCluster / 3) * 20,
          width: 54,
          height: 30,
        });
      }

      const startTime = performance.now();
      const results = computeVisualMarkerOffsets(seats, { markerWidth: 54, markerHeight: 30, minGap: 4 });
      const durationMs = performance.now() - startTime;

      expect(results.size).toBe(seatCount);
      // Algorithm should execute in < 50ms (typically under 5ms in V8)
      expect(durationMs).toBeLessThan(50);
    });
  });
});
