import { describe, expect, it } from 'vitest';
import {
  getTransferActorLabel,
  getTransferDecisionRecord,
  getTransferDisplayStatus,
  getTransferStage2Label,
} from './transferWorkflowPresentation';

describe('transfer workflow presentation', () => {
  it('normalizes the active two-stage statuses', () => {
    expect(getTransferDisplayStatus('PENDING_TARGET_ADMIN')).toBe('PENDING');
    expect(getTransferDisplayStatus('APPROVED')).toBe('APPROVED');
    expect(getTransferDisplayStatus('REJECTED')).toBe('REJECTED');
    expect(getTransferDisplayStatus('CANCELLED')).toBe('CANCELLED');
  });

  it('never exposes pending decision text for terminal states', () => {
    expect(getTransferStage2Label('PENDING_TARGET_ADMIN')).toBe('Awaiting Target Unit Admin or Super Admin');
    expect(getTransferStage2Label('APPROVED')).toBe('Approved by Target Unit Admin or Super Admin');
    expect(getTransferStage2Label('REJECTED')).toBe('Rejected');
    expect(getTransferStage2Label('CANCELLED')).toBe('Cancelled before approval');
  });

  it('marks legacy role-only decisions without rewriting the actor', () => {
    const decision = getTransferDecisionRecord({
      status: 'REJECTED',
      rejectedByRole: 'SUPER_ADMIN',
      rejectionReason: 'Legacy review',
    });
    expect(decision?.isLegacy).toBe(true);
    expect(getTransferActorLabel(decision, 'Target Unit Admin')).toBe('SUPER_ADMIN (legacy action)');
  });

  it('prefers the durable target decision record for current requests', () => {
    const decision = getTransferDecisionRecord({
      status: 'REJECTED',
      rejectedByRole: 'SUPER_ADMIN',
      targetAdminApproval: {
        action: 'REJECT',
        approverName: 'Unit 2 Admin',
        timestamp: '2026-11-13T10:00:00.000Z',
      },
    });
    expect(decision?.isLegacy).toBeUndefined();
    expect(getTransferActorLabel(decision, 'Target Unit Admin')).toBe('Unit 2 Admin');
  });
});
