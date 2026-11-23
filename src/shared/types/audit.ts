import { AuditAction } from '../enums/index.js';
import { AdminUserResponse } from './auth.js';

export interface AuditLog {
  id: string;
  adminId: string;
  admin?: AdminUserResponse;
  action: AuditAction | string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface AuditLogQuery {
  action?: string;
  entityType?: string;
  adminId?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

export interface AuditLogListResponse {
  logs: AuditLog[];
  total: number;
  page: number;
  limit: number;
}
