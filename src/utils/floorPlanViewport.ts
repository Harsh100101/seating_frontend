export const MIN_FLOOR_PLAN_SCALE = 0.15;
export const MAX_FLOOR_PLAN_SCALE = 3.5;

export interface FloorPlanViewportSize {
  width: number;
  height: number;
}

export interface FloorPlanViewportPosition {
  x: number;
  y: number;
}

export const clampFloorPlanScale = (scale: number): number =>
  Math.min(MAX_FLOOR_PLAN_SCALE, Math.max(MIN_FLOOR_PLAN_SCALE, scale));

export const calculateFitViewport = ({
  mapWidth,
  mapHeight,
  viewport,
  padding = 36,
  maxScale = 1.25,
}: {
  mapWidth: number;
  mapHeight: number;
  viewport: FloorPlanViewportSize;
  padding?: number;
  maxScale?: number;
}): { scale: number; position: FloorPlanViewportPosition } => {
  const safeMapWidth = Math.max(1, mapWidth);
  const safeMapHeight = Math.max(1, mapHeight);
  const availableWidth = Math.max(1, viewport.width - padding * 2);
  const availableHeight = Math.max(1, viewport.height - padding * 2);
  const scale = Math.min(maxScale, availableWidth / safeMapWidth, availableHeight / safeMapHeight);
  const safeScale = Math.max(MIN_FLOOR_PLAN_SCALE, scale);

  return {
    scale: safeScale,
    position: {
      x: (viewport.width - safeMapWidth * safeScale) / 2,
      y: (viewport.height - safeMapHeight * safeScale) / 2,
    },
  };
};

export const shouldZoomFloorPlan = (event: Pick<WheelEvent, 'ctrlKey' | 'metaKey'>): boolean =>
  Boolean(event.ctrlKey || event.metaKey);

export const calculateWheelViewport = ({
  oldScale,
  deltaY,
  pointer,
  position,
}: {
  oldScale: number;
  deltaY: number;
  pointer: FloorPlanViewportPosition;
  position: FloorPlanViewportPosition;
}): { scale: number; position: FloorPlanViewportPosition } => {
  const scaleBy = 1.08;
  const safeOldScale = clampFloorPlanScale(oldScale);
  const point = {
    x: (pointer.x - position.x) / safeOldScale,
    y: (pointer.y - position.y) / safeOldScale,
  };
  const scale = clampFloorPlanScale(deltaY > 0 ? safeOldScale / scaleBy : safeOldScale * scaleBy);

  return {
    scale,
    position: {
      x: pointer.x - point.x * scale,
      y: pointer.y - point.y * scale,
    },
  };
};

export const calculatePinchViewport = ({
  startScale,
  startPosition,
  startDistance,
  currentDistance,
  startCenter,
  currentCenter,
}: {
  startScale: number;
  startPosition: FloorPlanViewportPosition;
  startDistance: number;
  currentDistance: number;
  startCenter: FloorPlanViewportPosition;
  currentCenter: FloorPlanViewportPosition;
}): { scale: number; position: FloorPlanViewportPosition } => {
  const safeStartScale = clampFloorPlanScale(startScale);
  const factor = startDistance > 0 ? currentDistance / startDistance : 1;
  const scale = clampFloorPlanScale(safeStartScale * factor);
  const canvasPoint = {
    x: (startCenter.x - startPosition.x) / safeStartScale,
    y: (startCenter.y - startPosition.y) / safeStartScale,
  };

  return {
    scale,
    position: {
      x: currentCenter.x - canvasPoint.x * scale,
      y: currentCenter.y - canvasPoint.y * scale,
    },
  };
};
