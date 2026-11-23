import { SeatType, SeatStatus } from '../enums/index.js';
import { Office, Building, Floor, Plant, Unit } from './org.js';
import { Employee } from './employee.js';

export interface SeatDepartment {
  id: string;
  name: string;
  code?: string | null;
  colorHex: string;
}

export interface Seat {
  id: string;
  label: string;
  floorId: string;
  x: number;
  y: number;
  rotation: number;
  width: number;
  height: number;
  type: SeatType;
  status: SeatStatus;
  pcNumber?: string | null;
  officeArea?: string | null;
  zone?: string | null;
  remarks?: string | null;
  departmentId?: string | null;
  department?: SeatDepartment | null;
  employeeId?: string | null;
  employee?: Employee | null;
  floor?: (Floor & {
    building?: Building & {
      office?: Office;
      plant?: Plant & { unit?: Unit };
    };
  }) | null;
}

/**
 * Seat node representation in the Konva canvas editor and batch layout update payload.
 */
export interface SeatPosition {
  id: string;
  label: string;
  x: number;
  y: number;
  rotation: number;
  width?: number;
  height?: number;
  type?: SeatType;
  status?: SeatStatus;
  pcNumber?: string | null;
  officeArea?: string | null;
  zone?: string | null;
  remarks?: string | null;
}

export interface FloorLayoutUpdateRequest {
  seats: SeatPosition[];
  deletedSeatIds?: string[];
}

export interface FloorLayoutUpdateResponse {
  floorId: string;
  seats: Seat[];
  count: number;
}

export interface AssignSeatRequest {
  employeeId: string;
}

export interface SeatWithContext extends Seat {
  floor: Floor & {
    building: Building & {
      office?: Office;
      plant?: Plant & { unit: Unit };
    };
  };
}
