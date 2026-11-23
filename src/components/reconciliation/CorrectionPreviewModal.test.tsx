import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { CorrectionPreviewModal } from './CorrectionPreviewModal';
import { ReconciliationCase } from '../../api/reconciliation';

describe('CorrectionPreviewModal Component', () => {
  const dummyCase: ReconciliationCase = {
    id: 'case-test-1',
    employeeCode: 'EMP999',
    employeeName: 'Pooja Reddy',
    status: 'OPEN',
    classification: 'SYSTEM_WRONG',
    fieldComparisons: [],
    mismatchCount: 2,
    evidence: {
      currentRecord: null,
      currentSeat: null,
      hierarchy: {},
      transferHistory: [],
      hasApprovedExplainingTransfer: false,
      recentAuditLogs: [],
    },
    createdAt: '2026-11-18T10:00:00Z',
    updatedAt: '2026-11-18T10:00:00Z',
  };

  it('renders nothing when isOpen is false', () => {
    const html = renderToStaticMarkup(
      <CorrectionPreviewModal
        isOpen={false}
        caseItem={dummyCase}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onRefreshCase={vi.fn()}
      />
    );

    expect(html).toBe('');
  });

  it('renders dialog header, employee details, and cancel button when isOpen is true', () => {
    const html = renderToStaticMarkup(
      <CorrectionPreviewModal
        isOpen={true}
        caseItem={dummyCase}
        userRole="SUPER_ADMIN"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onRefreshCase={vi.fn()}
      />
    );

    expect(html).toContain('Two-Step Correction Preview');
    expect(html).toContain('EMP999');
    expect(html).toContain('Pooja Reddy');
    expect(html).toContain('preview-cancel-btn');
    expect(html).toContain('Cancel');
  });

  it('renders prominent read-only banner and disables apply action for TECH_ADMIN', () => {
    const html = renderToStaticMarkup(
      <CorrectionPreviewModal
        isOpen={true}
        caseItem={dummyCase}
        userRole="TECH_ADMIN"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
        onRefreshCase={vi.fn()}
      />
    );

    expect(html).toContain('preview-tech-admin-readonly-banner');
    expect(html).toContain('READ ONLY MODE: Technical Admin can inspect proposed corrections');
    expect(html).toContain('tech-admin-disabled-notice');
    expect(html).not.toContain('apply-correction-btn');
  });
});
