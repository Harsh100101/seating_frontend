import { describe, expect, it } from 'vitest';
import {
  isTransferTransactionConflict,
  TRANSFER_TRANSACTION_CONFLICT,
  TRANSFER_TRANSACTION_CONFLICT_MESSAGE,
  transferDestinationConflictMessage,
  transferUniqueConflictMessage,
} from './transferApprovalConflict';

describe('transfer approval conflict handling', () => {
  it('recognizes the retryable backend conflict code', () => {
    expect(isTransferTransactionConflict({ code: TRANSFER_TRANSACTION_CONFLICT })).toBe(true);
    expect(isTransferTransactionConflict({ code: 'Conflict', statusCode: 409 })).toBe(false);
  });

  it('provides a refresh-and-reselect message for the user', () => {
    expect(TRANSFER_TRANSACTION_CONFLICT_MESSAGE).toContain('latest seats have been loaded');
  });

  it('gives specific messages for unique conflicts', () => {
    expect(transferUniqueConflictMessage({ code: 'TRANSFER_EMPLOYEE_SEAT_CONFLICT' })).toContain('administrator');
    expect(transferUniqueConflictMessage({ code: 'TRANSFER_ACTIVE_REQUEST_CONFLICT' })).toContain('active transfer');
    expect(transferUniqueConflictMessage({ code: 'TRANSFER_UNIQUE_CONFLICT' })).toContain('data constraint');
    expect(transferUniqueConflictMessage({ code: 'Conflict' })).toBeNull();
  });

  it('gives specific messages for destination allocation conflicts', () => {
    expect(transferDestinationConflictMessage({ code: 'TRANSFER_DESTINATION_ALREADY_OCCUPIED' })).toContain('already occupied');
    expect(transferDestinationConflictMessage({ code: 'TRANSFER_DESTINATION_NOT_AVAILABLE' })).toContain('no longer available');
    expect(transferDestinationConflictMessage({ code: 'TRANSFER_DESTINATION_RACE_LOST' })).toContain('claimed this workstation first');
    expect(transferDestinationConflictMessage({ code: 'Conflict' })).toBeNull();
  });
});
