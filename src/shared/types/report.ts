export interface OccupancyKPIs {
  totalSeats: number;
  occupiedSeats: number;
  availableSeats: number;
  maintenanceSeats: number;
  reservedSeats: number;
  overallOccupancyRate: number;
  overallVacancyRate: number;
  totalEmployees: number;
  unassignedEmployees: number;
}

export interface UnitOccupancy {
  unitId: string;
  unitName: string;
  unitCode?: string;
  total: number;
  occupied: number;
  rate: number;
  totalSeats?: number;
  occupiedSeats?: number;
  occupancyRate?: number;
}

export interface PlantOccupancy {
  plantId: string;
  plantName: string;
  plantCode?: string;
  unitId?: string;
  unitName?: string;
  total: number;
  occupied: number;
  rate: number;
  totalSeats?: number;
  occupiedSeats?: number;
  occupancyRate?: number;
}

export interface OfficeOccupancy {
  officeId: string;
  officeName: string;
  totalSeats: number;
  occupiedSeats: number;
  occupancyRate: number;
}

export interface FloorOccupancy {
  floorId: string;
  floorName: string;
  buildingName?: string;
  plantName?: string;
  unitName?: string;
  officeName?: string;
  total?: number;
  occupied?: number;
  rate?: number;
  totalSeats: number;
  occupiedSeats: number;
  occupancyRate: number;
}

export interface DepartmentOccupancy {
  departmentId: string;
  departmentName: string;
  colorHex: string;
  allocatedSeats: number;
}

export interface OccupancySummaryResponse {
  kpis: OccupancyKPIs;
  byUnit?: UnitOccupancy[];
  byPlant?: PlantOccupancy[];
  unitBreakdown?: UnitOccupancy[];
  plantBreakdown?: PlantOccupancy[];
  byOffice?: OfficeOccupancy[];
  byFloor: FloorOccupancy[];
  byDepartment: DepartmentOccupancy[];
  totalSeats?: number;
  occupiedSeats?: number;
  availableSeats?: number;
  maintenanceSeats?: number;
  reservedSeats?: number;
  vacancyRate?: number;
  officeBreakdown?: OfficeOccupancy[];
  floorBreakdown?: FloorOccupancy[];
}

export interface SeatAllocationCsvRecord {
  unit?: string;
  unitName?: string;
  plant?: string;
  plantName?: string;
  office?: string;
  building: string;
  buildingName?: string;
  floor: string;
  floorName?: string;
  seatLabel: string;
  seatType: string;
  seatStatus: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string;
  departmentCode: string;
  departmentName: string;
}
