import { describe, expect, it } from 'vitest';
import {
  calculateFitViewport,
  calculatePinchViewport,
  calculateWheelViewport,
  shouldZoomFloorPlan,
} from './floorPlanViewport';

describe('floor plan viewport controls', () => {
  it('fits the complete map inside the available viewport while preserving aspect ratio', () => {
    const result = calculateFitViewport({
      mapWidth: 1600,
      mapHeight: 1000,
      viewport: { width: 1000, height: 700 },
    });

    expect(result.scale).toBeCloseTo(0.58, 2);
    expect(result.position.x).toBeCloseTo(36, 0);
    expect(result.position.y).toBeCloseTo(60, 0);
  });

  it('only enables map zoom for modifier-wheel gestures', () => {
    expect(shouldZoomFloorPlan({ ctrlKey: false, metaKey: false })).toBe(false);
    expect(shouldZoomFloorPlan({ ctrlKey: true, metaKey: false })).toBe(true);
  });

  it('keeps the point under the pointer stable while zooming', () => {
    const result = calculateWheelViewport({
      oldScale: 1,
      deltaY: -100,
      pointer: { x: 300, y: 200 },
      position: { x: 40, y: 30 },
    });

    expect(result.scale).toBeCloseTo(1.08, 2);
    expect(result.position.x).toBeCloseTo(19.2, 1);
    expect(result.position.y).toBeCloseTo(16.4, 1);
  });

  it('fits against canonical canvas dimensions rather than natural asset dimensions', () => {
    const canonical = calculateFitViewport({
      mapWidth: 2400,
      mapHeight: 1640,
      viewport: { width: 1200, height: 800 },
    });
    expect(canonical.scale).toBeCloseTo(0.44, 2);
    expect(canonical.position.x).toBeCloseTo(67, 0);
    expect(canonical.position.y).toBeCloseTo(36, 0);
  });

  it('zooms around a two-finger pinch centre and clamps its scale', () => {
    const result = calculatePinchViewport({
      startScale: 1,
      startPosition: { x: 20, y: 30 },
      startDistance: 100,
      currentDistance: 150,
      startCenter: { x: 200, y: 150 },
      currentCenter: { x: 210, y: 160 },
    });
    expect(result.scale).toBeCloseTo(1.5, 2);
    expect(result.position).toEqual({ x: -60, y: -20 });
  });
});
