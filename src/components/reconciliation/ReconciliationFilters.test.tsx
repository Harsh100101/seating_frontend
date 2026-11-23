import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { ReconciliationFilters } from './ReconciliationFilters';
import { ReconciliationFiltersQuery } from '../../api/reconciliation';

describe('ReconciliationFilters Component', () => {
  const defaultFilters: ReconciliationFiltersQuery = {
    page: 1,
    limit: 15,
    status: 'ALL',
    classification: 'ALL',
    unit: 'ALL',
    department: 'ALL',
    mismatchField: 'ALL',
    search: '',
  };

  it('renders search input and all 5 filter dropdowns', () => {
    const html = renderToStaticMarkup(
      <ReconciliationFilters
        filters={defaultFilters}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
        totalResults={14}
        loading={false}
      />
    );

    // Search input
    expect(html).toContain('search-input');
    expect(html).toContain('Search by Employee ID or Name…');

    // 5 Filter Selects
    expect(html).toContain('filter-status');
    expect(html).toContain('All Statuses');
    expect(html).toContain('filter-classification');
    expect(html).toContain('All Classifications');
    expect(html).toContain('filter-unit');
    expect(html).toContain('All Units');
    expect(html).toContain('filter-department');
    expect(html).toContain('All Departments');
    expect(html).toContain('filter-mismatch-field');
    expect(html).toContain('All Mismatch Fields');

    // Counter
    expect(html).toContain('14 cases found');

    // Reset button hidden when no filters are active
    expect(html).not.toContain('reset-filters-btn');
  });

  it('shows Reset Filters button when active filters exist', () => {
    const activeFilters: ReconciliationFiltersQuery = {
      ...defaultFilters,
      status: 'OPEN',
      search: 'Rahul',
    };

    const html = renderToStaticMarkup(
      <ReconciliationFilters
        filters={activeFilters}
        onFilterChange={vi.fn()}
        onReset={vi.fn()}
        totalResults={3}
      />
    );

    expect(html).toContain('reset-filters-btn');
    expect(html).toContain('Reset Filters');
  });
});
