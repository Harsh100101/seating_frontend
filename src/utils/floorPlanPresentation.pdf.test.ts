import { describe, expect, it } from 'vitest';
import { getPdfFloorPlanPage, isPdfFloorPlanAsset, resolveFloorPlanSource, setPdfFloorPlanPage } from './floorPlanPresentation';

describe('PDF floor-plan metadata', () => {
  it('detects PDFs and keeps the selected page in protected image sources', () => {
    const imageUrl = '/uploads/floors/floor-1.pdf#page=3';
    expect(isPdfFloorPlanAsset(imageUrl)).toBe(true);
    expect(getPdfFloorPlanPage(imageUrl)).toBe(3);
    expect(resolveFloorPlanSource('floor/1', imageUrl)).toBe('/api/floors/floor%2F1/image#page=3');
    expect(setPdfFloorPlanPage('/uploads/floors/floor-1.pdf#page=3', 2)).toBe('/uploads/floors/floor-1.pdf#page=2');
  });
});
