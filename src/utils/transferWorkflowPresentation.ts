export type TransferDisplayStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

export interface TransferDecisionRecord {
  approvedById?: string;
  approverName?: string;
  adminName?: string;
  adminRole?: string;
  action: string;
  comment?: string;
  timestamp?: string;
  isLegacy?: boolean;
}

export interface TransferWorkflowRecord {
  status: string;
  targetAdminApproval?: TransferDecisionRecord | null;
  rejectedByRole?: string | null;
  rejectionReason?: string | null;
}

export function getTransferDisplayStatus(status: string): TransferDisplayStatus {
  if (status === 'APPROVED') return 'APPROVED';
  if (status === 'REJECTED') return 'REJECTED';
  if (status === 'CANCELLED') return 'CANCELLED';
  return 'PENDING';
}

export function isTransferPendingStatus(status: string): boolean {
  return getTransferDisplayStatus(status) === 'PENDING';
}

/**
 * New decisions are stored in targetAdminApproval. Older records only have
 * rejectedByRole/rejectionReason, so expose those as explicitly legacy data.
 */
export function getTransferDecisionRecord(request: TransferWorkflowRecord): TransferDecisionRecord | null {
  if (request.targetAdminApproval) return request.targetAdminApproval;

  const status = getTransferDisplayStatus(request.status);
  if ((status === 'REJECTED' || status === 'CANCELLED') && (request.rejectedByRole || request.rejectionReason)) {
    return {
      action: status === 'REJECTED' ? 'REJECT' : 'CANCELLED',
      adminRole: request.rejectedByRole || undefined,
      comment: request.rejectionReason || undefined,
      isLegacy: true,
    };
  }

  return null;
}

export function getTransferActorLabel(
  record: TransferDecisionRecord | null | undefined,
  fallback: string,
): string {
  if (!record) return fallback;
  const actor = record.approverName || record.adminName || record.adminRole;
  if (!actor) return record.isLegacy ? 'Historical actor not recorded' : fallback;
  return record.isLegacy ? `${actor} (legacy action)` : actor;
}

export function getTransferStage2Label(status: string): string {
  switch (getTransferDisplayStatus(status)) {
    case 'APPROVED':
      return 'Approved by Target Unit Admin or Super Admin';
    case 'REJECTED':
      return 'Rejected';
    case 'CANCELLED':
      return 'Cancelled before approval';
    default:
      return 'Awaiting Target Unit Admin or Super Admin';
  }
}
