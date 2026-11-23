import { describe, expect, it } from 'vitest';
import {
  ALL_FILTER,
  changeEmployeeHierarchyFilter,
  clearEmployeeFilters,
  isAuthoritativeAreaIdFilter,
  readEmployeeFilterState,
  writeEmployeeFilterState,
  type EmployeeHierarchyFilterState
} from './employeeHierarchyFilters';

const baseState = (): EmployeeHierarchyFilterState => ({
  unitId: 'unit-1',
  buildingId: 'building-1',
  floorId: 'floor-1',
  officeArea: 'area-1',
  departmentId: 'department-1',
  sectionId: 'section-1',
  functionId: 'function-1',
  reportingTo: 'manager-1',
  hod: 'hod-1',
  seatingStatus: 'ASSIGNED',
  activeStatus: 'ACTIVE',
  search: 'Nishant',
  page: 8,
  pageSize: 25,
  sortBy: 'employeeCode',
  sortOrder: 'desc'
});

describe('employee hierarchy filter state', () => {
  it('does not reuse a stale areaId URL key for a newly selected office-area label', () => {
    const params = new URLSearchParams('areaId=area-old');
    expect(isAuthoritativeAreaIdFilter('Office Area B', params, new Set())).toBe(false);
    expect(isAuthoritativeAreaIdFilter('area-old', params, new Set())).toBe(true);
  });

  it('recognizes a loaded area option as an authoritative area ID', () => {
    expect(isAuthoritativeAreaIdFilter('area-1', new URLSearchParams(), new Set(['area-1']))).toBe(true);
  });
  it.each([
    ['unitId', ['buildingId', 'floorId', 'officeArea']],
    ['buildingId', ['floorId', 'officeArea']],
    ['floorId', ['officeArea']],
    ['officeArea', []],
    ['departmentId', ['sectionId', 'functionId']],
    ['sectionId', ['functionId']]
  ] as const)('changing %s clears stale descendants', (key, descendants) => {
    const next = changeEmployeeHierarchyFilter(baseState(), key, 'new-value');
    expect(next[key]).toBe('new-value');
    expect(next.page).toBe(1);
    for (const descendant of descendants) expect(next[descendant]).toBe(ALL_FILTER);
  });

  it.each(['buildingId', 'floorId', 'officeArea'] as const)('preserves organizational filters when changing physical %s', (key) => {
    const next = changeEmployeeHierarchyFilter(baseState(), key, 'new-value');
    expect(next.departmentId).toBe('department-1');
    expect(next.sectionId).toBe('section-1');
    expect(next.functionId).toBe('function-1');
  });

  it('round-trips authoritative area IDs and query state', () => {
    const params = writeEmployeeFilterState(baseState(), new Set(['area-1']));

    expect(params.get('unitId')).toBe('unit-1');
    expect(params.get('areaId')).toBe('area-1');
    expect(params.get('officeArea')).toBeNull();
    expect(params.get('page')).toBe('8');
    expect(params.get('pageSize')).toBe('25');
    expect(params.get('sortBy')).toBe('employeeCode');
    expect(params.get('sortOrder')).toBe('desc');
    expect(readEmployeeFilterState(params)).toMatchObject(baseState());
  });

  it('preserves legacy office-area names when no master ID exists', () => {
    const params = writeEmployeeFilterState({ ...baseState(), officeArea: 'Legacy Bay' });
    expect(params.get('officeArea')).toBe('Legacy Bay');
    expect(params.get('areaId')).toBeNull();
  });

  it('sanitizes invalid URL pagination and sort values', () => {
    const state = readEmployeeFilterState(new URLSearchParams({ page: '-2', pageSize: '17', sortBy: 'unsafe', sortOrder: 'unsafe' }));
    expect(state.page).toBe(1);
    expect(state.pageSize).toBe(50);
    expect(state.sortBy).toBe('employeeName');
    expect(state.sortOrder).toBe('asc');
  });

  it('clears all user filters without expanding a locked unit scope', () => {
    const cleared = clearEmployeeFilters(baseState(), 'unit-1');
    expect(cleared.unitId).toBe('unit-1');
    expect(cleared.buildingId).toBe(ALL_FILTER);
    expect(cleared.departmentId).toBe(ALL_FILTER);
    expect(cleared.search).toBe('');
    expect(cleared.seatingStatus).toBe('ALL');
    expect(cleared.page).toBe(1);
    expect(cleared.pageSize).toBe(25);
    expect(cleared.sortBy).toBe('employeeCode');
  });
});
