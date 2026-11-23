import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { WorkstationFilters } from './WorkstationFilters';
import type { WorkstationFilterOptionsResponse } from '@seating/shared';

const legitimateUnits = [
  ['6ae5927f73d051edeceb8f05', 'Unit 1', 'UNIT-1'],
  ['6ae441a6b1dcf3d32d46a1e9', 'Unit 2', 'UNIT-2'],
  ['6ae441a6b1dcf3d32d46a1ea', 'Unit 3', 'UNIT-3'],
  ['6ae441a6b1dcf3d32d46a1eb', 'Unit 4', 'UNIT-4'],
  ['6ae441a6b1dcf3d32d46a1ec', 'Unit 5', 'UNIT-5'],
] as const;

function filterOptions(): WorkstationFilterOptionsResponse {
  return {
    units: legitimateUnits.map(([id, name, code]) => ({ id, name, code, location: null })),
    buildings: [],
    floors: [],
    officeAreas: [],
    departments: [],
    sections: [],
    functions: [],
    statuses: [],
    userScope: { role: 'SUPER_ADMIN', isRestricted: false, lockedUnitId: null },
  };
}

describe('WorkstationFilters Unit selector', () => {
  it('renders All Units plus every legitimate Unit returned by the API', () => {
    const html = renderToStaticMarkup(
      <WorkstationFilters
        filters={{}}
        options={filterOptions()}
        loadingOptions={false}
        onFilterChange={vi.fn()}
        onResetAll={vi.fn()}
      />,
    );

    const unitSelect = html.match(/<select[^>]*id="unitSelect"[^>]*>([\s\S]*?)<\/select>/)?.[1] ?? '';
    expect(unitSelect.match(/<option/g)).toHaveLength(6);
    expect(unitSelect).toContain('All Units');
    for (const [, name] of legitimateUnits) expect(unitSelect).toContain(name);
  });
});
