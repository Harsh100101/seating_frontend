import { Department } from './org.js';
import { Seat } from './seat.js';

export interface Employee {
  id: string;
  employeeCode: string;
  fullName: string;
  email?: string | null;
  designation?: string | null;
  grade?: string | null;
  phone?: string | null;
  ext?: string | null;
  section?: string | null;
  functionName?: string | null;
  reportingManager?: string | null;
  reportingTo?: string | null;
  hod?: string | null;
  remarks?: string | null;
  pcNumber?: string | null;
  officeArea?: string | null;
  departmentId: string;
  department?: Department;
  seat?: (Pick<Seat, 'id' | 'label' | 'pcNumber'> & {
    officeArea?: string | null;
    floor: {
      id: string;
      name: string;
      building: {
        name: string;
        plant?: { name: string; unit?: { id?: string; name: string } };
        office?: { name: string };
      };
    };
  }) | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateEmployeeRequest {
  employeeCode: string;
  fullName: string;
  email?: string;
  designation?: string;
  grade?: string;
  phone?: string;
  ext?: string;
  section?: string;
  functionName?: string;
  reportingManager?: string;
  reportingTo?: string;
  hod?: string;
  remarks?: string;
  pcNumber?: string;
  officeArea?: string;
  departmentId: string;
  seatId?: string;
}

export interface UpdateEmployeeRequest {
  employeeCode?: string;
  fullName?: string;
  email?: string;
  designation?: string;
  grade?: string;
  phone?: string;
  ext?: string | null;
  section?: string | null;
  functionName?: string | null;
  reportingManager?: string | null;
  reportingTo?: string | null;
  hod?: string | null;
  remarks?: string | null;
  pcNumber?: string | null;
  officeArea?: string | null;
  departmentId?: string;
  seatId?: string | null;
  isActive?: boolean;
}

export interface EmployeeListQuery {
  departmentId?: string;
  search?: string;
  page?: number;
  limit?: number;
  officeArea?: string;
  section?: string;
  reportingManager?: string;
}

export interface EmployeeListResponse {
  employees: Employee[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
