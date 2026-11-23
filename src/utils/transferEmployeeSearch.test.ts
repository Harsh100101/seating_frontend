import { describe, expect, it } from 'vitest';
import {
  buildTransferEmployeeSearchParams,
  getTransferEmployeeSearchUnitId,
  matchesTransferEmployeeSearch,
  moveTransferEmployeeActiveIndex,
  normalizeTransferEmployeeSearch,
} from './transferEmployeeSearch';

const employee = { employeeCode: 'EMP00123', fullName: 'Amit Tiwari' };

describe('transfer employee search', () => {
  it('matches full and partial employee IDs case-insensitively', () => {
    expect(matchesTransferEmployeeSearch(employee, 'EMP00123')).toBe(true);
    expect(matchesTransferEmployeeSearch(employee, '0012')).toBe(true);
    expect(matchesTransferEmployeeSearch(employee, 'emp00123')).toBe(true);
  });

  it('matches full and partial multi-word names case-insensitively', () => {
    expect(matchesTransferEmployeeSearch(employee, 'Amit Tiwari')).toBe(true);
    expect(matchesTransferEmployeeSearch(employee, 'tiw')).toBe(true);
    expect(matchesTransferEmployeeSearch(employee, '  AMIT  ')).toBe(true);
    expect(matchesTransferEmployeeSearch(employee, 'Rahul')).toBe(false);
  });

  it('supports wraparound keyboard navigation and empty results', () => {
    expect(moveTransferEmployeeActiveIndex(-1, 3, 1)).toBe(0);
    expect(moveTransferEmployeeActiveIndex(0, 3, -1)).toBe(2);
    expect(moveTransferEmployeeActiveIndex(2, 3, 1)).toBe(0);
    expect(moveTransferEmployeeActiveIndex(-1, 0, 1)).toBe(-1);
  });

  it('trims the server query before matching', () => {
    expect(normalizeTransferEmployeeSearch('  Emp00123  ')).toBe('emp00123');
  });

  it('scopes Super Admin searches to the selected source Unit', () => {
    expect(getTransferEmployeeSearchUnitId({ role: 'SUPER_ADMIN', sourceUnitId: ' unit-2 ' })).toBe('unit-2');
    expect(getTransferEmployeeSearchUnitId({ role: 'SUPER_ADMIN', sourceUnitId: null })).toBeNull();
  });

  it('keeps Unit Admin search fixed to the authenticated Unit', () => {
    const params = buildTransferEmployeeSearchParams(
      { role: 'UNIT_ADMIN', assignedUnitId: 'unit-1', sourceUnitId: 'unit-2' },
      '  Amit Tiwari  ',
    );
    expect(params.get('unitId')).toBe('unit-1');
    expect(params.get('search')).toBe('Amit Tiwari');
  });

  it('does not issue an unscoped Super Admin employee query', () => {
    const params = buildTransferEmployeeSearchParams({ role: 'SUPER_ADMIN' }, 'EMP00123');
    expect(params.get('unitId')).toBeNull();
    expect(params.get('search')).toBeNull();
  });
});
