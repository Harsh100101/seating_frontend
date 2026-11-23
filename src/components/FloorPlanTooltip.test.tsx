import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { FloorPlanTooltip } from './FloorPlanTooltip';

const seat = {
  id: 'seat-1',
  label: 'WS-01',
  type: 'STANDARD_DESK',
  status: 'AVAILABLE',
  x: 10,
  y: 20,
  rotation: 0,
  floorId: 'floor-1',
  officeArea: 'Engineering',
  zone: 'North Bay',
} as any;

describe('FloorPlanTooltip contrast and status presentation', () => {
  it('uses explicit light-on-dark classes for available tooltip content', () => {
    const html = renderToStaticMarkup(
      <FloorPlanTooltip seat={seat} position={{ x: 100, y: 100 }} containerBounds={{ width: 1200, height: 800 }} />,
    );

    expect(html).toContain('floor-plan-tooltip');
    expect(html).toContain('floor-plan-tooltip-label');
    expect(html).toContain('floor-plan-tooltip-value');
    expect(html).toContain('floor-plan-tooltip-available');
  });

  it('keeps occupied status readable with employee and department values', () => {
    const html = renderToStaticMarkup(
      <FloorPlanTooltip
        seat={{
          ...seat,
          employeeId: 'employee-1',
          employee: { employeeCode: 'EMP-1', fullName: 'Test Employee', designation: 'Engineer' },
          department: { id: 'department-1', name: 'A very long Engineering Department name', colorHex: '#2563eb', code: 'ENG' },
        }}
        position={{ x: 100, y: 100 }}
        containerBounds={{ width: 1200, height: 800 }}
      />,
    );

    expect(html).toContain('Occupied');
    expect(html).toContain('Test Employee');
    expect(html).toContain('A very long Engineering Department name');
    expect(html).toContain('floor-plan-tooltip-muted');
  });
});
