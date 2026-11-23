export type FloorPlanRole = 'SUPER_ADMIN' | 'TECH_ADMIN' | 'UNIT_ADMIN' | string | undefined | null;

export const canManageFloorPlan = (role: FloorPlanRole): boolean =>
  role === 'SUPER_ADMIN' || role === 'TECH_ADMIN' || role === 'UNIT_ADMIN';

export const hasFloorPlanAsset = (imageUrl?: string | null): boolean =>
  typeof imageUrl === 'string' && imageUrl.trim().length > 0;

export const isPdfFloorPlanAsset = (imageUrl?: string | null): boolean =>
  typeof imageUrl === 'string' && /^\/uploads\/floors\/[^#]+\.pdf(?:#|$)/i.test(imageUrl.trim());

export const getPdfFloorPlanPage = (imageUrl?: string | null): number => {
  const match = typeof imageUrl === 'string' ? imageUrl.match(/#page=(\d+)/i) : null;
  return match ? Math.max(1, Number(match[1])) : 1;
};

export const setPdfFloorPlanPage = (imageUrl: string, page: number): string => {
  const base = imageUrl.replace(/#page=\d+$/i, '');
  return `${base}#page=${Math.max(1, Math.floor(page))}`;
};

/** A physical placement is distinct from a business-seat assignment. */
export const hasSavedFloorPlanPosition = (
  x: number | null | undefined,
  y: number | null | undefined,
  placementSource?: string | null,
): boolean =>
  (placementSource === 'MANUAL' || placementSource === 'IMPORT') &&
  Number.isFinite(x) && Number.isFinite(y) && Number(x) >= 0 && Number(y) >= 0;

export type FloorPlanViewState = 'SELECT_HIERARCHY' | 'NO_FLOOR_MAP' | 'CANVAS';

export const getFloorPlanViewState = ({
  buildingId,
  floorId,
  imageUrl,
}: {
  buildingId?: string | null;
  floorId?: string | null;
  imageUrl?: string | null;
}): FloorPlanViewState => {
  if (!buildingId || !floorId) return 'SELECT_HIERARCHY';
  return hasFloorPlanAsset(imageUrl) ? 'CANVAS' : 'NO_FLOOR_MAP';
};

/**
 * Deduplicate only repeat deliveries of the same database identity. Distinct
 * IDs remain visible even when their names expose a data-quality problem.
 */
export const uniqueFloorOptionsById = <T extends { id: string }>(floors: T[]): T[] => {
  const seen = new Set<string>();
  return floors.filter((floor) => {
    if (seen.has(floor.id)) return false;
    seen.add(floor.id);
    return true;
  });
};

export const formatFloorSeatCount = (count: number): string =>
  `${count} ${count === 1 ? 'seat' : 'seats'}`;

export interface FloorPlanVisibilitySummary {
  workstationCount?: number | null;
  floorMapConfigured?: boolean | null;
  hasLayoutData?: boolean | null;
}

/** Operational Floor Plan visibility; raw hierarchy records remain untouched. */
export const isFloorVisibleInFloorPlan = ({
  workstationCount = 0,
  floorMapConfigured = false,
  hasLayoutData = false,
}: FloorPlanVisibilitySummary): boolean =>
  Number(workstationCount) > 0 || Boolean(floorMapConfigured) || Boolean(hasLayoutData);

/**
 * A marker popup is valid only while its workstation remains both physically
 * placed and visible under the active Floor Plan filters.
 */
export const shouldClearMapMarkerState = (
  seatId: string | null | undefined,
  placedSeatIds: ReadonlySet<string>,
  visibleSeatIds: ReadonlySet<string>,
): boolean => Boolean(seatId && (!placedSeatIds.has(seatId) || !visibleSeatIds.has(seatId)));

/**
 * Seeded/public assets are already served by the frontend. Uploaded assets are
 * protected by the backend and must be read through the floor image endpoint.
 */
export const resolveFloorPlanSource = (floorId: string, imageUrl?: string | null): string | null => {
  const normalized = imageUrl?.trim();
  if (!normalized) return null;
  if (normalized.startsWith('/uploads/floors/')) {
    const page = normalized.match(/#page=(\d+)/i)?.[1];
    return `/api/floors/${encodeURIComponent(floorId)}/image${page ? `#page=${page}` : ''}`;
  }
  return normalized;
};

export interface NormalizedDropPosition {
  xRatio: number;
  yRatio: number;
  clampedX: number;
  clampedY: number;
}

/**
 * Calculates normalized coordinates (xRatio, yRatio between 0 and 1) clamped to actual
 * rendered architectural floor map image bounds, correctly handling zoom and pan.
 */
export function calculateNormalizedDropCoordinates({
  clientX,
  clientY,
  containerBounds,
  stagePos,
  stageScale,
  canvasWidth,
  canvasHeight,
  itemWidth = 64,
  itemHeight = 48,
}: {
  clientX: number;
  clientY: number;
  containerBounds: { left: number; top: number; width?: number; height?: number };
  stagePos: { x: number; y: number };
  stageScale: number;
  canvasWidth: number;
  canvasHeight: number;
  itemWidth?: number;
  itemHeight?: number;
}): NormalizedDropPosition {
  const safeScale = Math.max(0.01, stageScale);
  const viewportX = clientX - containerBounds.left;
  const viewportY = clientY - containerBounds.top;

  // Transform viewport coordinates to Konva canvas space
  const canvasX = (viewportX - stagePos.x) / safeScale;
  const canvasY = (viewportY - stagePos.y) / safeScale;

  // Center desk item on cursor point
  const unadjustedX = canvasX - itemWidth / 2;
  const unadjustedY = canvasY - itemHeight / 2;

  // Normalized ratios clamped between 0 and 1
  const rawXRatio = unadjustedX / canvasWidth;
  const rawYRatio = unadjustedY / canvasHeight;

  const xRatio = Math.max(0, Math.min(1, rawXRatio));
  const yRatio = Math.max(0, Math.min(1, rawYRatio));

  // Coordinates are in canonical canvas space. Zero is a valid map edge,
  // not an implicit "unplaced" sentinel.
  const maxX = Math.max(0, canvasWidth - itemWidth);
  const maxY = Math.max(0, canvasHeight - itemHeight);

  const clampedX = Math.max(0, Math.min(maxX, Math.round(xRatio * canvasWidth)));
  const clampedY = Math.max(0, Math.min(maxY, Math.round(yRatio * canvasHeight)));

  return {
    xRatio: Math.max(0, Math.min(1, clampedX / canvasWidth)),
    yRatio: Math.max(0, Math.min(1, clampedY / canvasHeight)),
    clampedX,
    clampedY,
  };
}

/**
 * Finds a workstation seat on the canvas under the specified pointer coordinates,
 * taking stage position and zoom into account.
 */
export function findSeatAtCanvasCoordinates<T extends { x: number; y: number; width?: number; height?: number }>({
  clientX,
  clientY,
  containerBounds,
  stagePos,
  stageScale,
  seats,
}: {
  clientX: number;
  clientY: number;
  containerBounds: { left: number; top: number };
  stagePos: { x: number; y: number };
  stageScale: number;
  seats: T[];
}): T | undefined {
  const safeScale = Math.max(0.01, stageScale);
  const viewportX = clientX - containerBounds.left;
  const viewportY = clientY - containerBounds.top;

  const canvasX = (viewportX - stagePos.x) / safeScale;
  const canvasY = (viewportY - stagePos.y) / safeScale;

  return seats.find((seat) => {
    const width = Number(seat.width) || 64;
    const height = Number(seat.height) || 48;
    return canvasX >= seat.x && canvasX <= seat.x + width && canvasY >= seat.y && canvasY <= seat.y + height;
  });
}

/**
 * Unplaces a workstation seat by clearing its placement source while strictly preserving
 * its physical coordinates, dimensions, labels, and employee assignments.
 * Never sets x=0, y=0 to indicate unplaced.
 */
export function unplaceWorkstation<T extends { placementSource?: string | null }>(seat: T): T {
  return {
    ...seat,
    placementSource: null,
  };
}

/**
 * Converts a marker drag performed from a collision-offset presentation
 * position back to the persistent canonical map coordinate. The visual offset
 * is deliberately never incorporated into saved seat data.
 */
export function calculateCanonicalMarkerDragPosition({
  persistent,
  presentation,
  dragged,
  canvasWidth,
  canvasHeight,
  markerWidth = 54,
  markerHeight = 30,
}: {
  persistent: { x: number; y: number };
  presentation: { x: number; y: number };
  dragged: { x: number; y: number };
  canvasWidth: number;
  canvasHeight: number;
  markerWidth?: number;
  markerHeight?: number;
}): { x: number; y: number } {
  const maxX = Math.max(0, canvasWidth - markerWidth);
  const maxY = Math.max(0, canvasHeight - markerHeight);
  const canonicalX = persistent.x + (dragged.x - presentation.x);
  const canonicalY = persistent.y + (dragged.y - presentation.y);
  return {
    x: Math.max(0, Math.min(maxX, Math.round(canonicalX))),
    y: Math.max(0, Math.min(maxY, Math.round(canonicalY))),
  };
}

export interface LayoutPlacementPayload {
  id?: string;
  x: number;
  y: number;
  placementSource: 'MANUAL';
  rotation: number;
  label: string;
  width: number;
  height: number;
  type?: string;
  status?: string;
}

export interface FloorLayoutPayload {
  seats: LayoutPlacementPayload[];
  placements: LayoutPlacementPayload[];
  unplacedSeatIds: string[];
}

export interface SeatLikeForLayout {
  id: string;
  label: string;
  x: number;
  y: number;
  placementSource?: string | null;
  rotation?: number;
  width?: number;
  height?: number;
  type?: string;
  status?: string;
}

/**
 * Prepares the payload for persisting floor layout coordinates.
 * Computes strictly disjoint `placements` and `unplacedSeatIds` with deduplicated seat IDs.
 * Ensures temporary IDs (starting with 'temp-') are omitted from `id` and `unplacedSeatIds`.
 * Ensures placed seats always have `placementSource: 'MANUAL'`.
 */
export function buildLayoutPayload<T extends SeatLikeForLayout>(seats: T[]): FloorLayoutPayload {
  const placedMap = new Map<string, LayoutPlacementPayload>();
  const unplacedIdSet = new Set<string>();

  for (const s of seats) {
    const isPlaced = hasSavedFloorPlanPosition(s.x, s.y, s.placementSource);
    const isTemp = s.id.startsWith('temp-');

    if (isPlaced) {
      const placement: LayoutPlacementPayload = {
        id: isTemp ? undefined : s.id,
        x: s.x,
        y: s.y,
        placementSource: 'MANUAL',
        rotation: s.rotation || 0,
        label: s.label,
        width: s.width || 64,
        height: s.height || 48,
        type: s.type,
        status: s.status,
      };

      // Deduplicate placed seats by ID or temp label key
      const key = isTemp ? `temp-${s.label.toLowerCase()}` : s.id;
      placedMap.set(key, placement);
    } else {
      // Unplaced workstation
      if (!isTemp) {
        unplacedIdSet.add(s.id);
      }
    }
  }

  // Strictly enforce disjointness:
  // If an ID appears in unplacedIdSet, it must NEVER appear in placedMap.
  for (const unplacedId of unplacedIdSet) {
    placedMap.delete(unplacedId);
  }

  const placements = Array.from(placedMap.values());
  const unplacedSeatIds = Array.from(unplacedIdSet);

  return {
    seats: placements,
    placements,
    unplacedSeatIds,
  };
}

/**
 * Sanitizes any raw database/Prisma/MongoDB error into a user-friendly message.
 * Never exposes raw internal errors to the client.
 */
export function sanitizeLayoutSaveError(errorMessage?: string | null): string {
  const fallback = 'Could not save layout because another update occurred. Your unsaved layout changes are still preserved.';
  if (!errorMessage || typeof errorMessage !== 'string') {
    return fallback;
  }
  const lower = errorMessage.toLowerCase();
  if (
    lower.includes('prisma') ||
    lower.includes('updatemany') ||
    lower.includes('write conflict') ||
    lower.includes('conflict') ||
    lower.includes('deadlock') ||
    lower.includes('mongo') ||
    lower.includes('transaction') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror')
  ) {
    return fallback;
  }
  // If backend returned a clean user-validation error (e.g. coordinates out of bounds)
  if (lower.includes('out of canvas bounds') || lower.includes('duplicate seat label')) {
    return errorMessage;
  }
  return fallback;
}

export type ZoomDetailLevel = 'LOW' | 'NORMAL' | 'HIGH';

/**
 * Determines the workstation marker detail level based on canvas zoom scale.
 * - LOW (< 0.60 / 60%): Show only WS label + status dot
 * - NORMAL (0.60 to 1.30): Show WS label + employee ID (or 'Vacant')
 * - HIGH (> 1.30): Ultra-compact: show WS label + employee ID (no full name expansion)
 */
export function getZoomDetailLevel(scale: number): ZoomDetailLevel {
  if (typeof scale !== 'number' || Number.isNaN(scale)) {
    return 'NORMAL';
  }
  if (scale < 0.6) {
    return 'LOW';
  }
  if (scale > 1.3) {
    return 'HIGH';
  }
  return 'NORMAL';
}

/**
 * Extracts employee initials from their full name.
 * e.g. 'Raj Rahulbhai Patil' -> 'RP', 'Nishant Kumar' -> 'NK', 'Sojitra Devansh Mehulbhai' -> 'SM'.
 */
export function getEmployeeInitials(fullName?: string | null): string {
  if (!fullName || typeof fullName !== 'string') return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

/**
 * Formats an employee's full name into a compact presentation string.
 * e.g. 'Raj Rahulbhai Patil' -> 'Raj R.'
 * Guarantees bounded length so markers never expand uncontrollably.
 */
export function getTruncatedEmployeeName(fullName?: string | null, maxLength?: number): string {
  if (!fullName || typeof fullName !== 'string') return '';
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';

  let formatted = parts.length === 1
    ? parts[0]
    : `${parts[0]} ${parts[1].charAt(0).toUpperCase()}.`;

  if (typeof maxLength === 'number' && maxLength > 0 && formatted.length > maxLength) {
    formatted = formatted.slice(0, maxLength).trim();
  }

  return formatted;
}

export interface WorkstationAriaSeat {
  label: string;
  employee?: { employeeCode?: string; fullName?: string } | null;
  status?: string | null;
}

/**
 * Builds an accessible aria-label for a workstation seat.
 * e.g. 'WS-03, occupied by employee 23321, Raj Rahulbhai Patil' or 'WS-08, available'.
 */
export function getWorkstationAriaLabel(seat: WorkstationAriaSeat): string {
  const label = seat?.label?.trim() || 'Workstation';
  const employee = seat?.employee;
  const isOccupied = Boolean(employee && (employee.employeeCode || employee.fullName));

  if (isOccupied && employee) {
    const code = employee.employeeCode?.trim();
    const name = employee.fullName?.trim();
    if (code && name) {
      return `${label}, occupied by employee ${code}, ${name}`;
    }
    if (code) {
      return `${label}, occupied by employee ${code}`;
    }
    if (name) {
      return `${label}, occupied by ${name}`;
    }
    return `${label}, occupied`;
  }

  const rawStatus = (seat?.status || '').toUpperCase().trim();
  if (rawStatus === 'MAINTENANCE') {
    return `${label}, maintenance`;
  }
  if (rawStatus === 'RESERVED') {
    return `${label}, reserved`;
  }
  if (rawStatus === 'OCCUPIED') {
    return `${label}, occupied`;
  }

  return `${label}, available`;
}

export interface VisualMarkerOffset {
  visualX: number;
  visualY: number;
  hasCollision: boolean;
}

export interface VisualMarkerOffsetOptions {
  markerWidth?: number;
  markerHeight?: number;
  minGap?: number;
  stageScale?: number;
  scale?: number;
  maxIterations?: number;
}

/**
 * Lightweight, pure visual collision detection and presentation-only offset calculation.
 *
 * Detects bounding box collisions between physically close seats (e.g. IT SYSTEMS WS-01, WS-03, WS-05
 * or test coordinates x=0.50, 0.505, 0.51).
 * Applies small presentation-only offsets so markers do not occlude each other's labels.
 *
 * CRITICAL: Stored / physical x and y in the input seats are NEVER MUTATED.
 * Stored coordinates remain actual physical desk coordinates.
 *
 * Pure, memoizable, and highly efficient for 40-100+ seats per floor.
 */
export function computeVisualMarkerOffsets<
  T extends { id: string; x: number; y: number; width?: number; height?: number }
>(
  seats: T[],
  options?: VisualMarkerOffsetOptions,
): Map<string, VisualMarkerOffset> {
  const result = new Map<string, VisualMarkerOffset>();
  if (!seats || seats.length === 0) return result;

  // Single seat: no collision possible
  if (seats.length === 1) {
    const s = seats[0];
    result.set(s.id, {
      visualX: s.x,
      visualY: s.y,
      hasCollision: false,
    });
    return result;
  }

  // Detect coordinate domain (0..1 normalized vs pixel space)
  const isNormalized = seats.every(
    (s) => Number.isFinite(s.x) && Number.isFinite(s.y) && Math.abs(s.x) <= 2 && Math.abs(s.y) <= 2
  );

  const defaultWidth = isNormalized ? 0.05 : 54;
  const defaultHeight = isNormalized ? 0.04 : 30;
  const minGap = options?.minGap ?? (isNormalized ? 0.005 : 4);
  const maxIterations = Math.max(1, Math.min(10, options?.maxIterations ?? 4));

  interface NodeItem {
    id: string;
    origX: number;
    origY: number;
    visualX: number;
    visualY: number;
    width: number;
    height: number;
    hasCollision: boolean;
  }

  const items: NodeItem[] = seats.map((s) => {
    const w = typeof s.width === 'number' && s.width > 0 ? s.width : (options?.markerWidth ?? defaultWidth);
    const h = typeof s.height === 'number' && s.height > 0 ? s.height : (options?.markerHeight ?? defaultHeight);
    return {
      id: s.id,
      origX: s.x,
      origY: s.y,
      visualX: s.x,
      visualY: s.y,
      width: w,
      height: h,
      hasCollision: false,
    };
  });

  // Iterative relaxation to separate overlapping bounding boxes
  for (let iter = 0; iter < maxIterations; iter++) {
    let hadCollisionInPass = false;

    for (let i = 0; i < items.length; i++) {
      const a = items[i];
      for (let j = i + 1; j < items.length; j++) {
        const b = items[j];

        // Axis-aligned bounding box collision test with minGap
        const overlapX = Math.min(a.visualX + a.width, b.visualX + b.width) - Math.max(a.visualX, b.visualX);
        const overlapY = Math.min(a.visualY + a.height, b.visualY + b.height) - Math.max(a.visualY, b.visualY);

        if (overlapX > -minGap && overlapY > -minGap) {
          a.hasCollision = true;
          b.hasCollision = true;
          hadCollisionInPass = true;

          const neededSepX = overlapX + minGap;
          const neededSepY = overlapY + minGap;

          // Push along the axis that minimizes displacement
          if (neededSepY < neededSepX) {
            const shift = neededSepY / 2;
            if (a.visualY <= b.visualY) {
              a.visualY -= shift;
              b.visualY += shift;
            } else {
              a.visualY += shift;
              b.visualY -= shift;
            }
          } else {
            const shift = neededSepX / 2;
            if (a.visualX <= b.visualX) {
              a.visualX -= shift;
              b.visualX += shift;
            } else {
              a.visualX += shift;
              b.visualX -= shift;
            }
          }
        }
      }
    }

    if (!hadCollisionInPass) {
      break;
    }
  }

  // Populate result map
  for (const item of items) {
    result.set(item.id, {
      visualX: Math.round(item.visualX * 10000) / 10000,
      visualY: Math.round(item.visualY * 10000) / 10000,
      hasCollision: item.hasCollision,
    });
  }

  return result;
}
