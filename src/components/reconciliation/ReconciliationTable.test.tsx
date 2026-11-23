import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReconciliationTable } from './ReconciliationTable';
import { ReconciliationCase } from '../../api/reconciliation';

describe('ReconciliationTable Component', () => {
  const dummyCases: ReconciliationCase[] = [
    {
      id: 'case-1',
      employeeCode: 'EMP001',
      employeeName: 'Aarav Patel',
      status: 'OPEN',
      classification: 'SYSTEM_WRONG',
      unitName: 'Unit 1',
      departmentName: 'Production',
      fieldComparisons: [],
      mismatchCount: 3,
      evidence: {
        currentRecord: null,
        currentSeat: null,
        hierarchy: {},
        transferHistory: [],
        hasApprovedExplainingTransfer: true,
        duplicateConflict: { isDuplicate: true, count: 2, occurrences: [] },
        recentAuditLogs: [],
      },
      createdAt: '2026-11-18T10:00:00Z',
      updatedAt: '2026-11-18T10:00:00Z',
    },
    {
      id: 'case-2',
      employeeCode: 'EMP002',
      employeeName: 'Bhavna Joshi',
      status: 'RESOLVED',
      classification: 'EXPECTED_LIVE_CHANGE',
      unitName: 'Unit 2',
      departmentName: 'Quality',
      fieldComparisons: [],
      mismatchCount: 0,
      evidence: {
        currentRecord: null,
        currentSeat: null,
        hierarchy: {},
        transferHistory: [],
        hasApprovedExplainingTransfer: false,
        duplicateConflict: null,
        recentAuditLogs: [],
      },
      createdAt: '2026-11-18T10:00:00Z',
      updatedAt: '2026-11-18T10:00:00Z',
    },
  ];

  it('renders table headers and case rows', () => {
    const html = renderToStaticMarkup(
      <ReconciliationTable
        cases={dummyCases}
        selectedCaseId="case-1"
        onSelectCase={vi.fn()}
        page={1}
        totalPages={2}
        total={25}
        onPageChange={vi.fn()}
      />
    );

    expect(html).toContain('Employee');
    expect(html).toContain('Status');
    expect(html).toContain('Classification');
    expect(html).toContain('Unit / Dept');
    expect(html).toContain('Mismatches');
    expect(html).toContain('Signals');

    expect(html).toContain('Aarav Patel');
    expect(html).toContain('EMP001');
    expect(html).toContain('Bhavna Joshi');
    expect(html).toContain('EMP002');
  });

  it('renders transfer and duplicate signal icons', () => {
    const html = renderToStaticMarkup(
      <ReconciliationTable
        cases={dummyCases}
        onSelectCase={vi.fn()}
        page={1}
        totalPages={1}
        total={2}
        onPageChange={vi.fn()}
      />
    );

    expect(html).toContain('signal-transfer');
    expect(html).toContain('signal-duplicate');
  });

  it('renders pagination details', () => {
    const html = renderToStaticMarkup(
      <ReconciliationTable
        cases={dummyCases}
        onSelectCase={vi.fn()}
        page={2}
        totalPages={5}
        total={70}
        onPageChange={vi.fn()}
      />
    );

    expect(html).toContain('Showing page');
    expect(html).toContain('2');
    expect(html).toContain('5');
    expect(html).toContain('70 cases');
    expect(html).toContain('prev-page-btn');
    expect(html).toContain('next-page-btn');
  });

  it('renders empty message when no cases exist', () => {
    const html = renderToStaticMarkup(
      <ReconciliationTable
        cases={[]}
        onSelectCase={vi.fn()}
        page={1}
        totalPages={1}
        total={0}
        onPageChange={vi.fn()}
      />
    );

    expect(html).toContain('No reconciliation cases match the selected filters.');
  });
});
