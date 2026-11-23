// packages/shared/src/types/workstation.ts

export type WorkstationStatusFilter = 'ALL' | 'OCCUPIED' | 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE';

export interface WorkstationRecord {
  id: string;
  wsNo: string;
  unit: {
    id: string;
    name: string;
    code: string;
    location?: string | null;
  };
  plant: {
    id: string;
    name: string;
    code: string;
  } | null;
  building: {
    id: string;
    name: string;
    code: string;
  } | null;
  floor: {
    id: string;
    name: string;
    floorNumber: number;
  } | null;
  officeArea: string;
  department: {
    id: string;
    name: string;
    code: string;
    colorHex: string;
  } | null;
  section: string;
  functionName: string;
  type: string;
  status: 'OCCUPIED' | 'AVAILABLE' | 'RESERVED' | 'MAINTENANCE';
  pcNumber: string | null;
  remarks: string | null;
  employee: {
    id: string;
    employeeCode: string;
    fullName: string;
    email: string | null;
    designation: string | null;
    grade: string | null;
    reportingTo: string | null;
    reportingManager: string | null;
    hod: string | null;
    phone: string | null;
    ext: string | null;
    isActive: boolean;
  } | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  updatedAt: string;
}

export interface WorkstationQueryParams {
  unitId?: string;
  buildingId?: string;
  floorId?: string;
  officeArea?: string;
  departmentId?: string;
  section?: string;
  functionName?: string;
  status?: WorkstationStatusFilter;
  wsNo?: string;
  empCode?: string;
  employeeName?: string;
  reportingTo?: string;
  hod?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'wsNo' | 'empCode' | 'employeeName' | 'department' | 'building' | 'floor' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface WorkstationPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface WorkstationListResponse {
  data: WorkstationRecord[];
  pagination: WorkstationPagination;
  filtersApplied: Record<string, any>;
  kpis: {
    totalWorkstations: number;
    occupiedCount: number;
    availableCount: number;
    reservedCount: number;
    maintenanceCount: number;
    otherCount: number;
    occupancyRate: number;
  };
}

export interface WorkstationFilterOptionsResponse {
  units: Array<{ id: string; name: string; code: string; location?: string | null }>;
  buildings: Array<{ id: string; name: string; code: string; unitId: string }>;
  floors: Array<{ id: string; name: string; floorNumber: number; buildingId: string; displayName?: string }>;
  officeAreas: string[];
  areaOptions?: Array<{ id: string; name: string; floorId: string; isActive?: boolean; displayName?: string }>;
  departments: Array<{ id: string; name: string; code: string; colorHex?: string; unitId?: string | null }>;
  sections: string[];
  sectionOptions?: Array<{ id: string; name: string; departmentId: string; isActive?: boolean; displayName?: string }>;
  functions: string[];
  functionOptions?: Array<{ id: string; name: string; sectionId: string; isActive?: boolean; displayName?: string }>;
  statuses: Array<{ value: WorkstationStatusFilter; label: string; count?: number }>;
  userScope: {
    role: string;
    isRestricted: boolean;
    lockedUnitId: string | null;
    assignedUnitName?: string | null;
  };
}
