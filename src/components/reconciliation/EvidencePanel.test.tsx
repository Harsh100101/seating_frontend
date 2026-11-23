import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { EvidencePanel } from './EvidencePanel';
import { EvidenceData } from '../../api/reconciliation';

describe('EvidencePanel Component', () => {
  const dummyEvidence: EvidenceData = {
    currentRecord: {
      id: 'emp-101',
      employeeCode: 'EMP101',
      fullName: 'Vikram Mehta',
      email: 'vikram.mehta@company.com',
      status: 'ACTIVE',
      designation: 'Senior Engineer',
      updatedAt: '2026-11-18T10:00:00Z',
    },
    currentSeat: {
      id: 'seat-501',
      label: 'WS-U2-F2-045',
      floorName: 'Floor 2',
      roomOrArea: 'Wing B',
      buildingName: 'Santosh Bhavan',
      status: 'OCCUPIED',
      type: 'STANDARD_DESK',
    },
    hierarchy: {
      unitName: 'Unit 2',
      plantName: 'Plant 1',
      buildingName: 'Santosh Bhavan',
      floorName: 'Floor 2',
      departmentName: 'Engineering',
      sectionName: 'Core Platform',
      functionName: 'Backend',
    },
    transferHistory: [
      {
        id: 'tr-8891',
        requestNumber: 'TR-2026-08891',
        status: 'APPROVED',
        fromLocation: 'Unit 1 / Santosh Bhavan / Floor 1',
        toLocation: 'Unit 2 / Santosh Bhavan / Floor 2 / WS-U2-F2-045',
        approvedAt: '2026-11-15T14:30:00Z',
        explainsMismatch: true,
        explanationNote: 'Approved relocation due to project restructuring.',
      },
    ],
    hasApprovedExplainingTransfer: true,
    duplicateConflict: {
      isDuplicate: true,
      count: 2,
      occurrences: [
        { rowNumber: 142, sheetName: 'Sheet1', details: 'Designation: Specialist' },
        { rowNumber: 158, sheetName: 'Sheet1', details: 'Designation: Lead Specialist' },
      ],
      warningMessage: 'Duplicate Excel entries detected for EMP101.',
    },
    recentAuditLogs: [
      {
        id: 'log-1',
        action: 'TRANSFER_APPROVED',
        performedBy: 'Super Admin',
        timestamp: '2026-11-15T14:30:00Z',
        details: 'Approved seat transfer TR-2026-08891',
      },
    ],
    excelRowInfo: {
      sheetName: 'Unit_1_Workstation Detail',
      rowNumber: 142,
      rawValues: {
        'Employee ID': 'EMP101',
        'Department': 'Engineering',
      },
    },
  };

  it('renders current employee record and workstation details', () => {
    const html = renderToStaticMarkup(<EvidencePanel evidence={dummyEvidence} />);

    expect(html).toContain('EMP101');
    expect(html).toContain('Vikram Mehta');
    expect(html).toContain('vikram.mehta@company.com');
    expect(html).toContain('Senior Engineer');
    expect(html).toContain('WS-U2-F2-045');
    expect(html).toContain('Santosh Bhavan');
    expect(html).toContain('OCCUPIED');
  });

  it('renders industrial and organizational hierarchy', () => {
    const html = renderToStaticMarkup(<EvidencePanel evidence={dummyEvidence} />);

    expect(html).toContain('Unit 2');
    expect(html).toContain('Engineering');
    expect(html).toContain('Core Platform');
  });

  it('prominently highlights approved transfer when it explains the mismatch', () => {
    const html = renderToStaticMarkup(<EvidencePanel evidence={dummyEvidence} />);

    expect(html).toContain('transfer-explains-mismatch-banner');
    expect(html).toContain('Transfer Explains Discrepancy');
    expect(html).toContain('Approved Official Transfer Recorded');
    expect(html).toContain('TR-2026-08891');
    expect(html).toContain('Approved relocation due to project restructuring.');
  });

  it('renders duplicate Excel row conflict warning when duplicate records exist', () => {
    const html = renderToStaticMarkup(<EvidencePanel evidence={dummyEvidence} />);

    expect(html).toContain('duplicate-excel-warning');
    expect(html).toContain('Duplicate Excel Row Conflict (2 Occurrences)');
    expect(html).toContain('Duplicate Excel entries detected for EMP101.');
    expect(html).toContain('Row 142');
    expect(html).toContain('Row 158');
  });

  it('renders recent audit logs and Excel source info', () => {
    const html = renderToStaticMarkup(<EvidencePanel evidence={dummyEvidence} />);

    expect(html).toContain('TRANSFER_APPROVED');
    expect(html).toContain('Super Admin');
    expect(html).toContain('Unit_1_Workstation Detail');
    expect(html).toContain('#142');
  });

  it('handles empty / clean evidence without banners when no transfer or duplicate exists', () => {
    const cleanEvidence: EvidenceData = {
      currentRecord: null,
      currentSeat: null,
      hierarchy: {},
      transferHistory: [],
      hasApprovedExplainingTransfer: false,
      duplicateConflict: null,
      recentAuditLogs: [],
    };

    const html = renderToStaticMarkup(<EvidencePanel evidence={cleanEvidence} />);

    expect(html).not.toContain('transfer-explains-mismatch-banner');
    expect(html).not.toContain('duplicate-excel-warning');
    expect(html).toContain('No active MongoDB record found.');
    expect(html).toContain('No workstation assigned in live system.');
  });
});
