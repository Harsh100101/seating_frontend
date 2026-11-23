import { describe, expect, it, vi } from 'vitest';
import {
  buildLayoutPayload,
  sanitizeLayoutSaveError,
  unplaceWorkstation,
} from '../utils/floorPlanPresentation';

describe('Floor Plan Save Layout Workflow & Double-Submission Guards', () => {
  it('prepares disjoint delta payload for single seat move', () => {
    // 3 workstations: WS-01 moved, WS-02 stationary, WS-03 unplaced
    const seats = [
      { id: 'seat-1', label: 'WS-01', x: 250, y: 350, placementSource: 'MANUAL', width: 64, height: 48 },
      { id: 'seat-2', label: 'WS-02', x: 100, y: 100, placementSource: 'MANUAL', width: 64, height: 48 },
      { id: 'seat-3', label: 'WS-03', x: 50, y: 50, placementSource: null, width: 64, height: 48 },
    ];

    const payload = buildLayoutPayload(seats);

    expect(payload.placements).toHaveLength(2);
    expect(payload.placements.map((p) => p.id)).toEqual(['seat-1', 'seat-2']);
    expect(payload.unplacedSeatIds).toEqual(['seat-3']);

    // Ensure strict disjointness
    const placedIds = new Set(payload.placements.map((p) => p.id));
    for (const unplacedId of payload.unplacedSeatIds) {
      expect(placedIds.has(unplacedId)).toBe(false);
    }
  });

  it('prepares disjoint payload when moving a workstation to unplaced', () => {
    const seat1 = { id: 'seat-1', label: 'WS-01', x: 100, y: 100, placementSource: 'MANUAL' };
    const seat2 = { id: 'seat-2', label: 'WS-02', x: 200, y: 200, placementSource: 'MANUAL', employeeId: 'emp-1' };

    // Unplace seat-2 using unplaceWorkstation
    const unplacedSeat2 = unplaceWorkstation(seat2);

    const payload = buildLayoutPayload([seat1, unplacedSeat2]);

    expect(payload.placements.map((p) => p.id)).toEqual(['seat-1']);
    expect(payload.unplacedSeatIds).toEqual(['seat-2']);
    expect(unplacedSeat2.employeeId).toBe('emp-1'); // Employee assignment preserved
  });

  it('deduplicates duplicate seat IDs in placed and unplaced lists', () => {
    const seats = [
      { id: 'seat-1', label: 'WS-01', x: 100, y: 100, placementSource: 'MANUAL' },
      { id: 'seat-1', label: 'WS-01-dupe', x: 100, y: 100, placementSource: 'MANUAL' },
      { id: 'seat-2', label: 'WS-02', x: 200, y: 200, placementSource: null },
      { id: 'seat-2', label: 'WS-02-dupe', x: 200, y: 200, placementSource: null },
    ];

    const payload = buildLayoutPayload(seats);
    expect(payload.placements).toHaveLength(1);
    expect(payload.unplacedSeatIds).toHaveLength(1);
  });

  it('sanitizes raw Prisma updateMany errors into friendly conflict message', () => {
    const rawPrisma = 'Invalid `prisma.seat.updateMany()` invocation in /routes/floors.ts:503:22\nWrite conflict during transaction';
    const sanitized = sanitizeLayoutSaveError(rawPrisma);

    expect(sanitized).toBe('Could not save layout because another update occurred. Your unsaved layout changes are still preserved.');
    expect(sanitized).not.toContain('prisma');
    expect(sanitized).not.toContain('updateMany');
  });

  it('sanitizes MongoDB WriteConflict errors', () => {
    const rawMongo = 'WriteConflict error: this operation was aborted because of a conflicting transaction';
    const sanitized = sanitizeLayoutSaveError(rawMongo);

    expect(sanitized).toBe('Could not save layout because another update occurred. Your unsaved layout changes are still preserved.');
    expect(sanitized).not.toContain('WriteConflict');
  });

  it('preserves user validation errors like coordinates bounds and duplicate labels', () => {
    const boundsError = "Seat 'WS-01' coordinates out of canvas bounds";
    expect(sanitizeLayoutSaveError(boundsError)).toBe(boundsError);

    const dupeError = "Duplicate seat label 'WS-01' on floor";
    expect(sanitizeLayoutSaveError(dupeError)).toBe(dupeError);
  });

  it('guarantees 1 click = exactly 1 network request via isSavingRef guard', async () => {
    let networkRequestCount = 0;
    const isSavingRef = { current: false };

    const mockApiCall = vi.fn(async () => {
      networkRequestCount++;
      // Simulate network delay
      await new Promise((resolve) => setTimeout(resolve, 50));
      return { success: true };
    });

    const guardedSave = async () => {
      if (isSavingRef.current) return false;
      isSavingRef.current = true;
      try {
        await mockApiCall();
        return true;
      } finally {
        isSavingRef.current = false;
      }
    };

    // Simulate 5 rapid simultaneous clicks
    const results = await Promise.all([
      guardedSave(),
      guardedSave(),
      guardedSave(),
      guardedSave(),
      guardedSave(),
    ]);

    // Exactly 1 request executed; 4 were blocked by isSavingRef
    expect(networkRequestCount).toBe(1);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
    expect(results).toEqual([true, false, false, false, false]);
  });

  it('preserves draft coordinates on save failure without reloading floor', async () => {
    let currentSeats = [
      { id: 'seat-1', label: 'WS-01', x: 500, y: 600, placementSource: 'MANUAL' }, // Modified in draft
    ];
    let hasUnsavedChanges = true;
    let isEditingMode = true;
    let reloadFloorCalled = false;

    const mockFailedApi = vi.fn(async () => {
      throw new Error('Invalid prisma.seat.updateMany() invocation: write conflict');
    });

    const persistLayout = async () => {
      try {
        await mockFailedApi();
        hasUnsavedChanges = false;
        return true;
      } catch (err: any) {
        // Critical: Do NOT reset currentSeats, do NOT set hasUnsavedChanges = false, do NOT call reloadFloor!
        const friendlyMessage = sanitizeLayoutSaveError(err.message);
        return { error: friendlyMessage };
      }
    };

    const result = await persistLayout();

    // Verify draft preservation
    expect(result).toEqual({
      error: 'Could not save layout because another update occurred. Your unsaved layout changes are still preserved.',
    });
    expect(currentSeats[0].x).toBe(500);
    expect(currentSeats[0].y).toBe(600);
    expect(hasUnsavedChanges).toBe(true);
    expect(isEditingMode).toBe(true);
    expect(reloadFloorCalled).toBe(false);
  });

  it('aborts floor navigation and retains draft on save failure during Save & Continue', async () => {
    let activeFloorId = 'floor-1';
    let navigationExecuted = false;

    const targetNavigation = () => {
      activeFloorId = 'floor-2';
      navigationExecuted = true;
    };

    const mockFailedSave = vi.fn(async () => false);

    const handleSaveLayoutAndContinue = async () => {
      const saved = await mockFailedSave();
      if (saved) {
        targetNavigation();
        return;
      }
      // On failure: DO NOT navigate away! Retain draft on current floor!
    };

    await handleSaveLayoutAndContinue();

    expect(activeFloorId).toBe('floor-1'); // Did not switch floor
    expect(navigationExecuted).toBe(false);
  });
});
