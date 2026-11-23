import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ComparisonView } from './ComparisonView';
import { FieldComparison } from '../../api/reconciliation';

describe('ComparisonView Component', () => {
  const dummyComparisons: FieldComparison[] = [
    {
      field: 'unit',
      fieldLabel: 'Unit',
      excelValue: 'Unit 1',
      systemValue: 'Unit 1',
      status: 'SAME',
    },
    {
      field: 'building',
      fieldLabel: 'Building',
      excelValue: 'Santosh Bhavan',
      systemValue: 'Santosh Bhavan',
      status: 'SAME',
    },
    {
      field: 'floor',
      fieldLabel: 'Floor',
      excelValue: 'Floor 1',
      systemValue: 'Floor 2',
      status: 'DIFFERENCE',
    },
    {
      field: 'office',
      fieldLabel: 'Office/Area',
      excelValue: 'Executive Area',
      systemValue: 'Open Workspace',
      status: 'DIFFERENCE',
    },
    {
      field: 'department',
      fieldLabel: 'Department',
      excelValue: 'Information Technology',
      systemValue: 'Information Technology',
      status: 'SAME',
    },
    {
      field: 'section',
      fieldLabel: 'Section',
      excelValue: 'Software Eng',
      systemValue: 'Software Engineering',
      status: 'RESOLVED',
    },
    {
      field: 'function',
      fieldLabel: 'Function',
      excelValue: 'Core Dev',
      systemValue: 'Core Dev',
      status: 'SAME',
    },
    {
      field: 'workstation',
      fieldLabel: 'Workstation',
      excelValue: 'WS-01-042',
      systemValue: 'WS-02-108',
      status: 'BLOCKED',
      notes: 'Target seat is occupied',
    },
    {
      field: 'designation',
      fieldLabel: 'Designation',
      excelValue: 'Senior Specialist',
      systemValue: 'Lead Specialist',
      status: 'DIFFERENCE',
    },
    {
      field: 'status',
      fieldLabel: 'Active status',
      excelValue: 'ACTIVE',
      systemValue: 'ACTIVE',
      status: 'SAME',
    },
  ];

  it('renders employee code, name, and field comparison table', () => {
    const html = renderToStaticMarkup(
      <ComparisonView
        employeeCode="EMP00412"
        employeeName="Rahul Sharma"
        comparisons={dummyComparisons}
        caseStatus="OPEN"
      />
    );

    expect(html).toContain('EMP00412');
    expect(html).toContain('Rahul Sharma');
    expect(html).toContain('Field');
    expect(html).toContain('Excel (Authoritative)');
    expect(html).toContain('Current System (MongoDB)');
    expect(html).toContain('Status');
  });

  it('renders accessible color/icon indicators for SAME, DIFFERENCE, RESOLVED, and BLOCKED', () => {
    const html = renderToStaticMarkup(
      <ComparisonView
        employeeCode="EMP00412"
        employeeName="Rahul Sharma"
        comparisons={dummyComparisons}
      />
    );

    // Status badges
    expect(html).toContain('status-badge-same');
    expect(html).toContain('Match');
    expect(html).toContain('status-badge-difference');
    expect(html).toContain('Difference');
    expect(html).toContain('status-badge-resolved');
    expect(html).toContain('Resolved');
    expect(html).toContain('status-badge-blocked');
    expect(html).toContain('Blocked');
  });

  it('calculates and shows the count of field discrepancies', () => {
    const html = renderToStaticMarkup(
      <ComparisonView
        employeeCode="EMP00412"
        employeeName="Rahul Sharma"
        comparisons={dummyComparisons}
      />
    );

    // The canonical mismatch count includes actual differences, not blocked workflow state.
    expect(html).toContain('3 Field Discrepancies');
  });

  it('shows "All Fields Match" when diff count is zero', () => {
    const matchingComparisons: FieldComparison[] = [
      {
        field: 'unit',
        fieldLabel: 'Unit',
        excelValue: 'Unit 1',
        systemValue: 'Unit 1',
        status: 'SAME',
      },
    ];

    const html = renderToStaticMarkup(
      <ComparisonView
        employeeCode="EMP001"
        employeeName="Alice"
        comparisons={matchingComparisons}
      />
    );

    expect(html).toContain('All Fields Match');
  });

  it('does not show All Fields Match when the backend reports mismatches', () => {
    const html = renderToStaticMarkup(
      <ComparisonView
        employeeCode="SS3362"
        employeeName="MOHIT PARMAR"
        comparisons={[{
          field: 'unit',
          fieldLabel: 'Unit',
          excelValue: 'Unit-1',
          systemValue: 'Unit 2',
          status: 'DIFFERENCE',
        }]}
        mismatchCount={1}
        allFieldsMatch={false}
      />
    );

    expect(html).toContain('1 Field Discrepancy');
    expect(html).not.toContain('All Fields Match');
  });

  it('renders fallback when Excel or System value is blank/null', () => {
    const blankComparisons: FieldComparison[] = [
      {
        field: 'workstation',
        fieldLabel: 'Workstation',
        excelValue: null,
        systemValue: null,
        status: 'SAME',
      },
    ];

    const html = renderToStaticMarkup(
      <ComparisonView
        employeeCode="EMP002"
        employeeName="Bob"
        comparisons={blankComparisons}
      />
    );

    expect(html).toContain('None / Blank');
    expect(html).toContain('None / Unassigned');
  });
});
