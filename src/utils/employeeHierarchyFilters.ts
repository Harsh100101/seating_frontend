export const ALL_FILTER = 'ALL';

export type EmployeeSortField = 'employeeCode' | 'employeeName' | 'active';

export interface EmployeeHierarchyFilterState {
  unitId: string;
  buildingId: string;
  floorId: string;
  officeArea: string;
  departmentId: string;
  sectionId: string;
  functionId: string;
  reportingTo: string;
  hod: string;
  seatingStatus: 'ALL' | 'ASSIGNED' | 'UNASSIGNED';
  activeStatus: 'ALL' | 'ACTIVE' | 'INACTIVE';
  search: string;
  page: number;
  pageSize: number;
  sortBy: EmployeeSortField;
  sortOrder: 'asc' | 'desc';
}

const allowedPageSizes = new Set([25, 50, 100]);
const allowedSortFields = new Set<EmployeeSortField>(['employeeCode', 'employeeName', 'active']);

const positiveInt = (value: string | null, fallback: number) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const readEmployeeFilterState = (params: URLSearchParams): EmployeeHierarchyFilterState => {
  const pageSize = positiveInt(params.get('pageSize'), 50);
  const sortBy = params.get('sortBy') as EmployeeSortField;

  return {
    unitId: params.get('unitId') || ALL_FILTER,
    buildingId: params.get('buildingId') || ALL_FILTER,
    floorId: params.get('floorId') || ALL_FILTER,
    officeArea: params.get('areaId') || params.get('officeArea') || ALL_FILTER,
    departmentId: params.get('departmentId') || ALL_FILTER,
    sectionId: params.get('sectionId') || ALL_FILTER,
    functionId: params.get('functionId') || ALL_FILTER,
    reportingTo: params.get('reportingTo') || ALL_FILTER,
    hod: params.get('hod') || ALL_FILTER,
    seatingStatus: params.get('seatingStatus') === 'ASSIGNED' || params.get('status') === 'assigned'
      ? 'ASSIGNED'
      : params.get('seatingStatus') === 'UNASSIGNED' || params.get('status') === 'unassigned'
        ? 'UNASSIGNED'
        : 'ALL',
    activeStatus: params.get('activeStatus') === 'ACTIVE' || params.get('isActive') === 'active'
      ? 'ACTIVE'
      : params.get('activeStatus') === 'INACTIVE' || params.get('isActive') === 'inactive'
        ? 'INACTIVE'
        : 'ALL',
    search: params.get('search') || '',
    page: positiveInt(params.get('page'), 1),
    pageSize: allowedPageSizes.has(pageSize) ? pageSize : 50,
    sortBy: allowedSortFields.has(sortBy) ? sortBy : 'employeeName',
    sortOrder: params.get('sortOrder') === 'desc' ? 'desc' : 'asc'
  };
};

export const writeEmployeeFilterState = (
  state: EmployeeHierarchyFilterState,
  areaIds: Set<string> = new Set()
): URLSearchParams => {
  const params = new URLSearchParams();
  const setIfPresent = (key: string, value: string) => {
    if (value && value !== ALL_FILTER) params.set(key, value);
  };

  setIfPresent('unitId', state.unitId);
  setIfPresent('buildingId', state.buildingId);
  setIfPresent('floorId', state.floorId);
  if (state.officeArea !== ALL_FILTER) {
    setIfPresent(areaIds.has(state.officeArea) ? 'areaId' : 'officeArea', state.officeArea);
  }
  setIfPresent('departmentId', state.departmentId);
  setIfPresent('sectionId', state.sectionId);
  setIfPresent('functionId', state.functionId);
  setIfPresent('reportingTo', state.reportingTo);
  setIfPresent('hod', state.hod);
  setIfPresent('seatingStatus', state.seatingStatus);
  setIfPresent('activeStatus', state.activeStatus);
  setIfPresent('search', state.search.trim());
  params.set('page', String(state.page));
  params.set('pageSize', String(state.pageSize));
  params.set('sortBy', state.sortBy);
  params.set('sortOrder', state.sortOrder);
  return params;
};

export type HierarchyFilterKey = 'unitId' | 'buildingId' | 'floorId' | 'officeArea' | 'departmentId' | 'sectionId' | 'functionId';

export const changeEmployeeHierarchyFilter = (
  state: EmployeeHierarchyFilterState,
  key: HierarchyFilterKey,
  value: string
): EmployeeHierarchyFilterState => {
  const next = { ...state, [key]: value || ALL_FILTER, page: 1 } as EmployeeHierarchyFilterState;

  if (key === 'unitId') {
    next.buildingId = ALL_FILTER;
    next.floorId = ALL_FILTER;
    next.officeArea = ALL_FILTER;
  } else if (key === 'buildingId') {
    next.floorId = ALL_FILTER;
    next.officeArea = ALL_FILTER;
  } else if (key === 'floorId') {
    next.officeArea = ALL_FILTER;
  } else if (key === 'departmentId') {
    next.sectionId = ALL_FILTER;
    next.functionId = ALL_FILTER;
  } else if (key === 'sectionId') {
    next.functionId = ALL_FILTER;
  }

  return next;
};

export const clearEmployeeFilters = (
  state: EmployeeHierarchyFilterState,
  lockedUnitId?: string | null
): EmployeeHierarchyFilterState => ({
  ...state,
  unitId: lockedUnitId || ALL_FILTER,
  buildingId: ALL_FILTER,
  floorId: ALL_FILTER,
  officeArea: ALL_FILTER,
  departmentId: ALL_FILTER,
  sectionId: ALL_FILTER,
  functionId: ALL_FILTER,
  reportingTo: ALL_FILTER,
  hod: ALL_FILTER,
  seatingStatus: 'ALL',
  activeStatus: 'ALL',
  search: '',
  page: 1
});

export const isAuthoritativeAreaIdFilter = (
  selectedValue: string,
  params: URLSearchParams,
  areaIds: Set<string>
): boolean => selectedValue !== ALL_FILTER && (
  params.get('areaId') === selectedValue || areaIds.has(selectedValue)
);
