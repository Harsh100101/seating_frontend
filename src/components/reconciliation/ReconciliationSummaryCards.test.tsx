import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ReconciliationSummaryCards } from './ReconciliationSummaryCards';
import { ReconciliationSummary } from '../../api/reconciliation';

describe('ReconciliationSummaryCards Component', () => {
  const dummySummary: ReconciliationSummary = {
    totalExcelEmployees: 1420,
    matchedEmployees: 1406,
    openMismatches: 14,
    resolvedMismatches: 4,
    needsReview: 2,
    excelStale: 3,
    systemCorrectionRequired: 5,
    formattingOnly: 2,
    blockedAmbiguous: 2,
  };

  it('renders all 9 summary metric cards with accurate formatted counts', () => {
    const html = renderToStaticMarkup(
      <ReconciliationSummaryCards summary={dummySummary} loading={false} />
    );

    // Verify all 9 metric labels
    expect(html).toContain('Total Excel Employees');
    expect(html).toContain('Matched Employees');
    expect(html).toContain('Open Mismatches');
    expect(html).toContain('Resolved Mismatches');
    expect(html).toContain('Needs Review');
    expect(html).toContain('Excel Stale');
    expect(html).toContain('System Correction Required');
    expect(html).toContain('Formatting-Only');
    expect(html).toContain('Blocked / Ambiguous');

    // Verify formatted values
    expect(html).toContain('1,420');
    expect(html).toContain('1,406');
    expect(html).toContain('14');
    expect(html).toContain('4');
    expect(html).toContain('2');
    expect(html).toContain('3');
    expect(html).toContain('5');
  });

  it('renders loading indicators when loading is true', () => {
    const html = renderToStaticMarkup(
      <ReconciliationSummaryCards summary={null} loading={true} />
    );

    expect(html).toContain('animate-pulse');
    expect(html).toContain('…');
  });

  it('highlights the card corresponding to activeFilter', () => {
    const html = renderToStaticMarkup(
      <ReconciliationSummaryCards
        summary={dummySummary}
        activeFilter="OPEN"
      />
    );

    expect(html).toContain('ring-2 ring-blue-500');
  });
});
