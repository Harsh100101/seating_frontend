import { UserRole } from '../enums/index.js';
export interface AdminLoginRequest {
  email: string;
  password: string;
}

export interface AdminUserResponse {
  id: string;
  email: string;
  name: string;
  role?: UserRole | string;
  actualRole?: UserRole | string;
  assignedUnitId?: string | null;
  departmentId?: string | null;
  employeeId?: string | null;
  createdAt?: string;
}

export interface AdminLoginResponse {
  user: AdminUserResponse;
}

export interface AdminSession {
  adminId: string;
  email: string;
  name: string;
  role?: UserRole | string;
  actualRole?: UserRole | string;
  assignedUnitId?: string | null;
  departmentId?: string | null;
  employeeId?: string | null;
  authenticatedAt: number;
}

export interface AuthStatusResponse {
  authenticated: boolean;
  user: AdminUserResponse | null;
}

