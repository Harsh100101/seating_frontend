import { describe, it, expect, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { EmployeeFilters, EmployeeFiltersState, EmployeeFilterOptionsData } from './EmployeeFilters';

describe('EmployeeFilters component', () => {
  const mockFilters: EmployeeFiltersState = {
    unitId: 'unit-1',
    buildingId: 'bld-1',
    floorId: 'flr-1',
    officeArea: 'East Executive Cabins',
    departmentId: 'dept-1',
    sectionId: 'sec-1',
    functionId: 'fn-1',
    reportingTo: 'Piyush Bharda',
    hod: 'Yogesh Kumar Gupta',
    seatingStatus: 'ASSIGNED',
    activeStatus: 'ACTIVE',
    search: 'John',
    sortBy: 'employeeName',
    sortOrder: 'asc',
    page: 1,
    pageSize: 50,
  };

  const mockOptions: EmployeeFilterOptionsData = {
    units: [{ id: 'unit-1', name: 'Unit 1', code: 'UNIT-1' }, { id: 'unit-2', name: 'Unit 2', code: 'UNIT-2' }],
    buildings: [{ id: 'bld-1', name: 'Santosh Bhavan' }],
    floors: [{ id: 'flr-1', name: 'Floor 1', floorNumber: 1, buildingId: 'bld-1' }],
    officeAreas: ['East Executive Cabins'],
    areaOptions: [{ id: 'area-1', name: 'East Executive Cabins', floorId: 'flr-1' }],
    departments: [{ id: 'dept-1', name: 'Sales', code: 'SLS' }],
    sections: ['Process Engineering'],
    sectionOptions: [{ id: 'sec-1', name: 'Process Engineering', departmentId: 'dept-1' }],
    functions: ['Manufacturing Operations'],
    functionOptions: [{ id: 'fn-1', name: 'Manufacturing Operations', sectionId: 'sec-1' }],
    reportingToList: ['Piyush Bharda', 'John Doe'],
    hods: ['Yogesh Kumar Gupta', 'Jane Smith'],
    userScope: {
      role: 'SUPER_ADMIN',
      isRestricted: false,
      lockedUnitId: null,
    },
  };

  it('renders all 12 filter controls matching hierarchy layout', () => {
    const html = renderToStaticMarkup(
      <EmployeeFilters
        filters={mockFilters}
        options={mockOptions}
        loadingOptions={false}
        onFilterChange={vi.fn()}
        onResetAll={vi.fn()}
        totalCount={126}
        loadedCount={50}
        page={1}
        totalPages={3}
        viewMode="cards"
        onViewModeChange={vi.fn()}
        pageSize={50}
        onPageSizeChange={vi.fn()}
      />
    );

    // Row 1: Location Hierarchy
    expect(html).toContain('Unit (Facility)');
    expect(html).toContain('Building');
    expect(html).toContain('Floor');
    expect(html).toContain('Office / Area');

    // Row 2: Organizational Hierarchy & Supervisor
    expect(html).toContain('Department');
    expect(html).toContain('Section');
    expect(html).toContain('Function');
    expect(html).toContain('Reporting To');

    // Row 3: Leadership, Status & Sorting
    expect(html).toContain('Department Head (HOD)');
    expect(html).toContain('Seating Status');
    expect(html).toContain('Active Status');
    expect(html).toContain('Sort Order');

    // Options rendered inside dropdowns
    expect(html).toContain('Santosh Bhavan');
    expect(html).toContain('Floor 1');
    expect(html).toContain('East Executive Cabins');
    expect(html).toContain('Sales');
    expect(html).toContain('Process Engineering');
    expect(html).toContain('Manufacturing Operations');
    expect(html).toContain('Piyush Bharda');
    expect(html).toContain('Yogesh Kumar Gupta');

    // Row 4: Search & metrics
    expect(html).toContain('Search by code, name, section, function, PC, desk...');
    expect(html).toContain('126 total');

    // Active chips rendered
    expect(html).toContain('Active Filters:');
    expect(html).toContain('Clear All');
  });

  it('renders Locked badge for restricted Unit Admin', () => {
    const restrictedOptions: EmployeeFilterOptionsData = {
      ...mockOptions,
      userScope: {
        role: 'UNIT_ADMIN',
        isRestricted: true,
        lockedUnitId: 'unit-2',
      },
    };

    const html = renderToStaticMarkup(
      <EmployeeFilters
        filters={{ ...mockFilters, unitId: 'unit-2' }}
        options={restrictedOptions}
        loadingOptions={false}
        onFilterChange={vi.fn()}
        onResetAll={vi.fn()}
        totalCount={126}
        loadedCount={50}
        page={1}
        totalPages={3}
        viewMode="cards"
        onViewModeChange={vi.fn()}
        pageSize={50}
        onPageSizeChange={vi.fn()}
      />
    );

    expect(html).toContain('Locked');
    expect(html).toContain('disabled=""');
  });

  it('renders displayName with parent references in area, section, and function options and active chips', () => {
    const optionsWithDisplayNames: EmployeeFilterOptionsData = {
      ...mockOptions,
      areaOptions: [
        { id: 'area-1', name: 'General Office', floorId: 'flr-1', displayName: 'Unit 2 → Santosh Bhavan → GF → General Office' },
        { id: 'area-2', name: 'General Office', floorId: 'flr-2', displayName: 'Unit 2 → Manufacturing Office → 1st Floor → General Office' }
      ],
      sectionOptions: [
        { id: 'sec-1', name: 'IT Infrastructure', departmentId: 'dept-1', displayName: 'IT & Infrastructure → IT Infrastructure' },
        { id: 'sec-2', name: 'IT Infrastructure', departmentId: 'dept-2', displayName: 'Admin & IT → IT Infrastructure' }
      ],
      functionOptions: [
        { id: 'fn-1', name: 'Manufacturing Operations', sectionId: 'sec-1', displayName: 'Commercial → Product Costing → Manufacturing Operations' },
        { id: 'fn-2', name: 'Manufacturing Operations', sectionId: 'sec-2', displayName: 'Farm Tillage Equipment & Blades → Blade Paint & Packing → Manufacturing Operations' }
      ]
    };

    const filtersWithSelection: EmployeeFiltersState = {
      ...mockFilters,
      officeArea: 'area-1',
      sectionId: 'sec-1',
      functionId: 'fn-1'
    };

    const html = renderToStaticMarkup(
      <EmployeeFilters
        filters={filtersWithSelection}
        options={optionsWithDisplayNames}
        loadingOptions={false}
        onFilterChange={vi.fn()}
        onResetAll={vi.fn()}
        totalCount={126}
        loadedCount={50}
        page={1}
        totalPages={3}
        viewMode="cards"
        onViewModeChange={vi.fn()}
        pageSize={50}
        onPageSizeChange={vi.fn()}
      />
    );

    // Dropdown options render full hierarchical reference
    expect(html).toContain('Unit 2 → Santosh Bhavan → GF → General Office');
    expect(html).toContain('Unit 2 → Manufacturing Office → 1st Floor → General Office');
    expect(html).toContain('IT &amp; Infrastructure → IT Infrastructure');
    expect(html).toContain('Admin &amp; IT → IT Infrastructure');
    expect(html).toContain('Commercial → Product Costing → Manufacturing Operations');
    expect(html).toContain('Farm Tillage Equipment &amp; Blades → Blade Paint &amp; Packing → Manufacturing Operations');

    // Active chips show resolved hierarchical displayName
    expect(html).toContain('Area:');
    expect(html).toContain('Unit 2 → Santosh Bhavan → GF → General Office');
    expect(html).toContain('Section:');
    expect(html).toContain('IT &amp; Infrastructure → IT Infrastructure');
    expect(html).toContain('Function:');
    expect(html).toContain('Commercial → Product Costing → Manufacturing Operations');
  });
});
