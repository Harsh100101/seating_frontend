export interface TransferEmployeeSearchRecord {
  employeeCode: string;
  fullName: string;
}

export interface TransferEmployeeSearchScope {
  role?: string | null;
  assignedUnitId?: string | null;
  sourceUnitId?: string | null;
}

export function normalizeTransferEmployeeSearch(value: string): string {
  return value.trim().toLocaleLowerCase();
}

/**
 * Resolve the Unit sent to the server for employee lookup. Global admins use
 * the Unit selected in the request form; Unit Admins are always constrained to
 * their authenticated assigned Unit.
 */
export function getTransferEmployeeSearchUnitId(scope: TransferEmployeeSearchScope): string | null {
  const unitId = scope.role === 'SUPER_ADMIN' || scope.role === 'TECH_ADMIN'
    ? scope.sourceUnitId
    : scope.assignedUnitId;
  const normalizedUnitId = unitId?.trim();
  return normalizedUnitId || null;
}

export function buildTransferEmployeeSearchParams(
  scope: TransferEmployeeSearchScope,
  search: string,
  limit = 20,
): URLSearchParams {
  const params = new URLSearchParams({ limit: String(limit) });
  const unitId = getTransferEmployeeSearchUnitId(scope);
  if (!unitId) return params;
  params.set('unitId', unitId);

  const normalizedSearch = search.trim();
  if (normalizedSearch) params.set('search', normalizedSearch);
  return params;
}

export function matchesTransferEmployeeSearch(
  employee: TransferEmployeeSearchRecord,
  value: string
): boolean {
  const query = normalizeTransferEmployeeSearch(value);
  if (!query) return true;

  return employee.employeeCode.toLocaleLowerCase().includes(query)
    || employee.fullName.toLocaleLowerCase().includes(query);
}

export function moveTransferEmployeeActiveIndex(
  currentIndex: number,
  count: number,
  direction: 1 | -1
): number {
  if (count <= 0) return -1;
  return (currentIndex + direction + count) % count;
}
