/**
 * Physical desk/workstation classification.
 * Matches Prisma enum SeatType exactly.
 */
export enum SeatType {
  STANDARD_DESK = 'STANDARD_DESK',
  STANDING_DESK = 'STANDING_DESK',
  CUBICLE = 'CUBICLE',
  CABIN = 'CABIN'
}

export const SEAT_TYPES = [
  SeatType.STANDARD_DESK,
  SeatType.STANDING_DESK,
  SeatType.CUBICLE,
  SeatType.CABIN
] as const;

/**
 * Operational availability status of a seat.
 * Matches Prisma enum SeatStatus exactly.
 * Invariant: Only AVAILABLE seats may be assigned to an employee.
 */
export enum SeatStatus {
  AVAILABLE = 'AVAILABLE',
  MAINTENANCE = 'MAINTENANCE',
  RESERVED = 'RESERVED'
}

export const SEAT_STATUSES = [
  SeatStatus.AVAILABLE,
  SeatStatus.MAINTENANCE,
  SeatStatus.RESERVED
] as const;

/**
 * System audit action types recorded in the immutable AuditLog table.
 */
export enum AuditAction {
  // Seat operations
  ASSIGN_SEAT = 'ASSIGN_SEAT',
  UNASSIGN_SEAT = 'UNASSIGN_SEAT',
  DELETE_SEAT = 'DELETE_SEAT',
  UPDATE_SEAT = 'UPDATE_SEAT',

  // Layout & Floor operations
  SAVE_LAYOUT = 'SAVE_LAYOUT',
  CREATE_FLOOR = 'CREATE_FLOOR',
  UPDATE_FLOOR = 'UPDATE_FLOOR',
  DELETE_FLOOR = 'DELETE_FLOOR',

  // Organization operations (Industrial Hierarchy)
  CREATE_UNIT = 'CREATE_UNIT',
  UPDATE_UNIT = 'UPDATE_UNIT',
  DELETE_UNIT = 'DELETE_UNIT',
  UNIT_CREATED = 'UNIT_CREATED',
  UNIT_DELETED = 'UNIT_DELETED',
  CREATE_PLANT = 'CREATE_PLANT',
  UPDATE_PLANT = 'UPDATE_PLANT',
  DELETE_PLANT = 'DELETE_PLANT',
  PLANT_CREATED = 'PLANT_CREATED',
  PLANT_DELETED = 'PLANT_DELETED',
  CREATE_OFFICE = 'CREATE_OFFICE',
  UPDATE_OFFICE = 'UPDATE_OFFICE',
  DELETE_OFFICE = 'DELETE_OFFICE',
  CREATE_BUILDING = 'CREATE_BUILDING',
  UPDATE_BUILDING = 'UPDATE_BUILDING',
  DELETE_BUILDING = 'DELETE_BUILDING',
  CREATE_DEPARTMENT = 'CREATE_DEPARTMENT',
  UPDATE_DEPARTMENT = 'UPDATE_DEPARTMENT',
  DELETE_DEPARTMENT = 'DELETE_DEPARTMENT',

  // Employee operations
  IMPORT_EMPLOYEES = 'IMPORT_EMPLOYEES',
  CREATE_EMPLOYEE = 'CREATE_EMPLOYEE',
  UPDATE_EMPLOYEE = 'UPDATE_EMPLOYEE',
  DELETE_EMPLOYEE = 'DELETE_EMPLOYEE',

  // Authentication
  ADMIN_LOGIN = 'ADMIN_LOGIN',
  ADMIN_LOGOUT = 'ADMIN_LOGOUT',

  // Transfer request workflow operations
  TRANSFER_REQUEST_CREATED = 'TRANSFER_REQUEST_CREATED',
  MANAGER_APPROVED = 'MANAGER_APPROVED',
  HOD_APPROVED = 'HOD_APPROVED',
  SOURCE_ADMIN_APPROVED = 'SOURCE_ADMIN_APPROVED',
  TARGET_ADMIN_APPROVED = 'TARGET_ADMIN_APPROVED',
  TRANSFER_REJECTED = 'TRANSFER_REJECTED',
  TRANSFER_FORCE_APPROVED = 'TRANSFER_FORCE_APPROVED',

  // Data Reconciliation operations
  RECONCILIATION_CASE_CLASSIFIED = 'RECONCILIATION_CASE_CLASSIFIED',
  RECONCILIATION_CORRECTION_APPLIED = 'RECONCILIATION_CORRECTION_APPLIED',
  RECONCILIATION_CASE_RESOLVED = 'RECONCILIATION_CASE_RESOLVED',
  RECONCILIATION_CASE_REOPENED = 'RECONCILIATION_CASE_REOPENED'
}

export const AUDIT_ACTIONS = [
  AuditAction.ASSIGN_SEAT,
  AuditAction.UNASSIGN_SEAT,
  AuditAction.DELETE_SEAT,
  AuditAction.UPDATE_SEAT,
  AuditAction.SAVE_LAYOUT,
  AuditAction.CREATE_FLOOR,
  AuditAction.UPDATE_FLOOR,
  AuditAction.DELETE_FLOOR,
  AuditAction.CREATE_UNIT,
  AuditAction.UPDATE_UNIT,
  AuditAction.DELETE_UNIT,
  AuditAction.CREATE_PLANT,
  AuditAction.UPDATE_PLANT,
  AuditAction.DELETE_PLANT,
  AuditAction.CREATE_OFFICE,
  AuditAction.UPDATE_OFFICE,
  AuditAction.DELETE_OFFICE,
  AuditAction.CREATE_BUILDING,
  AuditAction.UPDATE_BUILDING,
  AuditAction.DELETE_BUILDING,
  AuditAction.CREATE_DEPARTMENT,
  AuditAction.UPDATE_DEPARTMENT,
  AuditAction.DELETE_DEPARTMENT,
  AuditAction.IMPORT_EMPLOYEES,
  AuditAction.CREATE_EMPLOYEE,
  AuditAction.UPDATE_EMPLOYEE,
  AuditAction.DELETE_EMPLOYEE,
  AuditAction.ADMIN_LOGIN,
  AuditAction.ADMIN_LOGOUT,
  AuditAction.TRANSFER_REQUEST_CREATED,
  AuditAction.MANAGER_APPROVED,
  AuditAction.HOD_APPROVED,
  AuditAction.SOURCE_ADMIN_APPROVED,
  AuditAction.TARGET_ADMIN_APPROVED,
  AuditAction.TRANSFER_REJECTED,
  AuditAction.TRANSFER_FORCE_APPROVED,
  AuditAction.RECONCILIATION_CASE_CLASSIFIED,
  AuditAction.RECONCILIATION_CORRECTION_APPLIED,
  AuditAction.RECONCILIATION_CASE_RESOLVED,
  AuditAction.RECONCILIATION_CASE_REOPENED
] as const;

/**
 * Data Reconciliation case statuses.
 */
export enum ReconciliationStatus {
  OPEN = 'OPEN',
  NEEDS_REVIEW = 'NEEDS_REVIEW',
  EXCEL_STALE = 'EXCEL_STALE',
  SYSTEM_CORRECTION_REQUIRED = 'SYSTEM_CORRECTION_REQUIRED',
  FORMATTING_ONLY = 'FORMATTING_ONLY',
  RESOLVED = 'RESOLVED',
  BLOCKED = 'BLOCKED',
  REOPENED = 'REOPENED'
}

export const RECONCILIATION_STATUSES = [
  ReconciliationStatus.OPEN,
  ReconciliationStatus.NEEDS_REVIEW,
  ReconciliationStatus.EXCEL_STALE,
  ReconciliationStatus.SYSTEM_CORRECTION_REQUIRED,
  ReconciliationStatus.FORMATTING_ONLY,
  ReconciliationStatus.RESOLVED,
  ReconciliationStatus.BLOCKED,
  ReconciliationStatus.REOPENED
] as const;

/**
 * Root-cause classification for data discrepancies.
 */
export enum ReconciliationClassification {
  EXPECTED_LIVE_CHANGE = 'EXPECTED_LIVE_CHANGE',
  EXCEL_STALE = 'EXCEL_STALE',
  SYSTEM_WRONG = 'SYSTEM_WRONG',
  FORMATTING_ONLY = 'FORMATTING_ONLY',
  DUPLICATE_EXCEL_CONFLICT = 'DUPLICATE_EXCEL_CONFLICT',
  UNKNOWN = 'UNKNOWN'
}

export const RECONCILIATION_CLASSIFICATIONS = [
  ReconciliationClassification.EXPECTED_LIVE_CHANGE,
  ReconciliationClassification.EXCEL_STALE,
  ReconciliationClassification.SYSTEM_WRONG,
  ReconciliationClassification.FORMATTING_ONLY,
  ReconciliationClassification.DUPLICATE_EXCEL_CONFLICT,
  ReconciliationClassification.UNKNOWN
] as const;

/**
 * V2 administrator RBAC hierarchy. Employee/HOD/Manager are data attributes
 * or historical values, not application administrator roles.
 */
export enum UserRole {
  TECH_ADMIN = 'TECH_ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
  UNIT_ADMIN = 'UNIT_ADMIN'
}

export const USER_ROLES = [
  UserRole.TECH_ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.UNIT_ADMIN
] as const;

/**
 * Unit-to-Unit transfer statuses. The legacy pending values remain in the
 * contract so historical records and unrelated consumers can be read without
 * a destructive migration; new requests use PENDING_TARGET_ADMIN directly.
 */
export enum TransferRequestStatus {
  PENDING_MANAGER = 'PENDING_MANAGER',
  PENDING_HOD = 'PENDING_HOD',
  PENDING_SOURCE_ADMIN = 'PENDING_SOURCE_ADMIN',
  PENDING_TARGET_ADMIN = 'PENDING_TARGET_ADMIN',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  CANCELLED = 'CANCELLED'
}

export const TRANSFER_REQUEST_STATUSES = [
  TransferRequestStatus.PENDING_MANAGER,
  TransferRequestStatus.PENDING_HOD,
  TransferRequestStatus.PENDING_SOURCE_ADMIN,
  TransferRequestStatus.PENDING_TARGET_ADMIN,
  TransferRequestStatus.APPROVED,
  TransferRequestStatus.REJECTED,
  TransferRequestStatus.CANCELLED
] as const;

