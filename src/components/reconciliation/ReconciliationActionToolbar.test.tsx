import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReconciliationActionToolbar } from './ReconciliationActionToolbar';
import { ReconciliationCase } from '../../api/reconciliation';

describe('ReconciliationActionToolbar Component', () => {
  const dummyOpenCase: ReconciliationCase = {
    id: 'case-01',
    employeeCode: 'EMP001',
    employeeName: 'Alice Smith',
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

  const dummyResolvedCase: ReconciliationCase = {
    ...dummyOpenCase,
    id: 'case-02',
    status: 'RESOLVED',
  };

  it('renders all action buttons enabled for SUPER_ADMIN on an open case', () => {
    const html = renderToStaticMarkup(
      <ReconciliationActionToolbar
        caseItem={dummyOpenCase}
        userRole="SUPER_ADMIN"
        onOpenCorrectionPreview={vi.fn()}
        onActionComplete={vi.fn()}
      />
    );

    expect(html).toContain('Correct Current System');
    expect(html).toContain('Keep Current System');
    expect(html).toContain('Formatting Only');
    expect(html).toContain('Needs Review');
    expect(html).not.toContain('tech-admin-readonly-banner');
    expect(html).not.toContain('disabled=""');
  });

  it('renders prominent READ-ONLY banner and disables all action buttons for TECH_ADMIN', () => {
    const html = renderToStaticMarkup(
      <ReconciliationActionToolbar
        caseItem={dummyOpenCase}
        userRole="TECH_ADMIN"
        onOpenCorrectionPreview={vi.fn()}
        onActionComplete={vi.fn()}
      />
    );

    // Prominent banner
    expect(html).toContain('tech-admin-readonly-banner');
    expect(html).toContain('READ ONLY: Technical Admin has view-only privileges');

    // All buttons should have disabled attribute or disabled styling
    expect(html).toContain('cursor-not-allowed');
    expect(html).toContain('Disabled in Read-Only mode');
  });

  it('shows Reopen Case button for SUPER_ADMIN on resolved cases', () => {
    const html = renderToStaticMarkup(
      <ReconciliationActionToolbar
        caseItem={dummyResolvedCase}
        userRole="SUPER_ADMIN"
        onOpenCorrectionPreview={vi.fn()}
        onActionComplete={vi.fn()}
      />
    );

    expect(html).toContain('reopen-case-btn');
    expect(html).toContain('Reopen Case');
  });

  it('does NOT show Reopen Case button for TECH_ADMIN even on resolved cases', () => {
    const html = renderToStaticMarkup(
      <ReconciliationActionToolbar
        caseItem={dummyResolvedCase}
        userRole="TECH_ADMIN"
        onOpenCorrectionPreview={vi.fn()}
        onActionComplete={vi.fn()}
      />
    );

    expect(html).not.toContain('reopen-case-btn');
  });
});
