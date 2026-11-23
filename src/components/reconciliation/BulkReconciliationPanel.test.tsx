import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { BulkReconciliationPanel } from './BulkReconciliationPanel';
import { BulkReconciliationPlan } from '../../api/reconciliation';

const plan: BulkReconciliationPlan = {
  runId: 'run-1',
  sourceFilename: 'Unit_1_Workstation Detail.xlsx',
  sourceHash: 'a'.repeat(64),
  generatedAt: '2026-11-19T00:00:00.000Z',
  counts: {
    NO_CHANGE: 10,
    FORMATTING_ONLY: 2,
    SAFE_FIELD_UPDATE: 3,
    SAFE_SEAT_ASSIGNMENT: 1,
    SAFE_SEAT_MOVE: 4,
    BLOCKED_DUPLICATE_EXCEL: 2,
    BLOCKED_DUPLICATE_WORKSTATION: 1,
    BLOCKED_OCCUPIED_TARGET_SEAT: 5,
    BLOCKED_INVALID_HIERARCHY: 2,
    BLOCKED_AMBIGUOUS_MAPPING: 0,
    BLOCKED_OTHER: 0,
    STALE: 0,
    TOTAL: 30,
  },
  items: [{
    employeeCode: 'SS3362',
    employeeName: 'MOHIT PARMAR',
    excelRowNumbers: [2],
    status: 'SAFE_SEAT_MOVE',
    reasons: [],
    changedFields: ['Unit', 'Workstation'],
    currentSeatLabel: 'WS-02',
    proposedSeatLabel: 'WS-01',
  }],
};

describe('BulkReconciliationPanel', () => {
  it('renders the source hash and dry-run summary without applying changes', () => {
    const html = renderToStaticMarkup(
      <BulkReconciliationPanel
        plan={plan}
        isSuperAdmin
        loading={false}
        applying={false}
        error={null}
        onGenerate={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(html).toContain('Safe Bulk Reconciliation');
    expect(html).toContain('Unit_1_Workstation Detail.xlsx');
    expect(html).toContain('SAFE SEAT MOVE');
    expect(html).toContain('Apply Authoritative Sheet');
    expect(html).toContain('no data was written');
  });

  it('keeps apply unavailable to TECH_ADMIN while allowing plan preview', () => {
    const html = renderToStaticMarkup(
      <BulkReconciliationPanel
        plan={plan}
        isSuperAdmin={false}
        loading={false}
        applying={false}
        error={null}
        onGenerate={vi.fn()}
        onApply={vi.fn()}
      />
    );

    expect(html).toContain('Apply is Super Admin only');
    expect(html).not.toContain('data-testid="apply-authoritative-sheet"');
  });
});
