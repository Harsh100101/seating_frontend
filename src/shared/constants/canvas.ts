import { SeatType, SeatStatus, AuditAction } from '../enums/index.js';

// Default and boundary dimensions for floor plan canvas (pixels)
export const DEFAULT_CANVAS_WIDTH = 1600;
export const DEFAULT_CANVAS_HEIGHT = 1000;
export const MIN_CANVAS_WIDTH = 800;
export const MAX_CANVAS_WIDTH = 4000;
export const MIN_CANVAS_HEIGHT = 600;
export const MAX_CANVAS_HEIGHT = 3000;

// Grid rendering & snapping
export const CANVAS_MAJOR_GRID_SIZE = 50;
export const CANVAS_MINOR_GRID_SIZE = 10;
export const CANVAS_SNAP_GRID_SIZE = 10;

// Zoom scale constraints
export const CANVAS_MIN_ZOOM = 0.2;
export const CANVAS_MAX_ZOOM = 4.0;
export const CANVAS_ZOOM_STEP = 1.1;

// Default seat node geometry
export const DEFAULT_SEAT_WIDTH = 64;
export const DEFAULT_SEAT_HEIGHT = 48;
export const MIN_SEAT_WIDTH = 32;
export const MAX_SEAT_WIDTH = 256;
export const MIN_SEAT_HEIGHT = 32;
export const MAX_SEAT_HEIGHT = 256;

// Rotation step in degrees
export const SEAT_ROTATION_STEP = 90;

// Default color palette for organization departments
export const DEFAULT_DEPARTMENT_COLORS = [
  '#2563EB', // Blue (Engineering)
  '#7C3AED', // Purple (Product)
  '#EC4899', // Pink (Design)
  '#F59E0B', // Amber (Sales & Marketing)
  '#10B981', // Emerald (People & HR)
  '#64748B', // Slate (Finance)
  '#06B6D4', // Cyan (Customer Success)
  '#8B5CF6'  // Violet (Legal & Operations)
] as const;

export const DEFAULT_UNASSIGNED_COLOR = '#94A3B8'; // Slate 400
export const MAINTENANCE_COLOR = '#F97316';       // Orange 500
export const RESERVED_COLOR = '#A855F7';          // Purple 500

// Human-readable display labels for UI dropdowns and badges
export const SEAT_TYPE_LABELS: Record<SeatType, string> = {
  [SeatType.STANDARD_DESK]: 'Standard Desk',
  [SeatType.STANDING_DESK]: 'Standing Desk',
  [SeatType.CUBICLE]: 'Cubicle',
  [SeatType.CABIN]: 'Private Cabin'
};

export const SEAT_STATUS_LABELS: Record<SeatStatus, string> = {
  [SeatStatus.AVAILABLE]: 'Available',
  [SeatStatus.MAINTENANCE]: 'Under Maintenance',
  [SeatStatus.RESERVED]: 'Reserved'
};

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  [AuditAction.ASSIGN_SEAT]: 'Seat Assigned',
  [AuditAction.UNASSIGN_SEAT]: 'Seat Unassigned',
  [AuditAction.DELETE_SEAT]: 'Seat Deleted',
  [AuditAction.UPDATE_SEAT]: 'Seat Updated',
  [AuditAction.SAVE_LAYOUT]: 'Floor Layout Saved',
  [AuditAction.CREATE_FLOOR]: 'Floor Created',
  [AuditAction.UPDATE_FLOOR]: 'Floor Updated',
  [AuditAction.DELETE_FLOOR]: 'Floor Deleted',
  [AuditAction.CREATE_UNIT]: 'Unit Created',
  [AuditAction.UPDATE_UNIT]: 'Unit Updated',
  [AuditAction.DELETE_UNIT]: 'Unit Deleted',
  [AuditAction.UNIT_CREATED]: 'Unit Created',
  [AuditAction.UNIT_DELETED]: 'Unit Deleted',
  [AuditAction.CREATE_PLANT]: 'Plant Created',
  [AuditAction.UPDATE_PLANT]: 'Plant Updated',
  [AuditAction.DELETE_PLANT]: 'Plant Deleted',
  [AuditAction.PLANT_CREATED]: 'Plant Created',
  [AuditAction.PLANT_DELETED]: 'Plant Deleted',
  [AuditAction.CREATE_OFFICE]: 'Office Created',
  [AuditAction.UPDATE_OFFICE]: 'Office Updated',
  [AuditAction.DELETE_OFFICE]: 'Office Deleted',
  [AuditAction.CREATE_BUILDING]: 'Building Created',
  [AuditAction.UPDATE_BUILDING]: 'Building Updated',
  [AuditAction.DELETE_BUILDING]: 'Building Deleted',
  [AuditAction.CREATE_DEPARTMENT]: 'Department Created',
  [AuditAction.UPDATE_DEPARTMENT]: 'Department Updated',
  [AuditAction.DELETE_DEPARTMENT]: 'Department Deleted',
  [AuditAction.IMPORT_EMPLOYEES]: 'Employees Imported via CSV',
  [AuditAction.CREATE_EMPLOYEE]: 'Employee Created',
  [AuditAction.UPDATE_EMPLOYEE]: 'Employee Updated',
  [AuditAction.DELETE_EMPLOYEE]: 'Employee Deleted',
  [AuditAction.ADMIN_LOGIN]: 'Admin Login',
  [AuditAction.ADMIN_LOGOUT]: 'Admin Logout',
  [AuditAction.TRANSFER_REQUEST_CREATED]: 'Transfer Request Created',
  [AuditAction.MANAGER_APPROVED]: 'Manager Approved Transfer',
  [AuditAction.HOD_APPROVED]: 'HOD Approved Transfer',
  [AuditAction.SOURCE_ADMIN_APPROVED]: 'Source Admin Approved Relieving',
  [AuditAction.TARGET_ADMIN_APPROVED]: 'Target Admin Approved & Allocated',
  [AuditAction.TRANSFER_REJECTED]: 'Transfer Request Rejected',
  [AuditAction.TRANSFER_FORCE_APPROVED]: 'Super Admin Force Approved & Allocated',
  [AuditAction.RECONCILIATION_CASE_CLASSIFIED]: 'Reconciliation Case Classified',
  [AuditAction.RECONCILIATION_CORRECTION_APPLIED]: 'Reconciliation Correction Applied',
  [AuditAction.RECONCILIATION_CASE_RESOLVED]: 'Reconciliation Case Resolved',
  [AuditAction.RECONCILIATION_CASE_REOPENED]: 'Reconciliation Case Reopened'
};
