import { describe, expect, it } from 'vitest';
import { getTransferDestinationBuildings, getTransferDestinationFloors } from './transferDestinationFilters';

describe('getTransferDestinationFloors', () => {
  it('keeps only floors for the selected building that have workstations', () => {
    const result = getTransferDestinationFloors([
      { id: 'empty', name: 'Floor 1', floorNumber: 1, buildingId: 'building-1', _count: { seats: 0 } },
      { id: 'floor-2', name: '2nd FLOOR', floorNumber: 2, buildingId: 'building-1', _count: { seats: 41 } },
      { id: 'other', name: 'GF', floorNumber: 0, buildingId: 'building-2', _count: { seats: 10 } },
      { id: 'gf', name: 'GF', floorNumber: 0, buildingId: 'building-1', _count: { seats: 1 } },
    ], 'building-1');

    expect(result.map((floor) => floor.id)).toEqual(['gf', 'floor-2']);
  });

  it('keeps floors when seat counts are not supplied by a legacy response', () => {
    expect(getTransferDestinationFloors([
      { id: 'floor-1', name: 'Floor 1', floorNumber: 1, buildingId: 'building-1' },
    ], 'building-1')).toHaveLength(1);
  });
});

describe('getTransferDestinationBuildings', () => {
  it('includes both direct-Unit and legacy Plant-backed buildings without leaking another Unit', () => {
    const result = getTransferDestinationBuildings([
      { id: 'direct', name: 'Direct Unit Building', code: 'D-1', unitId: 'unit-1' },
      { id: 'legacy', name: 'Legacy Building', code: 'L-1', plantId: 'plant-1' },
      { id: 'foreign', name: 'Foreign Building', code: 'F-1', unitId: 'unit-2' },
    ], [
      { id: 'plant-1', unitId: 'unit-1' },
    ], 'unit-1');

    expect(result.map((building) => building.id)).toEqual(['direct', 'legacy']);
  });
});
