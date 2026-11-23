import { AnimatePresence } from 'framer-motion';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Konva from 'konva';
import { Stage, Layer, Rect, Text, Group } from 'react-konva';
import { apiRequest, broadcastWorkspaceDataChanged } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import { SeatManagementModal, SeatData } from '../components/SeatManagementModal';
import { AssignableEmployee, FloorPlanOperationalPanel } from '../components/FloorPlanOperationalPanel';
import { FloorSummaryBar } from '../components/FloorSummaryBar';
import { FloorPlanImageLayer } from '../components/FloorPlanImageLayer';
import { FloorPlanTooltip } from '../components/FloorPlanTooltip';
import { UnplacedWorkstationsDrawer } from '../components/UnplacedWorkstationsDrawer';
import { PageHeroHeader } from '../components/PageHeroHeader';
import {
  buildLayoutPayload,
  calculateCanonicalMarkerDragPosition,
  calculateNormalizedDropCoordinates,
  canManageFloorPlan,
  computeVisualMarkerOffsets,
  findSeatAtCanvasCoordinates,
  formatFloorSeatCount,
  getFloorPlanViewState,
  getWorkstationAriaLabel,
  getZoomDetailLevel,
  hasFloorPlanAsset,
  getPdfFloorPlanPage,
  isPdfFloorPlanAsset,
  hasSavedFloorPlanPosition,
  isFloorVisibleInFloorPlan,
  resolveFloorPlanSource,
  setPdfFloorPlanPage,
  sanitizeLayoutSaveError,
  shouldClearMapMarkerState,
  unplaceWorkstation,
  uniqueFloorOptionsById,
} from '../utils/floorPlanPresentation';
import {
  calculateFitViewport,
  calculatePinchViewport,
  calculateWheelViewport,
  shouldZoomFloorPlan,
} from '../utils/floorPlanViewport';
import shaktimanLogo from '../assets/shaktiman-logo.png';
import {
  Save,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Building,
  Factory,
  Layers,
  Upload,
  Edit2,
  Search,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Filter,
  X,
  Armchair,
  Undo2,
  Map as MapIcon,
} from 'lucide-react';

export interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  colorHex: string;
  floorId?: string | null;
  _count?: {
    seats?: number;
    employees?: number;
  };
}

interface UnitOption {
  id: string;
  name: string;
  code?: string;
}

interface BuildingOption {
  id: string;
  name: string;
  code: string;
  plantId?: string;
}

interface FloorOption {
  id: string;
  name: string;
  floorNumber: number;
  buildingId: string;
  imageUrl?: string | null;
  hasLayoutData?: boolean;
  canvasWidth?: number;
  canvasHeight?: number;
  _count?: {
    seats?: number;
  };
}

interface FloorDetail {
  id: string;
  name: string;
  floorNumber: number;
  canvasWidth?: number;
  canvasHeight?: number;
  gridWidth?: number;
  gridHeight?: number;
  imageUrl?: string | null;
  departments?: DepartmentItem[];
  seats: SeatData[];
  building?: {
    id: string;
    name: string;
    code: string;
    plant?: {
      id: string;
      name: string;
      code: string;
      unit?: {
        id: string;
        name: string;
        code: string;
      };
    };
  };
}

interface RemoteSearchResult {
  id: string;
  wsNo: string;
  label: string;
  officeArea?: string | null;
  status: string;
  unit?: { id: string; name: string; code: string } | null;
  plant?: { id: string; name: string; code: string } | null;
  building?: { id: string; name: string; code: string } | null;
  floor?: { id: string; name: string; floorNumber: number } | null;
  department?: { id: string; name: string; code: string; colorHex: string } | null;
  employee?: {
    id: string;
    employeeCode: string;
    fullName: string;
    designation?: string | null;
    email?: string | null;
  } | null;
}

interface RemoteEmployeeSearchResult {
  id: string;
  employeeCode: string;
  fullName: string;
  department?: { id: string; name: string; code?: string } | null;
  designation?: string | null;
  isActive?: boolean;
  seat?: {
    id: string;
    label: string;
    officeArea?: string | null;
    floorId?: string | null;
    floor?: {
      id: string;
      name: string;
      floorNumber: number;
      building?: { id: string; name: string; code: string } | null;
    } | null;
  } | null;
  unit?: { id: string; name: string; code: string } | null;
  building?: { id: string; name: string; code: string } | null;
  floor?: { id: string; name: string; floorNumber: number } | null;
  officeArea?: string | null;
  assignmentStatus: 'SEATED' | 'UNASSIGNED';
}

type LayoutNavigationAction = () => void | Promise<void>;

/**
 * Konva ignores `fillOpacity`, so alpha has to live inside the fill colour itself.
 */
const withAlpha = (hex: string, alpha: number): string => {
  const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!match) return hex;
  const r = parseInt(match[1], 16);
  const g = parseInt(match[2], 16);
  const b = parseInt(match[3], 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

/** Ultra-compact mini workstation marker dimensions (Requirement: width ~54px [48-60px], height ~30px [28-34px]) */
const MINI_MARKER_WIDTH = 54;
const MINI_MARKER_HEIGHT = 30;

export const FloorPlanPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { adminUser } = useAuth();
  const canManageFloorPlanAssets = canManageFloorPlan(adminUser?.role);

  // 1. Cascading hierarchy: Unit -> Building -> Floor -> Office -> Area
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [selectedUnitId, setSelectedUnitId] = useState<string>('');

  const [buildings, setBuildings] = useState<BuildingOption[]>([]);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');

  const [floors, setFloors] = useState<FloorOption[]>([]);
  const [selectedFloorId, setSelectedFloorId] = useState<string>('');

  // Office & Area filters on loaded floor
  const [selectedOfficeFilter, setSelectedOfficeFilter] = useState<string>('ALL');
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<string>('ALL');
  const [selectedDepartmentFilter, setSelectedDepartmentFilter] = useState<string>('ALL');
  const [selectedSeatStatusFilter, setSelectedSeatStatusFilter] = useState<'ALL' | 'OCCUPIED' | 'AVAILABLE'>('ALL');

  // Search input and state
  const [searchInput, setSearchInput] = useState<string>('');
  const debouncedSearch = useDebounce(searchInput, 250);
  const [remoteSearchResults, setRemoteSearchResults] = useState<RemoteSearchResult[]>([]);
  const [remoteEmployeeResults, setRemoteEmployeeResults] = useState<RemoteEmployeeSearchResult[]>([]);
  const [isSearchingRemote, setIsSearchingRemote] = useState(false);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);

  // Floor detail and interactive canvas seats
  const [floorDetail, setFloorDetail] = useState<FloorDetail | null>(null);
  const [seats, setSeats] = useState<SeatData[]>([]);
  const [originalSeats, setOriginalSeats] = useState<SeatData[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingLayoutNavigation, setPendingLayoutNavigation] = useState<LayoutNavigationAction | null>(null);
  const [showUnsavedLayoutDialog, setShowUnsavedLayoutDialog] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSavingRef = useRef(false);
  const [layoutSaveError, setLayoutSaveError] = useState<{
    message: string;
    isRetryable: boolean;
  } | null>(null);
  const [toast, setToast] = useState<{
    tone: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [floorLoading, setFloorLoading] = useState(false);
  const [floorError, setFloorError] = useState<string | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showUnplacedDrawer, setShowUnplacedDrawer] = useState(false);
  const floorLoadSequence = useRef(0);
  const hierarchyLoadSequence = useRef(0);

  // Auto-dismiss toast after 3.5 seconds
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // Replaces the current building's collection. It never merges different
  // hierarchy responses, and only removes repeat deliveries of one Floor ID.
  const replaceFloors = useCallback((nextFloors: FloorOption[]) => {
    setFloors(uniqueFloorOptionsById(nextFloors));
  }, []);

  const operationalFloors = useMemo(
    () => floors.filter((floor) => isFloorVisibleInFloorPlan({
      workstationCount: floor._count?.seats ?? 0,
      floorMapConfigured: hasFloorPlanAsset(floor.imageUrl),
      hasLayoutData: floor.hasLayoutData,
    })),
    [floors],
  );

  // Selected seat for read-only inspection drawer
  const [selectedSeat, setSelectedSeat] = useState<SeatData | null>(null);
  // Map-only selection is separate from the business seat selection shown in
  // the operational panel. It must never survive unplacement or filtering.
  const [selectedMapSeatId, setSelectedMapSeatId] = useState<string | null>(null);
  const [editingModalSeat, setEditingModalSeat] = useState<SeatData | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [unassignedEmployees, setUnassignedEmployees] = useState<AssignableEmployee[]>([]);
  const [unassignedLoading, setUnassignedLoading] = useState(false);
  const [unassignedRefreshVersion, setUnassignedRefreshVersion] = useState(0);
  const [assignmentCandidate, setAssignmentCandidate] = useState<{ seat: SeatData; employee: AssignableEmployee } | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [remoteSearchRefreshVersion, setRemoteSearchRefreshVersion] = useState(0);

  // Rich Hover Tooltip state (Requirements 16, 17, 18, 20)
  const [hoveredSeat, setHoveredSeat] = useState<SeatData | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);

  // Architectural plan display mode: 'blueprint' | 'clean'
  const [cadMode, setCadMode] = useState<'blueprint' | 'clean'>('blueprint');

  // Stage Pan & Zoom
  const [stageScale, setStageScale] = useState(1);
  const [stagePos, setStagePos] = useState({ x: 40, y: 30 });
  const [mapAssetError, setMapAssetError] = useState<string | null>(null);
  const [mapAssetRetry, setMapAssetRetry] = useState(0);
  const [pdfPageCount, setPdfPageCount] = useState(0);
  const [pdfPage, setPdfPage] = useState(1);
  const [stageDimensions, setStageDimensions] = useState({ width: 320, height: 500 });
  const stageRef = useRef<Konva.Stage | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const mapViewportRef = useRef<HTMLElement>(null);
  const pinchRef = useRef<{
    distance: number;
    center: { x: number; y: number };
    scale: number;
    position: { x: number; y: number };
  } | null>(null);

  // The map is constrained by its actual rendered host, rather than a guessed
  // window height. This accounts for headers, filters, responsive sidebars,
  // browser chrome, and split-pane changes.
  useEffect(() => {
    const host = mapViewportRef.current;
    if (!host) return;
    const updateDimensions = () => {
      const bounds = host.getBoundingClientRect();
      setStageDimensions({
        width: Math.max(1, Math.floor(bounds.width)),
        height: Math.max(360, Math.floor(bounds.height)),
      });
    };
    updateDimensions();
    const observer = new ResizeObserver(updateDimensions);
    observer.observe(host);
    return () => observer.disconnect();
  }, []);

  // Close search dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Load detailed floor seats and layout
  const loadFloorDetail = useCallback(async (id: string, targetSeatIdToFocus?: string) => {
    if (!id) return;
    // A draft is authoritative until the user explicitly saves or discards it.
    // Callers that need to change context must go through the centralized
    // navigation guard below.
    if (hasUnsavedChanges) return;
    const sequence = ++floorLoadSequence.current;
    setFloorLoading(true);
    setFloorError(null);
    try {
      const res = await apiRequest<FloorDetail>(`/floors/${id}`);
      if (res && sequence === floorLoadSequence.current) {
        const loadedSeats = (res.seats || []) as SeatData[];
        setFloorDetail({
          id: res.id,
          name: res.name,
          floorNumber: res.floorNumber,
          canvasWidth: res.canvasWidth || 1600,
          canvasHeight: res.canvasHeight || 1000,
          gridWidth: res.canvasWidth || 1600,
          gridHeight: res.canvasHeight || 1000,
          imageUrl: res.imageUrl,
          departments: res.departments || [],
          seats: loadedSeats,
          building: res.building,
        });
        setSeats(loadedSeats);
        setOriginalSeats(loadedSeats);
        setHasUnsavedChanges(false);
        setEditingModalSeat((previous) => {
          if (!previous) return previous;
          return loadedSeats.find((seat) => seat.id === previous.id) || null;
        });

        // If target seat requested (from search navigation), focus & select it
        if (targetSeatIdToFocus) {
          const target = loadedSeats.find((s) => s.id === targetSeatIdToFocus || s.label === targetSeatIdToFocus);
          if (target) {
            setSelectedSeat(target);
          }
        } else {
          // Keep selectedSeat in sync if open
          setSelectedSeat((prev) => {
            if (!prev) return null;
            const fresh = loadedSeats.find((s) => s.id === prev.id);
            return (fresh as SeatData) || null;
          });
        }
      }
    } catch (err: any) {
      if (sequence === floorLoadSequence.current) {
        setFloorError(err?.message || 'Unable to load this floor. Please try again.');
      }
      console.error('Failed to load floor detail', err);
    } finally {
      if (sequence === floorLoadSequence.current) setFloorLoading(false);
    }
  }, [hasUnsavedChanges]);

  const requestLayoutNavigation = useCallback((action: LayoutNavigationAction) => {
    if (!hasUnsavedChanges) {
      void action();
      return;
    }
    setPendingLayoutNavigation(() => action);
    setShowUnsavedLayoutDialog(true);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // Initialize hierarchy selectors with RBAC scoping and URL param support
  useEffect(() => {
    let isMounted = true;

    const initHierarchy = async () => {
      if (hasUnsavedChanges) return;
      try {
        const paramUnitId = searchParams.get('unitId');
        const paramBuildingId = searchParams.get('buildingId');
        const paramFloorId = searchParams.get('floorId');
        const paramSeatId = searchParams.get('seatId');

        // 1. Fetch Units (already scoped by backend for UNIT_ADMIN)
        const unitsRes = await apiRequest<UnitOption[]>('/units');
        if (!isMounted || !unitsRes || unitsRes.length === 0) return;
        setUnits(unitsRes);

        const chosenUnit = (paramUnitId && unitsRes.find((u) => u.id === paramUnitId)) || unitsRes[0];
        setSelectedUnitId(chosenUnit.id);

        // 2. Fetch Buildings directly in selected Unit (Plant not required)
        const buildingsRes = await apiRequest<BuildingOption[]>(`/buildings?unitId=${chosenUnit.id}`);
        if (!isMounted) return;
        const bldList = buildingsRes || [];
        setBuildings(bldList);

        if (bldList.length === 0) {
          setSelectedBuildingId('');
          setFloors([]);
          setSelectedFloorId('');
          return;
        }

        const chosenBld = (paramBuildingId && bldList.find((b) => b.id === paramBuildingId)) || bldList[0];
        setSelectedBuildingId(chosenBld.id);

        // 4. Fetch Floors in chosen Building
        const floorsRes = await apiRequest<FloorOption[]>(`/floors?buildingId=${chosenBld.id}`);
        if (!isMounted) return;
        const flrList = floorsRes || [];
        replaceFloors(flrList);

        if (flrList.length === 0) {
          setSelectedFloorId('');
          return;
        }

        const visibleFloors = flrList.filter((floor) => isFloorVisibleInFloorPlan({
          workstationCount: floor._count?.seats ?? 0,
          floorMapConfigured: hasFloorPlanAsset(floor.imageUrl),
          hasLayoutData: floor.hasLayoutData,
        }));
        const targetFloor = (paramFloorId && visibleFloors.find((f) => f.id === paramFloorId)) || visibleFloors[0];

        setSelectedFloorId(targetFloor?.id || '');
        if (paramSeatId && targetFloor) {
          loadFloorDetail(targetFloor.id, paramSeatId);
        }
      } catch (err) {
        console.error('Failed to initialize hierarchy selectors', err);
      }
    };

    initHierarchy();
    return () => {
      isMounted = false;
    };
  }, [searchParams, loadFloorDetail, replaceFloors, hasUnsavedChanges]);

  // Cascading Selector: Unit Change (Clears Building, Floor, Office, Area)
  const executeUnitChange = async (unitId: string) => {
    const sequence = ++hierarchyLoadSequence.current;
    setSelectedUnitId(unitId);
    setSelectedOfficeFilter('ALL');
    setSelectedAreaFilter('ALL');
    setSelectedSeat(null);
    setHoveredSeat(null);
    try {
      const blds = await apiRequest<BuildingOption[]>(`/buildings?unitId=${unitId}`).catch(() => []);
      if (sequence !== hierarchyLoadSequence.current) return;
      const bldList = blds || [];
      setBuildings(bldList);

      if (bldList.length > 0) {
        const bld = bldList[0];
        setSelectedBuildingId(bld.id);

        const flrs = await apiRequest<FloorOption[]>(`/floors?buildingId=${bld.id}`);
        const flrList = flrs || [];
        if (sequence !== hierarchyLoadSequence.current) return;
        replaceFloors(flrList);

        const visibleFloors = flrList.filter((floor) => isFloorVisibleInFloorPlan({
          workstationCount: floor._count?.seats ?? 0,
          floorMapConfigured: hasFloorPlanAsset(floor.imageUrl),
          hasLayoutData: floor.hasLayoutData,
        }));
        if (visibleFloors.length > 0) {
          const targetFloor = visibleFloors[0];
          setSelectedFloorId(targetFloor.id);
          setSearchParams({ unitId, buildingId: bld.id, floorId: targetFloor.id });
        } else {
          setSelectedFloorId('');
          setFloorDetail(null);
          setSeats([]);
        }
      } else {
        setSelectedBuildingId('');
        setFloors([]);
        setSelectedFloorId('');
        setFloorDetail(null);
        setSeats([]);
      }
    } catch (err) {
      console.error('Failed cascading update for unit', err);
    }
  };

  const handleUnitChange = (unitId: string) => {
    requestLayoutNavigation(() => executeUnitChange(unitId));
  };

  // Cascading Selector: Building Change (Clears Floor, Office, Area)
  const executeBuildingChange = async (buildingId: string) => {
    const sequence = ++hierarchyLoadSequence.current;
    setSelectedBuildingId(buildingId);
    setSelectedOfficeFilter('ALL');
    setSelectedAreaFilter('ALL');
    setSelectedSeat(null);
    setHoveredSeat(null);
    try {
      const flrs = await apiRequest<FloorOption[]>(`/floors?buildingId=${buildingId}`);
      if (sequence !== hierarchyLoadSequence.current) return;
      const flrList = flrs || [];
      replaceFloors(flrList);

      const visibleFloors = flrList.filter((floor) => isFloorVisibleInFloorPlan({
        workstationCount: floor._count?.seats ?? 0,
        floorMapConfigured: hasFloorPlanAsset(floor.imageUrl),
        hasLayoutData: floor.hasLayoutData,
      }));
      if (visibleFloors.length > 0) {
        const targetFloor = visibleFloors[0];
        setSelectedFloorId(targetFloor.id);
        setSearchParams({ unitId: selectedUnitId, buildingId, floorId: targetFloor.id });
      } else {
        setSelectedFloorId('');
        setFloorDetail(null);
        setSeats([]);
      }
    } catch (err) {
      console.error('Failed cascading update for building', err);
    }
  };

  const handleBuildingChange = (buildingId: string) => {
    requestLayoutNavigation(() => executeBuildingChange(buildingId));
  };

  // Floor Selection (Clears Office, Area)
  const executeFloorSelect = (floorId: string) => {
    setSelectedFloorId(floorId);
    setSelectedOfficeFilter('ALL');
    setSelectedAreaFilter('ALL');
    setSelectedSeat(null);
    setHoveredSeat(null);
    setSearchParams({
      unitId: selectedUnitId,
      buildingId: selectedBuildingId,
      floorId,
    });
  };

  const handleFloorSelect = (floorId: string) => {
    requestLayoutNavigation(() => executeFloorSelect(floorId));
  };

  // Load floor detail whenever selectedFloorId changes
  useEffect(() => {
    if (selectedFloorId) {
      loadFloorDetail(selectedFloorId);
    }
  }, [selectedFloorId, loadFloorDetail]);

  // Never retain an invisible zero-seat/no-map Floor as the active Floor Plan
  // context after a hierarchy refresh.
  useEffect(() => {
    if (!selectedBuildingId || floorLoading || floors.length === 0 || hasUnsavedChanges) return;
    if (!selectedFloorId || operationalFloors.some((floor) => floor.id === selectedFloorId)) return;

    const nextFloor = operationalFloors[0];
    setSelectedOfficeFilter('ALL');
    setSelectedAreaFilter('ALL');
    setSelectedSeat(null);
    setHoveredSeat(null);
    setSelectedMapSeatId(null);
    setSelectedFloorId(nextFloor?.id || '');
    if (nextFloor) {
      setSearchParams({ unitId: selectedUnitId, buildingId: selectedBuildingId, floorId: nextFloor.id });
    } else {
      setFloorDetail(null);
      setSeats([]);
      setOriginalSeats([]);
    }
  }, [
    floors.length,
    floorLoading,
    hasUnsavedChanges,
    operationalFloors,
    selectedBuildingId,
    selectedFloorId,
    selectedUnitId,
    setSearchParams,
  ]);

  const debouncedEmployeeSearch = useDebounce(employeeSearch, 250);
  useEffect(() => {
    if (!selectedUnitId) return;
    let active = true;
    setUnassignedLoading(true);
    const query = new URLSearchParams({
      assigned: 'false',
      isActive: 'true',
      seatEligible: 'true',
      unitId: selectedUnitId,
      limit: '100',
    });
    if (debouncedEmployeeSearch.trim()) query.set('search', debouncedEmployeeSearch.trim());
    apiRequest<{ employees: AssignableEmployee[] }>(`/employees?${query.toString()}`)
      .then((result) => { if (active) setUnassignedEmployees(result.employees || []); })
      .catch(() => { if (active) setUnassignedEmployees([]); })
      .finally(() => { if (active) setUnassignedLoading(false); });
    return () => { active = false; };
  }, [debouncedEmployeeSearch, selectedUnitId, unassignedRefreshVersion]);

  // Unified remote search: workstations keep their existing endpoint while
  // employees use the same authoritative ID/name/RBAC semantics as /employees.
  useEffect(() => {
    if (!debouncedSearch.trim() || debouncedSearch.trim().length < 2) {
      setRemoteSearchResults([]);
      setRemoteEmployeeResults([]);
      setIsSearchingRemote(false);
      return;
    }

    let isMounted = true;
    const controller = new AbortController();
    setIsSearchingRemote(true);
    const searchTerm = debouncedSearch.trim();
    const employeeQuery = new URLSearchParams({
      search: searchTerm,
      page: '1',
      pageSize: '20',
      sortBy: 'employeeName',
      sortOrder: 'asc',
    });
    // UNIT_ADMIN scope is enforced by the backend. Supplying its assigned Unit
    // also keeps the request explicit without constraining global admins.
    if (adminUser?.role === 'UNIT_ADMIN' && adminUser.assignedUnitId) {
      employeeQuery.set('unitId', adminUser.assignedUnitId);
    }

    Promise.all([
      apiRequest<{ data: any[] }>(`/workstations?search=${encodeURIComponent(searchTerm)}&limit=20`, { signal: controller.signal }),
      apiRequest<{ employees: any[] }>(`/employees?${employeeQuery.toString()}`, { signal: controller.signal }),
    ])
      .then(([workstationResponse, employeeResponse]) => {
        if (!isMounted) return;
        const mapped: RemoteSearchResult[] = (workstationResponse?.data || []).map((item: any) => ({
          id: item.id,
          wsNo: item.wsNo || item.label,
          label: item.wsNo || item.label,
          officeArea: item.officeArea,
          status: item.status,
          unit: item.unit,
          plant: item.plant,
          building: item.building,
          floor: item.floor,
          department: item.department,
          employee: item.employee,
        }));
        const employeeResults: RemoteEmployeeSearchResult[] = (employeeResponse?.employees || []).map((item: any) => {
          const seat = item.seat || null;
          const seatFloor = seat?.floor || null;
          return {
            id: item.id,
            employeeCode: item.employeeCode,
            fullName: item.fullName,
            department: item.department || null,
            designation: item.designation || null,
            isActive: item.isActive,
            seat: seat
              ? {
                  id: seat.id,
                  label: seat.label,
                  officeArea: seat.officeArea || item.officeArea || null,
                  floorId: seat.floorId || seatFloor?.id || item.floor?.id || null,
                  floor: seatFloor,
                }
              : null,
            unit: item.unit || null,
            building: item.building || seatFloor?.building || null,
            floor: item.floor || (seatFloor ? {
              id: seatFloor.id,
              name: seatFloor.name,
              floorNumber: seatFloor.floorNumber,
            } : null),
            officeArea: item.officeArea || seat?.officeArea || null,
            assignmentStatus: seat ? 'SEATED' : 'UNASSIGNED',
          };
        });
        setRemoteSearchResults(mapped);
        setRemoteEmployeeResults(employeeResults);
        setShowSearchDropdown(true);
      })
      .catch((err) => {
        if (err?.name === 'AbortError') return;
        console.error('Remote search error:', err);
        if (isMounted) {
          setRemoteSearchResults([]);
          setRemoteEmployeeResults([]);
          setToast({ tone: 'error', message: 'Search is temporarily unavailable. Please try again.' });
        }
      })
      .finally(() => {
        if (isMounted) setIsSearchingRemote(false);
      });

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [adminUser?.assignedUnitId, adminUser?.role, debouncedSearch, remoteSearchRefreshVersion]);

  // Derived unique Offices on currently loaded floor
  const floorOffices = useMemo(() => {
    const set = new Set<string>();
    seats.forEach((s) => {
      const office = s.officeArea?.trim();
      if (office) set.add(office);
    });
    return Array.from(set).sort();
  }, [seats]);

  // Derived unique Areas (zones or sections) within the selected Office
  const floorAreas = useMemo(() => {
    const set = new Set<string>();
    seats.forEach((s) => {
      if (selectedOfficeFilter === 'ALL' || s.officeArea?.trim() === selectedOfficeFilter) {
        const area = s.zone?.trim() || s.officeArea?.trim();
        if (area) set.add(area);
      }
    });
    return Array.from(set).sort();
  }, [seats, selectedOfficeFilter]);

  // A saved physical position is required independently of seat assignment.
  const unplacedSeats = useMemo(() => {
    return seats.filter((s) => !hasSavedFloorPlanPosition(s.x, s.y, s.placementSource));
  }, [seats]);

  // Never infer a physical placement from a seat's array position or status.
  const placedSeats = useMemo(() => {
    return seats.filter((s) => hasSavedFloorPlanPosition(s.x, s.y, s.placementSource));
  }, [seats]);

  // Local matching seat IDs on currently loaded floor
  const localMatchSeatIds = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return new Set<string>();
    const matched = new Set<string>();
    seats.forEach((s) => {
      const labelMatch = s.label.toLowerCase().includes(q);
      const empNameMatch = s.employee?.fullName?.toLowerCase().includes(q);
      const empCodeMatch = (s.employee as any)?.employeeCode?.toLowerCase().includes(q);
      const pcMatch = (s as any).pcNumber?.toLowerCase().includes(q);
      const deptMatch = s.department?.name?.toLowerCase().includes(q);
      const areaMatch = s.officeArea?.toLowerCase().includes(q);
      if (labelMatch || empNameMatch || empCodeMatch || pcMatch || deptMatch || areaMatch) {
        matched.add(s.id);
      }
    });
    return matched;
  }, [seats, searchInput]);

  // Group seats by area for visual architectural boundaries (Requirement 15)
  const areaBoundaries = useMemo(() => {
    const map = new Map<string, { minX: number; minY: number; maxX: number; maxY: number; count: number }>();
    for (const seat of placedSeats) {
      const area = seat.officeArea?.trim() || 'General Office';
      const w = MINI_MARKER_WIDTH;
      const h = MINI_MARKER_HEIGHT;
      const existing = map.get(area);
      if (!existing) {
        map.set(area, {
          minX: seat.x,
          minY: seat.y,
          maxX: seat.x + w,
          maxY: seat.y + h,
          count: 1,
        });
      } else {
        existing.minX = Math.min(existing.minX, seat.x);
        existing.minY = Math.min(existing.minY, seat.y);
        existing.maxX = Math.max(existing.maxX, seat.x + w);
        existing.maxY = Math.max(existing.maxY, seat.y + h);
        existing.count++;
      }
    }
    return Array.from(map.entries()).map(([area, b]) => ({
      area,
      x: b.minX - 18,
      y: b.minY - 26,
      width: b.maxX - b.minX + 36,
      height: b.maxY - b.minY + 38,
      count: b.count,
    }));
  }, [placedSeats]);

  // Derived Floor Capacity KPIs (live from MongoDB)
  const totalWorkstations = seats.length;
  const occupiedCount = seats.filter((s) => Boolean(s.employeeId && s.employee)).length;
  const availableCount = totalWorkstations - occupiedCount;
  const occupancyPercentage = totalWorkstations > 0 ? (occupiedCount / totalWorkstations) * 100 : 0;
  const employeesOnFloor = occupiedCount;

  // Filtered seats based on selected Office & Area filters
  const displayedSeats = useMemo(() => {
    return placedSeats.filter((s) => {
      if (selectedOfficeFilter !== 'ALL' && s.officeArea?.trim() !== selectedOfficeFilter) {
        return false;
      }
      if (selectedAreaFilter !== 'ALL') {
        const area = s.zone?.trim() || s.officeArea?.trim();
        if (area !== selectedAreaFilter) return false;
      }
      if (selectedDepartmentFilter !== 'ALL' && s.departmentId !== selectedDepartmentFilter && s.employee?.departmentId !== selectedDepartmentFilter) {
        return false;
      }
      const occupied = Boolean(s.employeeId && s.employee);
      if (selectedSeatStatusFilter === 'OCCUPIED' && !occupied) return false;
      if (selectedSeatStatusFilter === 'AVAILABLE' && occupied) return false;
      return true;
    });
  }, [placedSeats, selectedOfficeFilter, selectedAreaFilter, selectedDepartmentFilter, selectedSeatStatusFilter]);

  // Memoized visual marker collision presentation offsets (Requirement: Visual Collision Presentation)
  const visualOffsets = useMemo(() => {
    return computeVisualMarkerOffsets(displayedSeats, {
      markerWidth: MINI_MARKER_WIDTH,
      markerHeight: MINI_MARKER_HEIGHT,
      minGap: 4,
      stageScale,
    });
  }, [displayedSeats, stageScale]);

  const zoomDetailLevel = getZoomDetailLevel(stageScale);

  const placedSeatIds = useMemo(() => new Set(placedSeats.map((seat) => seat.id)), [placedSeats]);
  const displayedSeatIds = useMemo(() => new Set(displayedSeats.map((seat) => seat.id)), [displayedSeats]);
  const selectedMapSeat = useMemo(
    () => placedSeats.find((seat) => seat.id === selectedMapSeatId) || null,
    [placedSeats, selectedMapSeatId]
  );

  // Map marker state is defensive: async refreshes, filters, hierarchy changes,
  // and unplacement can remove a marker without going through a click handler.
  // Business selection remains available in the left panel, but map-only
  // selection/hover state is cleared as soon as its marker is no longer valid.
  useEffect(() => {
    if (selectedMapSeatId && shouldClearMapMarkerState(selectedMapSeatId, placedSeatIds, displayedSeatIds)) {
      setSelectedMapSeatId(null);
    }

    if (hoveredSeat && shouldClearMapMarkerState(hoveredSeat.id, placedSeatIds, displayedSeatIds)) {
      setHoveredSeat(null);
      setTooltipPosition(null);
    } else if (hoveredSeat) {
      const freshHoveredSeat = seats.find((seat) => seat.id === hoveredSeat.id);
      if (freshHoveredSeat && freshHoveredSeat !== hoveredSeat) {
        setHoveredSeat(freshHoveredSeat);
      }
    }

    if (selectedSeat) {
      const freshSelectedSeat = seats.find((seat) => seat.id === selectedSeat.id);
      if (freshSelectedSeat && freshSelectedSeat !== selectedSeat) {
        setSelectedSeat(freshSelectedSeat);
      }
    }

    if (editingModalSeat && !seats.some((seat) => seat.id === editingModalSeat.id)) {
      setEditingModalSeat(null);
    }
  }, [displayedSeatIds, editingModalSeat, hoveredSeat, placedSeatIds, seats, selectedMapSeatId, selectedSeat]);

  const canvasWidth = floorDetail?.canvasWidth || 1600;
  const canvasHeight = floorDetail?.canvasHeight || 1000;
  const isBlueprint = cadMode === 'blueprint';
  const floorPlanSource = floorDetail ? resolveFloorPlanSource(floorDetail.id, floorDetail.imageUrl) : null;
  const floorPlanViewState = getFloorPlanViewState({
    buildingId: selectedBuildingId,
    floorId: selectedFloorId,
    imageUrl: floorDetail?.imageUrl,
  });
  const hasFloorMap = floorPlanViewState === 'CANVAS' && Boolean(floorPlanSource);

  useEffect(() => {
    if (!hasFloorMap) {
      setIsEditingMode(false);
      setShowUnplacedDrawer(false);
      setSelectedMapSeatId(null);
      setHoveredSeat(null);
      setTooltipPosition(null);
    }
  }, [hasFloorMap]);

  useEffect(() => {
    setMapAssetError(null);
    setPdfPageCount(0);
    setPdfPage(1);
    setSelectedMapSeatId(null);
    setHoveredSeat(null);
    setTooltipPosition(null);
  }, [selectedFloorId]);

  useEffect(() => {
    if (floorDetail?.imageUrl && isPdfFloorPlanAsset(floorDetail.imageUrl)) {
      setPdfPage(getPdfFloorPlanPage(floorDetail.imageUrl));
    } else {
      setPdfPageCount(0);
      setPdfPage(1);
    }
  }, [floorDetail?.imageUrl]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (isSavingRef.current) return;
      setSelectedMapSeatId(null);
      setHoveredSeat(null);
      setTooltipPosition(null);
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, []);

  // Keyboard shortcut: Ctrl+S / Cmd+S to trigger guarded layout save in edit mode
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        if (isEditingMode && hasUnsavedChanges && !isSavingRef.current) {
          void handleSaveLayout();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditingMode, hasUnsavedChanges]);

  // Fit the complete floor-map image inside the viewport without changing saved coordinates.
  const fitPlanToView = useCallback(
    () => {
      // The stage, markers, hit testing, and stored positions all use the
      // floor's canonical canvas dimensions. Natural PDF/raster dimensions
      // are rendering metadata only and must not change fit math.
      const targetW = floorDetail?.canvasWidth || 1600;
      const targetH = floorDetail?.canvasHeight || 1000;
      const viewport = calculateFitViewport({
        mapWidth: targetW,
        mapHeight: targetH,
        viewport: stageDimensions,
      });
      setStageScale(viewport.scale);
      setStagePos(viewport.position);
    },
    [floorDetail?.canvasHeight, floorDetail?.canvasWidth, stageDimensions]
  );

  // Auto-fit whenever floor changes and seats finish loading
  useEffect(() => {
    if (!floorDetail) return;
    fitPlanToView();
  }, [floorDetail?.id, fitPlanToView]);

  // Focus directly on a specific seat (smoothly centers and scales)
  const focusSeat = useCallback(
    (seat: SeatData) => {
      const zoom = 1.35;
      setStageScale(zoom);
      setStagePos({
        x: stageDimensions.width / 2 - (seat.x + MINI_MARKER_WIDTH / 2) * zoom,
        y: stageDimensions.height / 2 - (seat.y + MINI_MARKER_HEIGHT / 2) * zoom,
      });
      setSelectedSeat(seat);
      setSelectedMapSeatId(hasSavedFloorPlanPosition(seat.x, seat.y, seat.placementSource) ? seat.id : null);
    },
    [stageDimensions.width, stageDimensions.height]
  );

  // Reset View action (Requirement 19 & 25)
  const handleResetView = () => {
    fitPlanToView();
    setHoveredSeat(null);
    setTooltipPosition(null);
  };

  // Navigate to another floor from search result (Requirement 11 & 28)
  const executeSearchNavigation = async (result: RemoteSearchResult) => {
    setShowSearchDropdown(false);
    const targetUnitId = result.unit?.id;
    const targetBuildingId = result.building?.id;
    const targetFloorId = result.floor?.id;

    if (!targetFloorId) return;

    // Check if on current floor
    if (targetFloorId === selectedFloorId) {
      const match = seats.find((s) => s.id === result.id || s.label.toLowerCase() === result.wsNo.toLowerCase());
      if (match) {
        focusSeat(match);
      }
      return;
    }

    // Switch hierarchy
    if (targetUnitId && targetUnitId !== selectedUnitId) {
      setSelectedUnitId(targetUnitId);
    }
    if (targetBuildingId && targetBuildingId !== selectedBuildingId) {
      setSelectedBuildingId(targetBuildingId);
    }
    setSelectedFloorId(targetFloorId);
    setSearchParams({
      unitId: targetUnitId || selectedUnitId,
      buildingId: targetBuildingId || selectedBuildingId,
      floorId: targetFloorId,
      seatId: result.id,
    });
    await loadFloorDetail(targetFloorId, result.id);
  };

  const handleNavigateToSearchResult = (result: RemoteSearchResult) => {
    if (result.floor?.id === selectedFloorId) {
      void executeSearchNavigation(result);
      return;
    }
    requestLayoutNavigation(() => executeSearchNavigation(result));
  };

  // Mouse wheel zoom
  const handleWheel = (e: Konva.KonvaEventObject<WheelEvent>) => {
    if (!shouldZoomFloorPlan(e.evt)) return;
    e.evt.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const viewport = calculateWheelViewport({
      oldScale,
      deltaY: e.evt.deltaY,
      pointer,
      position: { x: stage.x(), y: stage.y() },
    });
    setStageScale(viewport.scale);
    setStagePos(viewport.position);
  };

  const getTouchPoint = (touch: Touch, bounds: DOMRect) => ({
    x: touch.clientX - bounds.left,
    y: touch.clientY - bounds.top,
  });

  const handleStageTouchStart = (event: Konva.KonvaEventObject<TouchEvent>) => {
    if (isEditingMode || event.evt.touches.length !== 2) return;
    const stage = stageRef.current;
    if (!stage) return;
    const bounds = stage.container().getBoundingClientRect();
    const [first, second] = [event.evt.touches[0], event.evt.touches[1]];
    const a = getTouchPoint(first, bounds);
    const b = getTouchPoint(second, bounds);
    pinchRef.current = {
      distance: Math.hypot(b.x - a.x, b.y - a.y),
      center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      scale: stage.scaleX(),
      position: { x: stage.x(), y: stage.y() },
    };
  };

  const handleStageTouchMove = (event: Konva.KonvaEventObject<TouchEvent>) => {
    if (isEditingMode || event.evt.touches.length !== 2) return;
    const initial = pinchRef.current;
    const stage = stageRef.current;
    if (!initial || !stage) return;
    event.evt.preventDefault();
    stage.stopDrag();
    const bounds = stage.container().getBoundingClientRect();
    const [first, second] = [event.evt.touches[0], event.evt.touches[1]];
    const a = getTouchPoint(first, bounds);
    const b = getTouchPoint(second, bounds);
    const viewport = calculatePinchViewport({
      startScale: initial.scale,
      startPosition: initial.position,
      startDistance: initial.distance,
      currentDistance: Math.hypot(b.x - a.x, b.y - a.y),
      startCenter: initial.center,
      currentCenter: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
    });
    setStageScale(viewport.scale);
    setStagePos(viewport.position);
  };

  const handleStageTouchEnd = () => {
    pinchRef.current = null;
  };

  // Unplace a workstation marker back to the unplaced list (clears placementSource without altering coordinates or employee assignment)
  const handleUnplaceSeat = useCallback((seatOrId: string | SeatData) => {
    const targetId = typeof seatOrId === 'string' ? seatOrId : seatOrId.id;
    setSeats((prev) =>
      prev.map((s) => {
        if (s.id === targetId || s.label.toLowerCase() === targetId.toLowerCase()) {
          // Explicitly clear placementSource. Preserves employeeId, employee, and coordinates.
          return unplaceWorkstation(s);
        }
        return s;
      })
    );
    setHasUnsavedChanges(true);
    setSelectedMapSeatId(null);
    setHoveredSeat((prev) => (prev?.id === targetId ? null : prev));
    setTooltipPosition(null);
    setEditingModalSeat((prev) => (prev?.id === targetId ? null : prev));
    // Keep the business selection visible in the operational panel, but mark
    // the selected workstation as visually unplaced.
    setSelectedSeat((prev) => (prev?.id === targetId ? unplaceWorkstation(prev) : prev));
  }, []);

  // Drag and drop marker movement in Edit Layout Mode (Requirement 12, 21, 23, 24)
  const handleSeatDragEnd = (
    seat: SeatData,
    presentationPosition: { x: number; y: number },
    e: Konva.KonvaEventObject<DragEvent>,
  ) => {
    if (!hasFloorMap) return;
    // Unplacing is deliberately available only through its explicit action.
    // A drag, including one ending over a sidebar, is always a coordinate move.
    const canonical = calculateCanonicalMarkerDragPosition({
      persistent: { x: seat.x, y: seat.y },
      presentation: presentationPosition,
      dragged: { x: e.target.x(), y: e.target.y() },
      canvasWidth,
      canvasHeight,
      markerWidth: MINI_MARKER_WIDTH,
      markerHeight: MINI_MARKER_HEIGHT,
    });
    const clampedX = canonical.x;
    const clampedY = canonical.y;
    e.target.position({ x: clampedX, y: clampedY });

    setSeats((prev) =>
      prev.map((s) => (s.id === seat.id ? { ...s, x: clampedX, y: clampedY, placementSource: 'MANUAL' } : s))
    );
    setHasUnsavedChanges(true);
  };

  // Place an unplaced workstation onto the plan center (Requirement 33 & 34)
  const handlePlaceUnplacedSeat = (seat: SeatData) => {
    if (!hasFloorMap) return;
    const centerX = Math.round((floorDetail?.canvasWidth || 1600) / 2);
    const centerY = Math.round((floorDetail?.canvasHeight || 1000) / 2);

    setSeats((prev) =>
      prev.map((s) => (s.id === seat.id ? { ...s, x: centerX, y: centerY, placementSource: 'MANUAL' } : s))
    );
    setHasUnsavedChanges(true);
    focusSeat({ ...seat, x: centerX, y: centerY, placementSource: 'MANUAL' });
  };

  // Persist the current draft without reloading it. Reloading here would race
  // with the guarded navigation flow and could replace the draft before the
  // caller has completed its requested transition.
  const persistLayout = async (): Promise<boolean> => {
    if (!selectedFloorId) return false;
    if (isSavingRef.current) return false;
    isSavingRef.current = true;
    setIsSaving(true);
    try {
      const payload = buildLayoutPayload(seats);

      await apiRequest(`/floors/${selectedFloorId}/layout`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });

      setHasUnsavedChanges(false);
      setOriginalSeats(seats);
      setLayoutSaveError(null);
      setToast({
        tone: 'success',
        message: 'Floor plan layout saved successfully.',
      });
      return true;
    } catch (err: unknown) {
      console.error('Failed to save floor plan layout:', err);
      // CRITICAL: Preserve local draft on save failure!
      // Do NOT reload floor or clear draft coordinates on save failure.
      // Keep the user in edit mode with draft intact and [Retry Save] available.
      const friendlyMessage = sanitizeLayoutSaveError((err as Error)?.message);
      setLayoutSaveError({
        message: friendlyMessage,
        isRetryable: true,
      });
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  };

  // Save Layout action
  const handleSaveLayout = async () => {
    if (isSavingRef.current) return;
    await persistLayout();
  };

  const handleDiscardLayoutAndContinue = () => {
    if (isSavingRef.current) return;
    const action = pendingLayoutNavigation;
    setSeats(originalSeats);
    setHasUnsavedChanges(false);
    setIsEditingMode(false);
    setPendingLayoutNavigation(null);
    setShowUnsavedLayoutDialog(false);
    if (action) void action();
  };

  const handleSaveLayoutAndContinue = async () => {
    if (isSavingRef.current) return;
    const saved = await persistLayout();
    if (saved) {
      const action = pendingLayoutNavigation;
      setPendingLayoutNavigation(null);
      setShowUnsavedLayoutDialog(false);
      setIsEditingMode(false);
      if (action) await action();
      return;
    }
    // On failure: Retain local draft on current floor without navigating away!
    setShowUnsavedLayoutDialog(false);
  };

  const handleCancelLayoutNavigation = () => {
    if (isSavingRef.current) return;
    setPendingLayoutNavigation(null);
    setShowUnsavedLayoutDialog(false);
  };

  const handleRetrySave = async () => {
    setLayoutSaveError(null);
    if (pendingLayoutNavigation) {
      await handleSaveLayoutAndContinue();
    } else {
      await handleSaveLayout();
    }
  };

  const handleCancelSaveError = () => {
    setLayoutSaveError(null);
    setPendingLayoutNavigation(null);
  };

  // Cancel Layout edits (restores persisted positions)
  const handleCancelLayoutEdits = () => {
    setSeats(originalSeats);
    setHasUnsavedChanges(false);
    setIsEditingMode(false);
  };

  // Add Workstation in Edit Mode
  const handleAddSeat = async () => {
    if (!selectedFloorId) return;
    const maxWsNumber = seats.reduce((max, s) => {
      const match = /^WS-(\d+)$/i.exec(s.label);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0);
    const label = `WS-${String(maxWsNumber + 1).padStart(2, '0')}`;

    try {
      const created = await apiRequest<SeatData>('/seats', {
        method: 'POST',
        body: JSON.stringify({
          floorId: selectedFloorId,
          label,
          x: 0,
          y: 0,
          width: 64,
          height: 48,
          type: 'STANDARD_DESK',
          status: 'AVAILABLE',
        }),
      });
      loadFloorDetail(selectedFloorId);
      setSelectedSeat(created);
    } catch (err: any) {
      setToast({ tone: 'error', message: err.message || 'Failed to create workstation' });
    }
  };

  // Upload Floor Plan background asset (Requirement 7 & 8)
  const executeUploadFloorPlanImage = async (file: File) => {
    if (!selectedFloorId || !canManageFloorPlanAssets) return;
    const isPdf = file.type === 'application/pdf' || file.type === 'application/x-pdf' || /\.pdf$/i.test(file.name);
    const validMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
    if (!isPdf && !validMimes.includes(file.type)) {
      setToast({
        tone: 'error',
        message: 'Only PNG, JPG, WebP, PDF, and safe SVG floor plans are supported.',
      });
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      setToast({ tone: 'error', message: 'Floor plan files must be 25 MB or smaller.' });
      return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setIsUploadingImage(true);
    try {
      if (floorDetail?.imageUrl && !window.confirm('Replace the floor-map background? Existing workstation positions and seat assignments will be preserved, but positions may need review.')) {
        return;
      }
      const uploaded = await apiRequest<{ imageUrl: string; pageCount?: number }>(`/floors/${selectedFloorId}/image`, {
        method: 'POST',
        body: formData,
      });
      setFloorDetail((current) => current ? { ...current, imageUrl: uploaded.imageUrl } : current);
      setPdfPageCount(uploaded.pageCount || 0);
      setPdfPage(1);
      setToast({ tone: 'success', message: isPdf ? 'PDF floor plan uploaded and rendered.' : 'Floor plan image uploaded successfully.' });
    } catch (err: any) {
      setToast({ tone: 'error', message: err.message || 'Failed to upload floor plan image' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handlePdfPageChange = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextPage = Math.max(1, Number(event.target.value));
    if (!floorDetail?.imageUrl || !selectedFloorId || !isPdfFloorPlanAsset(floorDetail.imageUrl)) return;
    const imageUrl = setPdfFloorPlanPage(floorDetail.imageUrl, nextPage);
    setPdfPage(nextPage);
    try {
      await apiRequest(`/floors/${selectedFloorId}`, {
        method: 'PUT',
        body: JSON.stringify({ imageUrl }),
      });
      setFloorDetail((current) => current ? { ...current, imageUrl } : current);
    } catch (err: any) {
      setToast({ tone: 'error', message: err.message || 'Could not save the selected PDF page.' });
    }
  };

  const handleUploadFloorPlanImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedFloorId || !canManageFloorPlanAssets) return;
    if (hasUnsavedChanges) {
      requestLayoutNavigation(() => executeUploadFloorPlanImage(file));
      return;
    }
    void executeUploadFloorPlanImage(file);
  };

  const handleAssignmentRequested = (seat: SeatData, employee: AssignableEmployee) => {
    if (
      isEditingMode ||
      Boolean(seat.employeeId) ||
      seat.status !== 'AVAILABLE' ||
      !hasSavedFloorPlanPosition(seat.x, seat.y, seat.placementSource)
    ) return;
    setAssignmentCandidate({ seat, employee });
  };

  const asAssignableEmployee = (employee: RemoteEmployeeSearchResult): AssignableEmployee => ({
    id: employee.id,
    employeeCode: employee.employeeCode,
    fullName: employee.fullName,
    department: employee.department || null,
    unit: employee.unit || null,
    designation: employee.designation || null,
  });

  const executeEmployeeSearchNavigation = async (employee: RemoteEmployeeSearchResult) => {
    setShowSearchDropdown(false);
    const targetFloorId = employee.floor?.id || employee.seat?.floor?.id;
    const targetSeatId = employee.seat?.id;
    if (!targetFloorId) {
      setToast({ tone: 'info', message: `${employee.fullName} is seated, but the current assignment has no floor location.` });
      return;
    }

    if (targetFloorId === selectedFloorId) {
      const match = targetSeatId ? seats.find((seat) => seat.id === targetSeatId) : null;
      if (match && hasSavedFloorPlanPosition(match.x, match.y, match.placementSource)) {
        focusSeat(match);
      } else if (match) {
        setSelectedSeat(match);
        setSelectedMapSeatId(null);
        setToast({ tone: 'info', message: `${employee.fullName} is seated at ${match.label}, but that workstation is currently unplaced on the floor map.` });
      } else {
        setToast({ tone: 'info', message: `${employee.fullName} is seated on this floor, but the workstation is not present in the loaded map.` });
      }
      return;
    }

    setSelectedUnitId(employee.unit?.id || selectedUnitId);
    setSelectedBuildingId(employee.building?.id || selectedBuildingId);
    setSelectedFloorId(targetFloorId);
    setSearchParams({
      unitId: employee.unit?.id || selectedUnitId,
      buildingId: employee.building?.id || selectedBuildingId,
      floorId: targetFloorId,
      ...(targetSeatId ? { seatId: targetSeatId } : {}),
    });
    await loadFloorDetail(targetFloorId, targetSeatId);
  };

  const handleEmployeeSearchResult = (employee: RemoteEmployeeSearchResult) => {
    if (employee.assignmentStatus === 'UNASSIGNED') {
      setEmployeeSearch(employee.employeeCode);
      setShowSearchDropdown(false);
      setToast({ tone: 'info', message: `${employee.fullName} is unassigned. Select a placed, available workstation to assign them.` });
      return;
    }

    if (employee.floor?.id === selectedFloorId || employee.seat?.floor?.id === selectedFloorId) {
      void executeEmployeeSearchNavigation(employee);
      return;
    }
    requestLayoutNavigation(() => executeEmployeeSearchNavigation(employee));
  };

  const confirmAssignment = async () => {
    if (!assignmentCandidate || isAssigning) return;
    setIsAssigning(true);
    try {
      const updated = await apiRequest<SeatData>(`/seats/${assignmentCandidate.seat.id}/assign`, {
        method: 'POST',
        body: JSON.stringify({ employeeId: assignmentCandidate.employee.id }),
      });
      setAssignmentCandidate(null);
      setEmployeeSearch('');
      setSelectedSeat(updated);
      await loadFloorDetail(selectedFloorId);
      // Re-read both authoritative views only after the assignment succeeds.
      // This prevents a failed request from optimistically hiding an employee.
      setUnassignedRefreshVersion((version) => version + 1);
      setRemoteSearchRefreshVersion((version) => version + 1);
      broadcastWorkspaceDataChanged('seat');
      setToast({ tone: 'success', message: `${assignmentCandidate.employee.fullName} assigned to ${assignmentCandidate.seat.label}.` });
    } catch (error: any) {
      setToast({ tone: 'error', message: error?.message || 'Assignment could not be completed. Refresh and try again.' });
      await loadFloorDetail(selectedFloorId);
      setUnassignedRefreshVersion((version) => version + 1);
    } finally {
      setIsAssigning(false);
    }
  };

  // Map drag-and-drop state for visual drop indicator
  const [isDragOverMap, setIsDragOverMap] = useState(false);
  const [dragIndicator, setDragIndicator] = useState<{ x: number; y: number } | null>(null);

  const handleMapDragOver = (event: React.DragEvent<HTMLElement>) => {
    if (!hasFloorMap) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = isEditingMode ? 'move' : 'copy';
    const bounds = event.currentTarget.getBoundingClientRect();
    setIsDragOverMap(true);
    setDragIndicator({
      x: event.clientX - bounds.left,
      y: event.clientY - bounds.top,
    });
  };

  const handleMapDragLeave = (event: React.DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragOverMap(false);
      setDragIndicator(null);
    }
  };

  const handleMapDrop = (event: React.DragEvent<HTMLElement>) => {
    event.preventDefault();
    setIsDragOverMap(false);
    setDragIndicator(null);
    if (!hasFloorMap) return;

    // Drag Type A: Workstation Placement in Edit Layout mode
    const workstationId = event.dataTransfer.getData('application/x-seating-workstation') || event.dataTransfer.getData('text/plain');
    if (isEditingMode && workstationId) {
      const targetSeat = seats.find((s) => s.id === workstationId || s.label.toLowerCase() === workstationId.toLowerCase());
      if (!targetSeat) return;

      const bounds = event.currentTarget.getBoundingClientRect();
      const { clampedX, clampedY } = calculateNormalizedDropCoordinates({
        clientX: event.clientX,
        clientY: event.clientY,
        containerBounds: bounds,
        stagePos,
        stageScale,
        canvasWidth,
        canvasHeight,
        itemWidth: MINI_MARKER_WIDTH,
        itemHeight: MINI_MARKER_HEIGHT,
      });

      setSeats((previous) =>
        previous.map((seat) =>
          seat.id === targetSeat.id
            ? { ...seat, x: clampedX, y: clampedY, placementSource: 'MANUAL' }
            : seat
        )
      );
      setHasUnsavedChanges(true);
      return;
    }

    if (isEditingMode) return;

    // Drag Type B: Employee Assignment in Normal mode
    const raw = event.dataTransfer.getData('application/x-seating-employee');
    if (!raw) return;

    try {
      const employee = JSON.parse(raw) as AssignableEmployee;
      const bounds = event.currentTarget.getBoundingClientRect();
      const hitSeat = findSeatAtCanvasCoordinates({
        clientX: event.clientX,
        clientY: event.clientY,
        containerBounds: bounds,
        stagePos,
        stageScale,
        seats: displayedSeats.map((s) => {
          const offset = visualOffsets.get(s.id);
          return {
            ...s,
            x: offset ? offset.visualX : s.x,
            y: offset ? offset.visualY : s.y,
            width: MINI_MARKER_WIDTH,
            height: MINI_MARKER_HEIGHT,
          };
        }),
      });

      if (!hitSeat) {
        setToast({
          tone: 'info',
          message: 'Drop employees on an existing available workstation marker. A floor coordinate alone cannot create a seat assignment.',
        });
        return;
      }

      // Occupied seats reject employee drops
      const isOccupied = Boolean(hitSeat.employeeId && hitSeat.employee);
      if (isOccupied) {
        setToast({
          tone: 'error',
          message: `Workstation ${hitSeat.label} is already occupied by ${hitSeat.employee?.fullName || 'another employee'}. Employee drops on occupied workstations are rejected.`,
        });
        return;
      }

      if (hitSeat.status !== 'AVAILABLE') {
        setToast({
          tone: 'error',
          message: `Workstation ${hitSeat.label} is currently ${hitSeat.status}. Only available workstations can be assigned.`,
        });
        return;
      }

      // Available workstation marker hit -> prompt confirmation dialog
      handleAssignmentRequested(hitSeat, employee);
    } catch {
      // Ignore unsupported browser drag payloads.
    }
  };

  return (
    <div className="min-h-[calc(100vh-4.25rem)] bg-slate-50">
      <div className="mx-auto max-w-[1700px] px-4 pb-5 pt-6 sm:px-6">
        <PageHeroHeader
          id="floor-plan-title"
          eyebrow="Spatial workspace"
          title="Floor Plan"
          description="Visualize floor layouts, locate employees and manage workstation placement across your authorized Unit scope."
          icon={MapIcon}
        />
      </div>
      <div className="ios-floor-workspace relative flex min-h-[620px] flex-col overflow-visible bg-slate-950 font-sans antialiased text-slate-100 lg:h-[calc(100vh-15rem)]">
      {/* 1. CAD Viewport Command Bar & Full Hierarchy Navigation */}
      <header className="ios-floor-toolbar bg-slate-900/95 border-b border-slate-800 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2.5 z-20 backdrop-blur-md select-none">
        {/* Left Cluster: Hierarchy Selectors */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Logo */}
          <div className="flex items-center mr-1">
            <img
              src={shaktimanLogo}
              alt="Shaktiman"
              className="h-6 w-auto object-contain bg-white/95 px-1.5 py-0.5 rounded shadow-xs"
            />
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          {/* Unit Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <Factory className="w-3.5 h-3.5 text-orange-400 shrink-0" strokeWidth={1.75} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Unit:</span>
            <select
              value={selectedUnitId}
              onChange={(e) => handleUnitChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1"
              title="Select Unit"
              aria-label="Select Unit"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id} className="bg-slate-900 text-slate-200">
                  {u.name}
                </option>
              ))}
            </select>
          </div>

          {/* Building Selector */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <Building className="w-3.5 h-3.5 text-emerald-400 shrink-0" strokeWidth={1.75} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Bldg:</span>
            <select
              value={selectedBuildingId}
              onChange={(e) => handleBuildingChange(e.target.value)}
              disabled={buildings.length === 0}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1 disabled:opacity-50 max-w-[130px] truncate"
              title="Select Building"
              aria-label="Select Building"
            >
              {buildings.length === 0 ? (
                <option value="">No Buildings</option>
              ) : (
                buildings.map((b) => (
                  <option key={b.id} value={b.id} className="bg-slate-900 text-slate-200">
                    {b.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Floor Selector: one stable Floor-ID-backed control without clipped tabs */}
          <div className="flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
            <Layers className="w-3.5 h-3.5 text-purple-400 shrink-0" strokeWidth={1.75} />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Floor:</span>
            <select
              value={selectedFloorId}
              onChange={(e) => handleFloorSelect(e.target.value)}
              disabled={operationalFloors.length === 0}
              className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1 max-w-[190px] truncate disabled:opacity-50"
              title="Select Floor"
              aria-label="Select Floor"
            >
              {operationalFloors.length === 0 ? (
                <option value="">No Floors</option>
              ) : (
                operationalFloors.map((f) => {
                  const seatCount = f._count?.seats ?? 0;
                  return (
                    <option key={f.id} value={f.id} className="bg-slate-900 text-slate-200">
                      {f.name} — {formatFloorSeatCount(seatCount)}
                    </option>
                  );
                })
              )}
            </select>
          </div>

          {selectedFloorId && !floorLoading && (
            <span className={`hidden lg:inline-flex items-center rounded border px-2 py-1 text-[10px] font-mono uppercase tracking-wide ${hasFloorMap ? 'border-emerald-900/70 bg-emerald-950/40 text-emerald-300' : 'border-amber-900/70 bg-amber-950/40 text-amber-300'}`}>
              Floor map: {hasFloorMap ? 'configured' : 'not configured'}
            </span>
          )}

          {/* Office Filter (Section 5) */}
          {floorOffices.length > 0 && (
            <div className="hidden xl:flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
              <Filter className="w-3.5 h-3.5 text-sky-400 shrink-0" strokeWidth={1.75} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Office:</span>
              <select
                value={selectedOfficeFilter}
                onChange={(e) => {
                  setSelectedOfficeFilter(e.target.value);
                  setSelectedAreaFilter('ALL');
                }}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1 max-w-[130px] truncate"
                title="Filter by Office"
                aria-label="Filter by Office"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">
                  All Offices
                </option>
                {floorOffices.map((office) => (
                  <option key={office} value={office} className="bg-slate-900 text-slate-200">
                    {office}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Area Filter (Section 5) */}
          {floorAreas.length > 0 && (
            <div className="hidden 2xl:flex items-center space-x-1.5 bg-slate-950 px-2 py-1 rounded-md border border-slate-800">
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-500 font-semibold">Area:</span>
              <select
                value={selectedAreaFilter}
                onChange={(e) => setSelectedAreaFilter(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-200 focus:outline-none cursor-pointer pr-1 max-w-[120px] truncate"
                title="Filter by Area"
                aria-label="Filter by Area"
              >
                <option value="ALL" className="bg-slate-900 text-slate-200">
                  All Areas
                </option>
                {floorAreas.map((area) => (
                  <option key={area} value={area} className="bg-slate-900 text-slate-200">
                    {area}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Search Input with Cross-Floor Autocomplete */}
          <div ref={searchContainerRef} className="relative flex items-center">
            <div className="relative">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => {
                  setSearchInput(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                placeholder="Search workstation / employee ID / name"
                className="h-7 w-36 md:w-48 pl-7 pr-6 text-xs bg-slate-950 border border-slate-800 rounded-md text-slate-200 placeholder-slate-500 focus:outline-none focus:border-orange-500"
                aria-label="Search workstation or employee"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2 top-2 pointer-events-none" />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput('');
                    setShowSearchDropdown(false);
                  }}
                  className="absolute right-1.5 text-slate-400 hover:text-slate-200 text-xs px-1"
                  aria-label="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Search Results Dropdown Popover */}
            {showSearchDropdown && searchInput.trim().length >= 2 && (
              <div
                className="absolute left-0 top-8 w-80 md:w-96 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl z-50 overflow-hidden text-xs max-h-80 flex flex-col"
                role="listbox"
              >
                <div className="px-3 py-1.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Search Results</span>
                  {isSearchingRemote && <span className="text-orange-400 animate-pulse">Searching…</span>}
                </div>

                <div className="overflow-y-auto divide-y divide-slate-800/60 flex-1">
                  {/* Category 1: Matches on currently loaded floor */}
                  {localMatchSeatIds.size > 0 && (
                    <div className="p-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold px-1 mb-1">
                        On This Floor ({localMatchSeatIds.size})
                      </div>
                      <div className="space-y-1">
                        {seats
                          .filter((s) => localMatchSeatIds.has(s.id))
                          .slice(0, 5)
                          .map((seat) => (
                            <button
                              key={seat.id}
                              type="button"
                              onClick={() => {
                                focusSeat(seat);
                                setShowSearchDropdown(false);
                              }}
                              className="w-full text-left p-1.5 rounded hover:bg-slate-800 transition-colors flex items-center justify-between text-xs group"
                            >
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-orange-400 group-hover:text-orange-300">
                                  {seat.label}
                                </span>
                                {seat.employee ? (
                                  <span className="text-slate-200 truncate max-w-[140px]">
                                    {seat.employee.fullName} ({seat.employee.employeeCode})
                                  </span>
                                ) : (
                                  <span className="text-emerald-400">Available</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {seat.officeArea || 'Focus'}
                              </span>
                            </button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Global employee matches use the same employee endpoint and
                      show assignment state explicitly. The left panel remains
                      the only draggable source and contains unassigned staff. */}
                  {remoteEmployeeResults.length > 0 && (
                    <div className="p-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-violet-300 font-bold px-1 mb-1">
                        Employees in Access Scope ({remoteEmployeeResults.length})
                      </div>
                      <div className="space-y-1.5">
                        {remoteEmployeeResults.slice(0, 10).map((employee) => {
                          const currentSeat = employee.seat?.id
                            ? seats.find((seat) => seat.id === employee.seat?.id)
                            : undefined;
                          const canAssignFromResult = employee.assignmentStatus === 'UNASSIGNED' &&
                            Boolean(selectedSeat) &&
                            !isEditingMode &&
                            canManageFloorPlanAssets &&
                            Boolean(selectedSeat && selectedSeat.status === 'AVAILABLE' && !selectedSeat.employeeId && hasSavedFloorPlanPosition(selectedSeat.x, selectedSeat.y, selectedSeat.placementSource));
                          const location = employee.assignmentStatus === 'SEATED'
                            ? `${employee.seat?.label || 'Seat'} • ${employee.building?.name || 'Building'} • ${employee.floor?.name || employee.seat?.floor?.name || 'Floor'}`
                            : employee.department?.name || 'No department';
                          const isUnplacedOnCurrentFloor = employee.assignmentStatus === 'SEATED' &&
                            Boolean(currentSeat) &&
                            !hasSavedFloorPlanPosition(currentSeat!.x, currentSeat!.y, currentSeat!.placementSource);

                          return (
                            <div key={`employee-${employee.id}`} className="rounded bg-slate-950/70 border border-slate-800/80 p-1.5">
                              <div className="flex items-start justify-between gap-2">
                                <button
                                  type="button"
                                  onClick={() => handleEmployeeSearchResult(employee)}
                                  className="min-w-0 flex-1 text-left rounded hover:bg-slate-800/70 px-1 py-0.5"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate font-semibold text-slate-100">{employee.fullName}</span>
                                    <span className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-bold ${
                                      employee.assignmentStatus === 'SEATED'
                                        ? 'bg-amber-950 text-amber-300'
                                        : 'bg-emerald-950 text-emerald-300'
                                    }`}>
                                      {employee.assignmentStatus}
                                    </span>
                                  </div>
                                  <div className="mt-0.5 text-[10px] font-mono text-slate-400">
                                    {employee.employeeCode} • {location}
                                  </div>
                                  {isUnplacedOnCurrentFloor && (
                                    <div className="mt-0.5 text-[10px] text-sky-300">Workstation currently unplaced on floor map</div>
                                  )}
                                </button>
                                {canAssignFromResult && (
                                  <button
                                    type="button"
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      handleAssignmentRequested(selectedSeat!, asAssignableEmployee(employee));
                                    }}
                                    className="shrink-0 rounded bg-orange-600 px-2 py-1 text-[10px] font-semibold text-white hover:bg-orange-500"
                                  >
                                    Assign
                                  </button>
                                )}
                              </div>
                              {employee.assignmentStatus === 'SEATED' && employee.seat && (
                                <div className="mt-1 text-[10px] text-slate-500">
                                  {employee.floor?.id === selectedFloorId ? 'Select to locate on this floor' : 'Select to open current floor'}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Category 2: Matches on other floors in permitted scope */}
                  {remoteSearchResults.filter((r) => r.floor?.id !== selectedFloorId).length > 0 && (
                    <div className="p-2">
                      <div className="text-[10px] font-mono uppercase tracking-wider text-sky-400 font-bold px-1 mb-1">
                        Other Floors in Access Scope
                      </div>
                      <div className="space-y-1.5">
                        {remoteSearchResults
                          .filter((r) => r.floor?.id !== selectedFloorId)
                          .slice(0, 6)
                          .map((res) => (
                            <div
                              key={res.id}
                              className="p-1.5 rounded bg-slate-950/60 border border-slate-800/80 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-mono font-bold text-white">{res.wsNo || res.label}</span>
                                  {res.employee ? (
                                    <span className="text-amber-400 font-semibold truncate max-w-[130px]">
                                      {res.employee.fullName} ({res.employee.employeeCode})
                                    </span>
                                  ) : (
                                    <span className="text-emerald-400 font-medium">Available</span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                  {res.unit?.name || 'Unit'} &gt; {res.building?.name || 'Building'} &gt;{' '}
                                  <span className="text-sky-300">{res.floor?.name || 'Floor'}</span>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleNavigateToSearchResult(res)}
                                className="px-2 py-1 bg-orange-600/80 hover:bg-orange-500 text-white rounded text-[11px] font-medium flex items-center space-x-1 shrink-0 ml-2"
                              >
                                <span>View</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Empty state in search */}
                  {localMatchSeatIds.size === 0 &&
                    remoteSearchResults.length === 0 &&
                    remoteEmployeeResults.length === 0 &&
                    !isSearchingRemote && (
                      <div className="p-4 text-center text-slate-500">
                        <AlertCircle className="w-6 h-6 mx-auto mb-1 text-slate-600" />
                        <p className="font-semibold text-slate-300">No matches found</p>
                        <p className="text-[11px]">No workstations or employees match "{searchInput}".</p>
                      </div>
                    )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Cluster: CAD View Controls & Actions */}
        <div className="flex items-center space-x-1.5">
          {/* CAD Theme Switcher: Blueprint vs Clean */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800">
            <button
              type="button"
              onClick={() => setCadMode('blueprint')}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                cadMode === 'blueprint'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="CAD Blueprint dark theme"
            >
              Blueprint
            </button>
            <button
              type="button"
              onClick={() => setCadMode('clean')}
              className={`px-2 py-1 text-[11px] font-medium rounded transition-colors ${
                cadMode === 'clean'
                  ? 'bg-slate-800 text-white font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Clean architectural light theme"
            >
              Clean
            </button>
          </div>

          {/* Zoom & View controls */}
          <div className="flex items-center bg-slate-950 p-0.5 rounded-md border border-slate-800">
            <button
              onClick={() => setStageScale((s) => Math.min(3.5, s * 1.2))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom In (+)"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => setStageScale((s) => Math.max(0.15, s / 1.2))}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Zoom Out (-)"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
            <button
              onClick={() => fitPlanToView()}
              className="inline-flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Fit to Screen"
              aria-label="Fit floor plan to screen"
            >
              <Maximize2 className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="text-[10px] font-semibold whitespace-nowrap">Fit to Screen</span>
            </button>
            <button
              onClick={handleResetView}
              className="inline-flex items-center gap-1 px-2 py-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition-colors"
              title="Reset View"
              aria-label="Reset view position and zoom"
            >
              <RotateCw className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span className="text-[10px] font-semibold whitespace-nowrap">Reset View</span>
            </button>
          </div>

          <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />

          {/* Edit Layout Mode Toggle Button (Section 10 & 11) */}
          {canManageFloorPlanAssets && (
            <button
              type="button"
              disabled={!hasFloorMap || isSaving}
              onClick={() => {
                if (!hasFloorMap || isSaving) return;
                if (isEditingMode) {
                  setIsEditingMode(false);
                  setShowUnplacedDrawer(false);
                } else {
                  setIsEditingMode(true);
                }
              }}
              className={`inline-flex items-center h-7 px-2.5 rounded-md text-xs font-medium transition-colors border ${
                isEditingMode
                  ? 'bg-orange-600 border-orange-500 text-white shadow-xs'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:bg-slate-950 disabled:hover:text-slate-300'
              }`}
              title={hasFloorMap ? 'Toggle Edit Layout mode (enables dragging & positioning markers)' : 'Add a floor map before editing workstation positions.'}
            >
              <Edit2 className="w-3.5 h-3.5 mr-1" strokeWidth={1.75} />
              {isEditingMode ? 'Exit edit mode' : 'Edit layout'}
            </button>
          )}

          {canManageFloorPlanAssets && !isEditingMode && (
            <label
              className={`inline-flex items-center h-7 px-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md text-xs font-medium transition-colors border border-slate-800 cursor-pointer ${
                isUploadingImage ? 'opacity-50 pointer-events-none' : ''
              }`}
              title="Add or replace architectural floor map"
            >
              <Upload className="w-3 h-3 mr-1 text-slate-400" strokeWidth={1.75} />
              {hasFloorMap ? 'Replace map' : 'Add floor map'}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                className="hidden"
                onChange={handleUploadFloorPlanImage}
                disabled={!selectedFloorId || isUploadingImage}
              />
            </label>
          )}

          {isPdfFloorPlanAsset(floorDetail?.imageUrl) && pdfPageCount > 1 && !isEditingMode && (
            <label className="inline-flex items-center h-7 gap-1.5 rounded-md border border-slate-800 bg-slate-950 px-2 text-xs font-medium text-slate-300" title="Select the PDF page used as this floor map">
              <span className="text-[10px] uppercase tracking-wide text-slate-500">PDF page</span>
              <select
                aria-label="PDF floor map page"
                value={pdfPage}
                onChange={handlePdfPageChange}
                className="h-5 rounded border border-slate-700 bg-slate-900 px-1 text-xs text-white"
              >
                {Array.from({ length: pdfPageCount }, (_, index) => index + 1).map((page) => (
                  <option key={page} value={page}>{page} / {pdfPageCount}</option>
                ))}
              </select>
            </label>
          )}

          {/* Edit mode toolbar actions */}
          {canManageFloorPlanAssets && isEditingMode && (
            <>
              {/* Toggle Unplaced Workstations Drawer */}
              <button
                type="button"
                disabled={isSaving}
                onClick={() => setShowUnplacedDrawer((prev) => !prev)}
                className={`inline-flex items-center h-7 px-2 rounded-md text-xs font-medium transition-colors border ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : ''
                } ${
                  showUnplacedDrawer
                    ? 'bg-slate-800 text-orange-400 border-orange-500/60'
                    : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
                }`}
                title="View unplaced workstations"
              >
                <Armchair className="w-3 h-3 mr-1 text-orange-400" />
                <span>Unplaced ({unplacedSeats.length})</span>
              </button>

              <button
                type="button"
                onClick={handleAddSeat}
                disabled={!selectedFloorId || isSaving}
                className="inline-flex items-center h-7 px-2 bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white rounded-md text-xs font-medium transition-colors border border-slate-800 disabled:opacity-50"
                title="Add new workstation"
              >
                <Plus className="w-3.5 h-3.5 text-orange-400" strokeWidth={1.75} />
                <span>Add WS</span>
              </button>

              {/* Save Layout Button */}
              {hasUnsavedChanges && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveLayout}
                  className={`inline-flex items-center h-7 px-2.5 bg-orange-600 hover:bg-orange-500 text-white rounded-md text-xs font-medium transition-colors shadow-xs ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : 'animate-pulse'
                  }`}
                  title="Persist layout coordinates"
                >
                  <Save className={`w-3.5 h-3.5 mr-1 ${isSaving ? 'animate-spin' : ''}`} strokeWidth={1.75} />
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              )}

              {/* Cancel Button */}
              {hasUnsavedChanges && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleCancelLayoutEdits}
                  className="inline-flex items-center h-7 px-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-slate-400 hover:text-white rounded-md text-xs font-medium transition-colors border border-slate-800"
                  title="Discard unsaved changes"
                >
                  <Undo2 className="w-3 h-3 mr-1" />
                  Cancel
                </button>
              )}

              {/* Upload Plan */}
              <label
                className={`inline-flex items-center h-7 px-2 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-md text-xs font-medium transition-colors border border-slate-800 cursor-pointer ${
                  isUploadingImage ? 'opacity-50 pointer-events-none' : ''
                }`}
                title="Upload architectural floor plan image"
              >
                <Upload className="w-3 h-3 mr-1 text-slate-400" strokeWidth={1.75} />
                {isUploadingImage ? '...' : 'Upload'}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                  className="hidden"
                  onChange={handleUploadFloorPlanImage}
                  disabled={!selectedFloorId || isUploadingImage}
                />
              </label>
            </>
          )}
        </div>
      </header>

      {/* 2. Edit Layout Mode Active Banner */}
      {isEditingMode && (
        <div className="bg-orange-950/80 border-b border-orange-500/40 px-4 py-1.5 flex items-center justify-between text-xs text-orange-200 z-10 font-mono">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
            <span className="font-bold tracking-wide">EDITING FLOOR LAYOUT:</span>
            <span>Drag workstation markers to their exact architectural position, then click Save.</span>
          </div>
          <div className="flex items-center space-x-2">
            {hasUnsavedChanges && (
              <span className="text-[11px] text-amber-300 font-semibold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
                Unsaved coordinate changes
              </span>
            )}
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveLayout}
              className="px-2.5 py-0.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded font-medium text-xs shadow-xs flex items-center space-x-1"
            >
              {isSaving && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
              <span>{isSaving ? 'Saving…' : 'Save Layout'}</span>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleCancelLayoutEdits}
              className="px-2.5 py-0.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 3. Floor Occupancy Summary KPI Bar (Requirement 14 & 29) */}
      {selectedFloorId && !floorLoading && !floorError && (
        <FloorSummaryBar
          totalSeats={totalWorkstations}
          occupiedSeats={occupiedCount}
          availableSeats={availableCount}
          occupancyRate={occupancyPercentage}
          employeesOnFloor={employeesOnFloor}
          placedSeats={placedSeats.length}
          unplacedSeats={unplacedSeats.length}
          floorName={floorDetail?.name}
        />
      )}

      {/* 4. Operational left panel + floor-map workspace */}
      <div className="floor-plan-content flex flex-1 min-h-0 w-full flex-col lg:flex-row">
        <FloorPlanOperationalPanel
          seats={seats}
          selectedSeat={selectedSeat}
          offices={floorOffices}
          areas={floorAreas}
          departments={(floorDetail?.departments || []).map((department) => ({ id: department.id, name: department.name }))}
          office={selectedOfficeFilter}
          area={selectedAreaFilter}
          departmentId={selectedDepartmentFilter}
          status={selectedSeatStatusFilter}
          unassigned={unassignedEmployees}
          employeeSearch={employeeSearch}
          unassignedLoading={unassignedLoading}
          isEditing={isEditingMode}
          canAssign={canManageFloorPlanAssets}
          canDragEmployeesToMap={canManageFloorPlanAssets && hasFloorMap}
          hasFloorMap={hasFloorMap}
          isSeatPlaced={(seat) => hasSavedFloorPlanPosition(seat.x, seat.y, seat.placementSource)}
          onOfficeChange={setSelectedOfficeFilter}
          onAreaChange={setSelectedAreaFilter}
          onDepartmentChange={setSelectedDepartmentFilter}
          onStatusChange={setSelectedSeatStatusFilter}
          onEmployeeSearchChange={setEmployeeSearch}
          onSeatSelect={setSelectedSeat}
          onBack={() => setSelectedSeat(null)}
          onAssignmentRequested={handleAssignmentRequested}
          onManageSeat={(seat) => setEditingModalSeat(seat)}
          onEmployeeDragStart={() => undefined}
          onPlaceSeat={handlePlaceUnplacedSeat}
          onUnplaceSeat={handleUnplaceSeat}
        />
        <main
          ref={mapViewportRef}
          className={`min-w-0 min-h-[420px] flex-1 h-full relative overflow-hidden bg-slate-950 select-none transition-all ${
            hasFloorMap ? 'cursor-grab active:cursor-grabbing' : ''
          } ${
            isDragOverMap
              ? isEditingMode
                ? 'ring-2 ring-orange-500/80 ring-inset bg-orange-950/10'
                : 'ring-2 ring-sky-500/80 ring-inset bg-sky-950/10'
              : ''
          }`}
          tabIndex={0}
          aria-label="Floor plan interactive map"
          onDragOver={handleMapDragOver}
          onDragLeave={handleMapDragLeave}
          onDrop={handleMapDrop}
          onMouseLeave={() => {
            setHoveredSeat(null);
            setTooltipPosition(null);
          }}
        >
          {/* Accessible Workstations list for screen readers and automated tests */}
          <div className="sr-only" aria-label="Workstation markers" role="region">
            {displayedSeats.map((seat) => (
              <button
                key={`sr-ws-${seat.id}`}
                type="button"
                aria-label={getWorkstationAriaLabel(seat)}
                onClick={() => {
                  setSelectedSeat(seat);
                  setSelectedMapSeatId(seat.id);
                }}
              >
                {getWorkstationAriaLabel(seat)}
              </button>
            ))}
          </div>
          {isDragOverMap && dragIndicator && (
            <div
              className="pointer-events-none absolute z-50 transform -translate-x-1/2 -translate-y-1/2"
              style={{ left: dragIndicator.x, top: dragIndicator.y }}
            >
              <div
                className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-semibold shadow-lg backdrop-blur-md border ${
                  isEditingMode
                    ? 'bg-orange-600/90 text-white border-orange-400'
                    : 'bg-sky-600/90 text-white border-sky-400'
                }`}
              >
                {isEditingMode ? 'Drop workstation to place' : 'Drop on available workstation'}
              </div>
            </div>
          )}
        {!selectedFloorId && selectedBuildingId && floors.length > 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
            <Layers className="w-12 h-12 text-slate-700" />
            <p className="text-base font-semibold text-slate-100">No active floors are currently configured for Floor Plan.</p>
            <p className="max-w-md text-xs leading-5 text-slate-500">
              Empty hierarchy records remain available in Facilities for floor and map administration.
            </p>
          </div>
        ) : !selectedFloorId ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
            <Layers className="w-12 h-12 text-slate-700" />
            <p className="text-sm font-semibold text-slate-300">No Floor Selected</p>
            <p className="text-xs text-slate-600">
              Select a Unit, Building, and Floor from the hierarchy controls above.
            </p>
          </div>
        ) : floorLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-orange-400" />
            <p className="text-sm font-semibold">Loading floor plan…</p>
          </div>
        ) : floorError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-slate-400">
            <AlertCircle className="w-10 h-10 text-rose-400" />
            <p className="text-sm font-semibold text-rose-300">{floorError}</p>
            <button
              type="button"
              onClick={() => loadFloorDetail(selectedFloorId)}
              className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-800"
            >
              Retry
            </button>
          </div>
        ) : !hasFloorMap ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center text-slate-400">
            <Layers className="h-12 w-12 text-slate-700" />
            <div>
              <p className="text-base font-semibold text-slate-100">No floor map configured.</p>
              <p className="mt-1 max-w-md text-xs leading-5 text-slate-400">
                Add an architectural floor map before placing workstations. Business seat assignments remain available in the left panel, but no workstation has a visual map position yet.
              </p>
            </div>
            {canManageFloorPlanAssets && (
              <label className="inline-flex cursor-pointer items-center rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500">
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                {isUploadingImage ? 'Uploading…' : 'Add Floor Map'}
                <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" className="hidden" onChange={handleUploadFloorPlanImage} disabled={isUploadingImage} />
              </label>
            )}
          </div>
        ) : seats.length === 0 ? (
          /* Empty state for floors with zero workstations (Requirement 26) */
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center text-slate-400">
            <Building className="h-12 w-12 text-slate-700" />
            <p className="text-base font-semibold text-slate-200">No workstations are configured for this floor.</p>
            <p className="max-w-md text-xs text-slate-500">
              This floor exists in the facility hierarchy, but has no seating records in MongoDB.
            </p>
            {!floorDetail?.imageUrl && (
              <>
                <p className="text-xs font-medium text-slate-300">No floor map configured.</p>
                {canManageFloorPlanAssets && (
                  <label className="inline-flex cursor-pointer items-center rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500">
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Add Floor Map
                    <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf" className="hidden" onChange={handleUploadFloorPlanImage} disabled={isUploadingImage} />
                  </label>
                )}
              </>
            )}
            {canManageFloorPlanAssets && isEditingMode && (
              <button
                type="button"
                onClick={handleAddSeat}
                className="mt-2 inline-flex items-center rounded-md border border-orange-500/50 bg-orange-600/20 px-3 py-1.5 text-xs font-semibold text-orange-200 hover:bg-orange-600/30"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add First Workstation
              </button>
            )}
          </div>
        ) : (
          <>
          <Stage
            ref={stageRef}
            width={stageDimensions.width}
            height={stageDimensions.height}
            scaleX={stageScale}
            scaleY={stageScale}
            x={stagePos.x}
            y={stagePos.y}
            draggable={!isEditingMode && !isSaving}
            onWheel={handleWheel}
            onTouchStart={handleStageTouchStart}
            onTouchMove={handleStageTouchMove}
            onTouchEnd={handleStageTouchEnd}
            onTouchCancel={handleStageTouchEnd}
            onDragEnd={(event) => {
              if (event.target !== event.currentTarget) return;
              const stage = event.currentTarget;
              setStagePos({ x: stage.x(), y: stage.y() });
            }}
            onMouseLeave={() => {
              setHoveredSeat(null);
              setTooltipPosition(null);
            }}
            onDragStart={() => {
              setHoveredSeat(null);
              setTooltipPosition(null);
            }}
            onClick={(event) => {
              if (event.target === event.target.getStage()) {
                setSelectedMapSeatId(null);
                setHoveredSeat(null);
                setTooltipPosition(null);
              }
            }}
            onTap={(event) => {
              if (event.target === event.target.getStage()) {
                setSelectedMapSeatId(null);
                setHoveredSeat(null);
                setTooltipPosition(null);
              }
            }}
          >
            <FloorPlanImageLayer
              key={`${floorPlanSource}-${mapAssetRetry}`}
              src={floorPlanSource!}
              canvasWidth={canvasWidth}
              canvasHeight={canvasHeight}
              mode={cadMode}
              onLoad={(dimensions) => {
                setMapAssetError(null);
                if (dimensions?.pageCount) {
                  setPdfPageCount(dimensions.pageCount);
                  setPdfPage(dimensions.page || 1);
                }
              }}
              onError={() => setMapAssetError('The floor map file is unavailable. Workstation data has not been changed.')}
            />

            {/* Area / Office Zones Grouping Layer (Requirement 15) */}
            <Layer listening={false}>
              {areaBoundaries.map((zone) => {
                const isAreaHighlighted =
                  selectedAreaFilter === 'ALL' || selectedAreaFilter === zone.area;
                return (
                  <Group key={zone.area} opacity={isAreaHighlighted ? 1 : 0.35} listening={false}>
                    <Rect
                      x={zone.x}
                      y={zone.y}
                      width={zone.width}
                      height={zone.height}
                      cornerRadius={6}
                      fill={isBlueprint ? 'rgba(15, 23, 42, 0.45)' : 'rgba(241, 245, 249, 0.65)'}
                      stroke={isBlueprint ? '#334155' : '#94a3b8'}
                      strokeWidth={1.2}
                      dash={[6, 4]}
                      listening={false}
                    />
                    <Rect
                      x={zone.x + 8}
                      y={zone.y - 10}
                      width={Math.max(80, (zone.area.length + 8) * 6.5)}
                      height={18}
                      cornerRadius={3}
                      fill={isBlueprint ? '#1e293b' : '#e2e8f0'}
                      stroke={isBlueprint ? '#475569' : '#cbd5e1'}
                      strokeWidth={1}
                      listening={false}
                    />
                    <Text
                      text={`${zone.area.toUpperCase()} (${zone.count})`}
                      x={zone.x + 12}
                      y={zone.y - 6}
                      fontSize={9}
                      fontFamily="monospace"
                      fontStyle="bold"
                      fill={isBlueprint ? '#94a3b8' : '#334155'}
                      listening={false}
                    />
                  </Group>
                );
              })}
            </Layer>

            {/* Workstation Seats Layer (Requirement: Mini Workstation Markers Redesign) */}
            <Layer>
              {displayedSeats.map((seat) => {
                const isOccupied = Boolean(seat.employeeId && seat.employee);
                const deptColor = seat.department?.colorHex || '#3b82f6';
                const isSelected = selectedMapSeatId === seat.id;
                const isHovered = hoveredSeat?.id === seat.id;
                const isSearchMatch = localMatchSeatIds.has(seat.id);

                const seatWidth = MINI_MARKER_WIDTH;
                const seatHeight = MINI_MARKER_HEIGHT;

                // Presentation-only collision offset
                // Edit mode exposes the canonical coordinate directly. View
                // mode may use presentation offsets, which are converted back
                // to canonical coordinates by the drag helper as a second
                // safety guard.
                const offset = isEditingMode ? undefined : visualOffsets.get(seat.id);
                const markerX = offset ? offset.visualX : seat.x;
                const markerY = offset ? offset.visualY : seat.y;

                // Seat appearance
                let baseFill = isBlueprint ? '#0f172a' : '#ffffff';
                let strokeColor = isBlueprint ? '#334155' : '#cbd5e1';
                let strokeWidth = 1.2;

                if (isSearchMatch) {
                  baseFill = isBlueprint ? 'rgba(245, 158, 11, 0.25)' : 'rgba(254, 243, 199, 0.7)';
                  strokeColor = '#f59e0b';
                  strokeWidth = 2.2;
                } else if (isSelected) {
                  baseFill = isBlueprint ? 'rgba(249, 115, 22, 0.25)' : 'rgba(254, 237, 232, 0.85)';
                  strokeColor = '#f97316';
                  strokeWidth = 2.4;
                } else if (isHovered) {
                  baseFill = isOccupied
                    ? withAlpha(deptColor, isBlueprint ? 0.45 : 0.25)
                    : isBlueprint
                    ? 'rgba(56, 189, 248, 0.2)'
                    : 'rgba(56, 189, 248, 0.15)';
                  strokeColor = '#38bdf8';
                  strokeWidth = 2;
                } else if (isOccupied) {
                  baseFill = withAlpha(deptColor, isBlueprint ? 0.35 : 0.15);
                  strokeColor = deptColor;
                  strokeWidth = 1.4;
                } else {
                  // Available
                  baseFill = isBlueprint ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)';
                  strokeColor = '#10b981';
                  strokeWidth = 1.2;
                }

                // Status Pip Color
                const pipColor =
                  seat.status === 'MAINTENANCE'
                    ? '#f59e0b'
                    : seat.status === 'RESERVED'
                    ? '#ef4444'
                    : isOccupied
                    ? deptColor
                    : '#10b981';

                const textColor = isBlueprint ? '#e2e8f0' : '#0f172a';
                const ariaLabel = getWorkstationAriaLabel({
                  label: seat.label,
                  employee: seat.employee,
                  status: seat.status,
                });

                return (
                  <Group
                    key={seat.id}
                    id={`workstation-${seat.id}`}
                    name={ariaLabel}
                    x={markerX}
                    y={markerY}
                    rotation={seat.rotation || 0}
                    draggable={isEditingMode && !isSaving}
                    onDragStart={() => {
                      setHoveredSeat(null);
                      setTooltipPosition(null);
                    }}
                    onDragEnd={(e) => {
                      if (isEditingMode) {
                        handleSeatDragEnd(seat, { x: markerX, y: markerY }, e);
                      }
                    }}
                    onClick={(e) => {
                      e.cancelBubble = true;
                      setSelectedSeat(seat);
                      setSelectedMapSeatId(seat.id);
                      setHoveredSeat(null);
                      setTooltipPosition(null);
                    }}
                    onTap={(e) => {
                      e.cancelBubble = true;
                      setSelectedSeat(seat);
                      setSelectedMapSeatId(seat.id);
                      setHoveredSeat(null);
                      setTooltipPosition(null);
                    }}
                    onMouseEnter={(e) => {
                      setHoveredSeat(seat);
                      setTooltipPosition({ x: e.evt.clientX, y: e.evt.clientY });
                    }}
                    onMouseMove={(e) => {
                      setTooltipPosition({ x: e.evt.clientX, y: e.evt.clientY });
                    }}
                    onMouseLeave={() => {
                      setHoveredSeat((prev) => (prev?.id === seat.id ? null : prev));
                      setTooltipPosition(null);
                    }}
                  >
                    {/* Practical ~36-40px click target hit area */}
                    <Rect
                      x={0}
                      y={-4}
                      width={seatWidth}
                      height={seatHeight + 8}
                      fill="transparent"
                      listening={true}
                    />

                    {/* Selection Outline - strictly bounded, no enlargement */}
                    {isSelected && (
                      <Rect
                        x={0}
                        y={0}
                        width={seatWidth}
                        height={seatHeight}
                        cornerRadius={3}
                        fill="transparent"
                        stroke="#f97316"
                        strokeWidth={2}
                        shadowColor="#f97316"
                        shadowBlur={4}
                        shadowOpacity={0.6}
                        listening={false}
                      />
                    )}

                    {/* Search match highlight - strictly bounded */}
                    {isSearchMatch && !isSelected && (
                      <Rect
                        x={0}
                        y={0}
                        width={seatWidth}
                        height={seatHeight}
                        cornerRadius={3}
                        fill="transparent"
                        stroke="#f59e0b"
                        strokeWidth={1.8}
                        shadowColor="#f59e0b"
                        shadowBlur={3}
                        shadowOpacity={0.5}
                        listening={false}
                      />
                    )}

                    {/* Main Ultra-Compact Workstation Desk Rectangle (54x30) */}
                    <Rect
                      x={0}
                      y={0}
                      width={seatWidth}
                      height={seatHeight}
                      cornerRadius={3}
                      fill={baseFill}
                      stroke={strokeColor}
                      strokeWidth={strokeWidth}
                    />

                    {/* Tiny Status Dot */}
                    <Rect
                      x={seatWidth - 7.5}
                      y={4.5}
                      width={4.5}
                      height={4.5}
                      cornerRadius={2.25}
                      fill={pipColor}
                      listening={false}
                    />

                    {/* Zoom-Dependent Detail Content */}
                    {zoomDetailLevel === 'LOW' ? (
                      /* Low Zoom (< 60%): only WS label + status dot */
                      <Text
                        text={seat.label}
                        x={4}
                        y={9.5}
                        width={seatWidth - 13}
                        fontSize={8.5}
                        fontFamily="monospace"
                        fontStyle="bold"
                        fill={textColor}
                        ellipsis
                        listening={false}
                      />
                    ) : (
                      /* Normal & High Zoom (>= 60%): WS label + Employee ID (or Vacant). NO FULL NAME! */
                      <>
                        <Text
                          text={seat.label}
                          x={4}
                          y={3.5}
                          width={seatWidth - 13}
                          fontSize={8.5}
                          fontFamily="monospace"
                          fontStyle="bold"
                          fill={textColor}
                          ellipsis
                          listening={false}
                        />
                        {isOccupied && seat.employee ? (
                          <Text
                            text={seat.employee.employeeCode || 'Occupied'}
                            x={4}
                            y={15.5}
                            width={seatWidth - 8}
                            fontSize={8}
                            fontFamily="monospace"
                            fontStyle="bold"
                            fill={deptColor}
                            ellipsis
                            listening={false}
                          />
                        ) : (
                          <Text
                            text="Vacant"
                            x={4}
                            y={15.5}
                            width={seatWidth - 8}
                            fontSize={7.5}
                            fontFamily="sans-serif"
                            fontStyle="italic"
                            fill="#10b981"
                            ellipsis
                            listening={false}
                          />
                        )}
                      </>
                    )}
                  </Group>
                );
              })}
            </Layer>
          </Stage>
          {mapAssetError && (
            <div className="absolute inset-x-4 top-4 z-30 flex flex-wrap items-center justify-center gap-2 rounded-lg border border-rose-500/50 bg-slate-950/95 px-4 py-3 text-center shadow-xl">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <p className="text-xs text-slate-200">{mapAssetError}</p>
              <button
                type="button"
                onClick={() => setMapAssetRetry((value) => value + 1)}
                className="rounded border border-slate-600 px-2 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
              >
                Retry
              </button>
              {canManageFloorPlanAssets && (
                <label className="cursor-pointer rounded bg-orange-600 px-2 py-1 text-xs font-semibold text-white hover:bg-orange-500">
                  Replace map
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml,application/pdf"
                    className="hidden"
                    onChange={handleUploadFloorPlanImage}
                    disabled={isUploadingImage}
                  />
                </label>
              )}
            </div>
          )}
          </>
        )}

        {/* Floating Move to Unplaced action button above selected placed marker in Edit Layout mode */}
        {selectedMapSeat && isEditingMode && (
          <div
            className="absolute z-40 transform -translate-x-1/2 -translate-y-full mb-3 pointer-events-auto"
            style={{
              left: Math.max(
                100,
                stagePos.x +
                  ((isEditingMode ? selectedMapSeat.x : (visualOffsets.get(selectedMapSeat.id)?.visualX ?? selectedMapSeat.x)) + MINI_MARKER_WIDTH / 2) *
                    stageScale
              ),
              top: Math.max(
                40,
                stagePos.y +
                  (isEditingMode ? selectedMapSeat.y : (visualOffsets.get(selectedMapSeat.id)?.visualY ?? selectedMapSeat.y)) * stageScale -
                  10
              ),
            }}
          >
            <button
              type="button"
              onClick={() => handleUnplaceSeat(selectedMapSeat.id)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/95 hover:bg-rose-600 border border-slate-700 hover:border-rose-500 text-xs font-semibold text-white shadow-2xl backdrop-blur-md transition-all hover:scale-105"
              title="Remove from floor map and return to unplaced list"
            >
              <Undo2 className="w-3.5 h-3.5 text-orange-400" />
              <span>Move to Unplaced</span>
            </button>
          </div>
        )}

        {/* 5. Rich Hover Tooltip (Requirements: Rich hover popup, non-blocking, no stuck popups) */}
        {hasFloorMap && hoveredSeat && (
          <FloorPlanTooltip
            seat={hoveredSeat}
            position={tooltipPosition}
            containerBounds={stageDimensions}
          />
        )}

        {/* 6. Unplaced Workstations Panel in Edit Mode (Requirements 32, 33, 34) */}
        <UnplacedWorkstationsDrawer
          isOpen={isEditingMode && showUnplacedDrawer}
          unplacedSeats={unplacedSeats}
          onPlaceSeat={handlePlaceUnplacedSeat}
          onDragStart={() => undefined}
          onClose={() => setShowUnplacedDrawer(false)}
        />

        {/* 7. Floating HUD: Legend & Canvas Status */}
        {hasFloorMap && selectedFloorId && seats.length > 0 && (
          <>
            {/* Bottom-left Legend HUD (Requirement 20 & 30) */}
            <div
              className="absolute bottom-4 left-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-3 text-[11px] font-mono text-slate-400 select-none"
              role="region"
              aria-label="Floor plan legend"
            >
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-emerald-500 mr-1.5 shrink-0" />
                Available
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-blue-500 mr-1.5 shrink-0" />
                Occupied
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full border border-orange-500 bg-orange-500/30 mr-1.5 shrink-0" />
                Selected
              </span>
              <span className="flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-1.5 shrink-0" />
                Search Match
              </span>
            </div>

            {/* Bottom-right Status HUD */}
            <div className="absolute bottom-4 right-4 z-10 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg px-3 py-1.5 shadow-lg flex items-center gap-3 text-[11px] font-mono text-slate-400 tabular-nums select-none">
              <span>
                Zoom: <strong className="text-slate-200">{Math.round(stageScale * 100)}%</strong>
              </span>
              <span className="h-3 w-[1px] bg-slate-800" />
              <span>
                Desks: <strong className="text-slate-200">{seats.length}</strong> (
                <span className="text-orange-400">{occupiedCount}</span> seated •{' '}
                <span className="text-emerald-400">{availableCount}</span> vacant)
              </span>
            </div>
          </>
        )}
        </main>
      </div>

      {assignmentCandidate && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-slate-950/70 p-4">
          <section role="dialog" aria-modal="true" aria-label="Confirm seat assignment" className="w-full max-w-sm rounded-lg border border-slate-700 bg-slate-900 p-5 shadow-2xl">
            <h2 className="text-base font-bold text-white">Assign Employee?</h2>
            <p className="mt-2 text-sm text-slate-300">Assign <strong>{assignmentCandidate.employee.employeeCode} — {assignmentCandidate.employee.fullName}</strong> to <strong className="font-mono">{assignmentCandidate.seat.label}</strong>?</p>
            <p className="mt-2 text-xs text-slate-500">The authoritative seat assignment endpoint will be called to persist this assignment.</p>
            <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setAssignmentCandidate(null)} disabled={isAssigning} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">Cancel</button><button type="button" onClick={confirmAssignment} disabled={isAssigning} className="rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:cursor-wait disabled:opacity-60">{isAssigning ? 'Assigning…' : 'Assign'}</button></div>
          </section>
        </div>
      )}

      {showUnsavedLayoutDialog && (
        <div className="absolute inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4">
          <section role="dialog" aria-modal="true" aria-labelledby="unsaved-layout-title" className="w-full max-w-md rounded-lg border border-amber-700/70 bg-slate-900 p-5 shadow-2xl">
            <h2 id="unsaved-layout-title" className="text-base font-bold text-white">You have unsaved layout changes.</h2>
            <p className="mt-2 text-sm leading-5 text-slate-300">Save your changes before leaving this layout?</p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button type="button" onClick={handleCancelLayoutNavigation} disabled={isSaving} className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50">Cancel</button>
              <button type="button" onClick={handleDiscardLayoutAndContinue} disabled={isSaving} className="rounded border border-rose-700/70 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-950/60 disabled:opacity-50">Discard Changes</button>
              <button type="button" onClick={handleSaveLayoutAndContinue} disabled={isSaving} className="rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:cursor-wait disabled:opacity-60 flex items-center space-x-1.5">
                {isSaving && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                <span>{isSaving ? 'Saving…' : 'Save & Continue'}</span>
              </button>
            </div>
          </section>
        </div>
      )}

      {/* 8b. Layout Save Error Dialog with Retry Save and Cancel */}
      {layoutSaveError && (
        <div className="absolute inset-0 z-[75] flex items-center justify-center bg-slate-950/75 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="layout-save-error-title"
            className="w-full max-w-md rounded-lg border border-amber-700/70 bg-slate-900 p-5 shadow-2xl"
          >
            <div className="flex items-center space-x-2.5 text-amber-400 mb-2">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <h2 id="layout-save-error-title" className="text-base font-bold text-white">
                Could not save layout
              </h2>
            </div>
            <p className="mt-2 text-sm leading-5 text-slate-300">
              {layoutSaveError.message}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={handleCancelSaveError}
                disabled={isSaving}
                className="rounded border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
              >
                Cancel
              </button>
              {layoutSaveError.isRetryable && (
                <button
                  type="button"
                  onClick={handleRetrySave}
                  disabled={isSaving}
                  className="rounded bg-orange-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-500 disabled:cursor-wait disabled:opacity-60 flex items-center space-x-1.5"
                >
                  {isSaving && <div className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />}
                  <span>{isSaving ? 'Retrying…' : 'Retry Save'}</span>
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* 8c. User-friendly Toast Feedback Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-[80] flex items-center space-x-2 px-4 py-2.5 rounded-lg shadow-xl text-xs font-medium border backdrop-blur-md transition-all ${
            toast.tone === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-600/60'
              : toast.tone === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-600/60'
              : 'bg-slate-900/90 text-slate-200 border-slate-700'
          }`}
          role="status"
        >
          {toast.tone === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : toast.tone === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-sky-400 shrink-0" />
          )}
          <span>{toast.message}</span>
        </div>
      )}

      {/* 9. Management modal is available only while editing the physical layout. */}
      <AnimatePresence>
        {editingModalSeat && (
          <SeatManagementModal
            seat={editingModalSeat}
            onClose={() => setEditingModalSeat(null)}
            onUpdated={async (shouldClose = false) => {
              if (selectedFloorId) {
                await loadFloorDetail(selectedFloorId);
              }
              setUnassignedRefreshVersion((version) => version + 1);
              if (shouldClose) {
                setEditingModalSeat(null);
                setToast({
                  tone: 'success',
                  message: `${editingModalSeat?.label || 'Workstation'} updated successfully.`,
                });
              }
            }}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
};

export default FloorPlanPage;
