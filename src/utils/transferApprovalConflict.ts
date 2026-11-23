export const TRANSFER_TRANSACTION_CONFLICT = 'TRANSFER_TRANSACTION_CONFLICT';

export const TRANSFER_DESTINATION_CONFLICT_CODES = {
  OCCUPIED: 'TRANSFER_DESTINATION_ALREADY_OCCUPIED',
  UNAVAILABLE: 'TRANSFER_DESTINATION_NOT_AVAILABLE',
  RACE_LOST: 'TRANSFER_DESTINATION_RACE_LOST'
} as const;

export function isTransferTransactionConflict(error: any): boolean {
  return error?.code === TRANSFER_TRANSACTION_CONFLICT;
}

export function transferUniqueConflictMessage(error: any): string | null {
  switch (error?.code) {
    case 'TRANSFER_EMPLOYEE_SEAT_CONFLICT':
      return 'Seat assignment data conflicts with the one-seat-per-employee rule. Ask an administrator to review the employee and vacant workstations before approving.';
    case 'TRANSFER_ACTIVE_REQUEST_CONFLICT':
      return 'An active transfer already exists for this employee. The request list has been refreshed.';
    case 'TRANSFER_UNIQUE_CONFLICT':
      return 'Approval could not be completed because of a data constraint. The latest request and workstations have been loaded.';
    default:
      return null;
  }
}

export function transferDestinationConflictMessage(error: any): string | null {
  switch (error?.code) {
    case TRANSFER_DESTINATION_CONFLICT_CODES.OCCUPIED:
      return 'This workstation is already occupied. The latest workstation data has been loaded.';
    case TRANSFER_DESTINATION_CONFLICT_CODES.UNAVAILABLE:
      return 'This workstation is no longer available. Please choose another workstation.';
    case TRANSFER_DESTINATION_CONFLICT_CODES.RACE_LOST:
      return 'Another approval claimed this workstation first. The latest workstation data has been loaded.';
    default:
      return null;
  }
}

export const TRANSFER_TRANSACTION_CONFLICT_MESSAGE =
  'The workstation data changed while approving. The latest seats have been loaded; please select a workstation and try again.';
