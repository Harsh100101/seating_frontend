import { TransferRequestStatus } from '../enums/index.js';

export interface ApprovalStepDetail {
  approvedById?: string;
  approverName?: string;
  adminName?: string;
  adminRole?: string;
  action: 'SUBMITTED' | 'APPROVE' | 'REJECT' | 'CANCELLED';
  comment?: string;
  timestamp?: string;
  isLegacy?: boolean;
}

export interface SeatTransferRequestResponse {
  id: string;
  requestNumber: string;
  employeeId: string;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    email?: string | null;
    departmentId: string;
    department?: {
      id: string;
      name: string;
      code: string;
      colorHex?: string;
    };
  };

  sourceUnitId?: string | null;
  sourceUnitName?: string | null;
  sourceFloorId?: string | null;
  sourceFloorName?: string | null;
  sourceSeatId?: string | null;
  sourceSeatLabel?: string | null;

  targetUnitId: string;
  targetUnitName?: string | null;
  targetPlantId: string;
  targetPlantName?: string | null;
  targetBuildingId: string;
  targetBuildingName?: string | null;
  targetFloorId: string;
  targetFloorName?: string | null;
  targetSeatId?: string | null;
  targetSeatLabel?: string | null;

  reason: string;
  status: TransferRequestStatus;

  managerApproval?: ApprovalStepDetail | null;
  hodApproval?: ApprovalStepDetail | null;
  sourceAdminApproval?: ApprovalStepDetail | null;
  targetAdminApproval?: ApprovalStepDetail | null;

  rejectedByRole?: string | null;
  rejectionReason?: string | null;

  createdAt: string;
  updatedAt: string;
}

export interface CreateTransferRequestInput {
  targetUnitId: string;
  targetPlantId: string;
  targetBuildingId: string;
  targetFloorId: string;
  targetSeatId?: string;
  reason: string;
  employeeId?: string; // Optional if derived from authenticated user
}

export interface TransferRequestActionInput {
  action: 'APPROVE' | 'REJECT';
  comment?: string;
  assignedTargetSeatId?: string;
}
