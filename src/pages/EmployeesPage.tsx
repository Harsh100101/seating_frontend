import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebounce } from '../hooks/useDebounce';
import { apiRequest } from '../api/client';
import { fetchWorkstationFilterOptions } from '../api/workstations';
import { useAuth } from '../context/AuthContext';
import { SkeletonTable, SkeletonCards } from '../components/SkeletonLoader';
import { EmptyState } from '../components/EmptyState';
import { CategoryKind, CategoryManagerModal } from '../components/CategoryManagerModal';
import { EmployeeProfileModal } from '../components/EmployeeProfileModal';
import { DeleteEmployeeModal } from '../components/DeleteEmployeeModal';
import { EmployeeFormModal } from '../components/EmployeeFormModal';
import { SearchableSelect } from '../components/SearchableSelect';
import { EmployeeFilters } from '../components/employees/EmployeeFilters';
import { mapEmployeeApiError, validateEmployeeForm, type EmployeeFormErrors, type EmployeeFormField } from '../utils/employeeValidation';
import {
  ALL_FILTER,
  clearEmployeeFilters,
  isAuthoritativeAreaIdFilter,
  readEmployeeFilterState,
  writeEmployeeFilterState,
  type EmployeeSortField,
  type EmployeeHierarchyFilterState
} from '../utils/employeeHierarchyFilters';
import {
  Search,
  UserPlus,
  CheckCircle,
  Trash2,
  Pencil,
  Layers,
  Monitor,
  Eye,
  Armchair,
  MapPin,
  CheckCircle2,
  RefreshCw,
  Building2,
  UserCheck,
  UserX,
  UsersRound,
} from 'lucide-react';

interface Employee {
  id: string;
  fullName: string;
  email?: string | null;
  employeeCode: string;
  designation?: string | null;
  grade?: string | null;
  phone?: string | null;
  ext?: string | null;
  section?: string | null;
  sectionId?: string | null;
  functionName?: string | null;
  functionId?: string | null;
  reportingManager?: string | null;
  reportingTo?: string | null;
  hod?: string | null;
  remarks?: string | null;
  pcNumber?: string | null;
  officeArea?: string | null;
  subLocation?: string | null;
  departmentId: string;
  department?: {
    id: string;
    name: string;
    code?: string;
    colorHex: string;
    unitId?: string | null;
    unit?: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
  seat?: {
    id: string;
    label: string;
    floorId: string;
    pcNumber?: string | null;
    officeArea?: string | null;
    zone?: string | null;
    type?: string | null;
    department?: {
      id?: string;
      name?: string;
      code?: string;
      colorHex?: string;
    } | null;
    floor?: {
      id?: string;
      name: string;
      floorNumber?: number;
      building?: {
        id?: string;
        name: string;
        plant?: {
          id?: string;
          name: string;
          unit?: {
            id?: string;
            name: string;
          };
        };
      };
    };
  } | null;
  unit?: { id: string; name: string; code?: string };
  plant?: { id: string; name: string; code?: string };
  building?: { id: string; name: string };
  floor?: { id: string; name: string; floorNumber?: number };
  isActive: boolean;
}

interface Department {
  id: string;
  name: string;
  code?: string;
  colorHex: string;
  unitId?: string | null;
  unit?: {
    id: string;
    name: string;
    code: string;
  } | null;
  isActive?: boolean;
}

interface UnitOption {
  id: string;
  name: string;
  code?: string;
  location?: string;
}

interface BuildingOption {
  id: string;
  name: string;
  plantId?: string;
  plant?: { unitId?: string };
  isActive?: boolean;
}

interface FloorOption {
  id: string;
  name: string;
  floorNumber: number;
  buildingId: string;
  buildingName?: string;
  unitName?: string | null;
  displayName?: string;
  isActive?: boolean;
}

interface AreaOption { id: string; name: string; floorId: string; displayName?: string; isActive?: boolean; floor?: { buildingId?: string } }
interface SectionOption { id: string; name: string; departmentId: string; displayName?: string; isActive?: boolean }
interface FunctionOption { id: string; name: string; sectionId: string; displayName?: string; isActive?: boolean }

interface EmployeeDirectoryFilterOptions {
  units: UnitOption[];
  buildings: BuildingOption[];
  floors: FloorOption[];
  officeAreas: string[];
  areaOptions: AreaOption[];
  departments: Department[];
  sections: string[];
  sectionOptions: SectionOption[];
  functions: string[];
  functionOptions: FunctionOption[];
  reportingToList: string[];
  hods: string[];
  subLocations: string[];
  userScope?: {
    role: string;
    isRestricted: boolean;
    lockedUnitId: string | null;
    assignedUnitName?: string | null;
  };
}

interface SeatOption {
  id: string;
  label: string;
  type?: string;
  status?: string;
  employeeId?: string | null;
  pcNumber?: string | null;
  officeArea?: string | null;
  zone?: string | null;
  remarks?: string | null;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    code?: string;
    colorHex?: string;
  } | null;
  floor?: {
    id?: string;
    name?: string;
    floorNumber?: number;
    building?: {
      id?: string;
      name?: string;
      code?: string;
      plant?: {
        id?: string;
        name?: string;
        code?: string;
        unit?: {
          id?: string;
          name?: string;
          code?: string;
        };
      };
    };
  } | null;
}

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialFilterState = useMemo(() => readEmployeeFilterState(searchParams), []);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [units, setUnits] = useState<UnitOption[]>([]);
  const [directoryBuildings, setDirectoryBuildings] = useState<BuildingOption[]>([]);
  const [directoryFloors, setDirectoryFloors] = useState<FloorOption[]>([]);
  const [directoryAreas, setDirectoryAreas] = useState<AreaOption[]>([]);
  const [directorySections, setDirectorySections] = useState<SectionOption[]>([]);
  const [directoryFunctions, setDirectoryFunctions] = useState<FunctionOption[]>([]);
  const [managerKind, setManagerKind] = useState<CategoryKind | null>(null);
  const [search, setSearch] = useState(initialFilterState.search);
  const debouncedSearch = useDebounce(search, 300);
  const [directoryPage, setDirectoryPage] = useState(initialFilterState.page);
  const [directoryPageSize, setDirectoryPageSize] = useState(initialFilterState.pageSize);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [directorySortBy, setDirectorySortBy] = useState<EmployeeSortField>(initialFilterState.sortBy);
  const [directorySortOrder, setDirectorySortOrder] = useState<'asc' | 'desc'>(initialFilterState.sortOrder);
  // Treat the initial option request as in-flight so valid deep-link IDs are
  // not sanitized against the intentionally empty initial option set.
  const [directoryOptionsLoading, setDirectoryOptionsLoading] = useState(true);
  const [directoryOptions, setDirectoryOptions] = useState<EmployeeDirectoryFilterOptions>({
    units: [], buildings: [], floors: [], officeAreas: [], areaOptions: [], departments: [], sections: [],
    sectionOptions: [], functions: [], functionOptions: [], reportingToList: [], hods: [], subLocations: []
  });
  // Admin Industrial Directory Filters
  const [dirUnitFilter, setDirUnitFilter] = useState(initialFilterState.unitId);
  const [dirBuildingFilter, setDirBuildingFilter] = useState(initialFilterState.buildingId);
  const [dirFloorFilter, setDirFloorFilter] = useState(initialFilterState.floorId);
  const [dirDeptFilter, setDirDeptFilter] = useState(initialFilterState.departmentId);
  const [dirOfficeAreaFilter, setDirOfficeAreaFilter] = useState(initialFilterState.officeArea);
  const [dirSectionFilter, setDirSectionFilter] = useState(initialFilterState.sectionId);
  const [dirFunctionFilter, setDirFunctionFilter] = useState(initialFilterState.functionId);
  const [dirReportingToFilter, setDirReportingToFilter] = useState(initialFilterState.reportingTo);
  const [dirHodFilter, setDirHodFilter] = useState(initialFilterState.hod);
  const [dirStatusFilter, setDirStatusFilter] = useState<'ALL' | 'ASSIGNED' | 'UNASSIGNED'>(initialFilterState.seatingStatus);
  const [dirActiveFilter, setDirActiveFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>(initialFilterState.activeStatus);

  // RBAC permissions
  const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN';
  const isTechAdmin = adminUser?.role === 'TECH_ADMIN';
  const isUnitAdmin = adminUser?.role === 'UNIT_ADMIN';
  const isGlobalAdmin = isSuperAdmin || isTechAdmin;
  const canManageEmployees = isGlobalAdmin || isUnitAdmin;
  const isReadOnly = !canManageEmployees;

  const getDirectoryFilterState = (): EmployeeHierarchyFilterState => ({
    unitId: dirUnitFilter,
    buildingId: dirBuildingFilter,
    floorId: dirFloorFilter,
    officeArea: dirOfficeAreaFilter,
    departmentId: dirDeptFilter,
    sectionId: dirSectionFilter,
    functionId: dirFunctionFilter,
    reportingTo: dirReportingToFilter,
    hod: dirHodFilter,
    seatingStatus: dirStatusFilter,
    activeStatus: dirActiveFilter,
    search,
    page: directoryPage,
    pageSize: directoryPageSize,
    sortBy: directorySortBy,
    sortOrder: directorySortOrder
  });

  const applyDirectoryFilterState = (next: EmployeeHierarchyFilterState) => {
    setDirUnitFilter(next.unitId);
    setDirBuildingFilter(next.buildingId);
    setDirFloorFilter(next.floorId);
    setDirOfficeAreaFilter(next.officeArea);
    setDirDeptFilter(next.departmentId);
    setDirSectionFilter(next.sectionId);
    setDirFunctionFilter(next.functionId);
    setDirReportingToFilter(next.reportingTo);
    setDirHodFilter(next.hod);
    setDirStatusFilter(next.seatingStatus);
    setDirActiveFilter(next.activeStatus);
    setSearch(next.search);
    setDirectoryPage(next.page);
    setDirectoryPageSize(next.pageSize);
    setDirectorySortBy(next.sortBy);
    setDirectorySortOrder(next.sortOrder);
  };

  const serializedSearchParams = searchParams.toString();

  // Browser Back/Forward is a first-class state source. Rehydrate all filters
  // from the URL, including page size and sorting, without loading local data.
  useEffect(() => {
    const parsed = readEmployeeFilterState(new URLSearchParams(serializedSearchParams));
    const scoped = isUnitAdmin && adminUser?.assignedUnitId
      ? { ...parsed, unitId: adminUser.assignedUnitId }
      : parsed;
    applyDirectoryFilterState(scoped);
    // The URL is intentionally the dependency; setters are stable and this
    // effect is also what makes shared employee URLs reproducible.
  }, [serializedSearchParams, isUnitAdmin, adminUser?.assignedUnitId]);

  // Keep employee directory state shareable and aligned with hierarchy URLs.
  useEffect(() => {
    const areaIds = new Set(directoryOptions.areaOptions.map((area) => area.id));
    // Preserve an authoritative areaId while its option request is still in
    // flight; otherwise the first URL sync would downgrade it to officeArea.
    if (searchParams.get('areaId') === dirOfficeAreaFilter && dirOfficeAreaFilter !== ALL_FILTER) {
      areaIds.add(dirOfficeAreaFilter);
    }
    const next = writeEmployeeFilterState(getDirectoryFilterState(), areaIds);
    if (next.toString() !== serializedSearchParams) {
      setSearchParams(next, { replace: true });
    }
  }, [
    debouncedSearch,
    dirUnitFilter,
    dirBuildingFilter,
    dirFloorFilter,
    dirOfficeAreaFilter,
    dirDeptFilter,
    dirSectionFilter,
    dirFunctionFilter,
    dirReportingToFilter,
    dirHodFilter,
    dirStatusFilter,
    dirActiveFilter,
    directoryPage,
    directoryPageSize,
    directorySortBy,
    directorySortOrder,
    directoryOptions.areaOptions,
    serializedSearchParams,
    setSearchParams
  ]);

  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [directoryKpis, setDirectoryKpis] = useState({ total: 0, active: 0, seated: 0, unseated: 0 });
  const [toast, setToast] = useState<{ tone: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 360° Profile Drawer
  const [profileEmp, setProfileEmp] = useState<Employee | null>(null);

  // Smart Delete Confirmation Modal
  const [empToDelete, setEmpToDelete] = useState<Employee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Add / Edit Modal (Unified 2-Tab Form)
  const [modalMode, setModalMode] = useState<'ADD' | 'EDIT' | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'workstation'>('profile');
  const [editingEmpId, setEditingEmpId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formFieldErrors, setFormFieldErrors] = useState<EmployeeFormErrors>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Form Fields - Tab 1: Profile & Organization
  const [formFullName, setFormFullName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDeptId, setFormDeptId] = useState('');
  const [formDesignation, setFormDesignation] = useState('');
  const [formGrade, setFormGrade] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formExt, setFormExt] = useState('');
  const [formSection, setFormSection] = useState('');
  const [formSectionId, setFormSectionId] = useState('');
  const [formFunction, setFormFunction] = useState('');
  const [formFunctionId, setFormFunctionId] = useState('');
  const [formReportingTo, setFormReportingTo] = useState('');
  const [formHod, setFormHod] = useState('');
  const [formRemarks, setFormRemarks] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Form Fields - Tab 2: Workstation & IT Hardware
  const [formPcNumber, setFormPcNumber] = useState('');
  const [formOfficeArea, setFormOfficeArea] = useState('');
  const [formSubLocation, setFormSubLocation] = useState('');
  const [formUnitId, setFormUnitId] = useState('');
  const [formBuildingId, setFormBuildingId] = useState('');
  const [formFloorId, setFormFloorId] = useState('');
  const [formSeatId, setFormSeatId] = useState<string>('');
  const [currentAssignedSeat, setCurrentAssignedSeat] = useState<Employee['seat'] | null>(null);

  // Cascading options for seat allocation
  const [availableBuildings, setAvailableBuildings] = useState<BuildingOption[]>([]);
  const [availableFloors, setAvailableFloors] = useState<FloorOption[]>([]);
  const [modalHierarchyOptions, setModalHierarchyOptions] = useState<{
    departments: Department[];
    areaOptions: AreaOption[];
    sectionOptions: SectionOption[];
    functionOptions: FunctionOption[];
  }>({ departments: [], areaOptions: [], sectionOptions: [], functionOptions: [] });
  const [availableSeats, setAvailableSeats] = useState<SeatOption[]>([]);
  const [totalFloorSeatsCount, setTotalFloorSeatsCount] = useState(0);
  const [modalSeatSearch, setModalSeatSearch] = useState('');
  const [modalSeatAreaFilter, setModalSeatAreaFilter] = useState('ALL');
  const [modalSeatTypeFilter, setModalSeatTypeFilter] = useState('ALL');
  const [loadingSeats, setLoadingSeats] = useState(false);

  const distinctModalAreas = useMemo(() => {
    const set = new Set<string>();
    availableSeats.forEach((s) => {
      const area = s.officeArea || s.zone || 'Unspecified Area';
      set.add(area);
    });
    return Array.from(set).sort();
  }, [availableSeats]);

  const filteredModalSeats = useMemo(() => {
    return availableSeats.filter((s) => {
      if (modalSeatAreaFilter !== 'ALL' && (s.officeArea || s.zone || 'Unspecified Area') !== modalSeatAreaFilter) return false;
      if (modalSeatTypeFilter !== 'ALL' && (s.type || 'STANDARD_DESK') !== modalSeatTypeFilter) return false;
      if (modalSeatSearch.trim()) {
        const q = modalSeatSearch.toLowerCase();
        const matchLabel = s.label.toLowerCase().includes(q);
        const matchPc = s.pcNumber?.toLowerCase().includes(q);
        const matchArea = (s.officeArea || s.zone || '').toLowerCase().includes(q);
        const matchDept = s.department?.name?.toLowerCase().includes(q);
        if (!matchLabel && !matchPc && !matchArea && !matchDept) return false;
      }
      return true;
    });
  }, [availableSeats, modalSeatAreaFilter, modalSeatTypeFilter, modalSeatSearch]);

  const selectedModalSeatObj = useMemo(() => {
    return availableSeats.find((s) => s.id === formSeatId) || (currentAssignedSeat && currentAssignedSeat.id === formSeatId ? currentAssignedSeat : null);
  }, [availableSeats, formSeatId, currentAssignedSeat]);

  const formatSeatPath = (seat: NonNullable<Employee['seat']>, emp?: Employee) => {
    const parts: string[] = [];
    const b = seat.floor?.building;
    const u = b?.plant?.unit;
    const uName = u?.name || (emp as any)?.unit?.name;
    const bName = b?.name || (emp as any)?.building?.name;
    const fName = seat.floor?.name || (emp as any)?.floor?.name;
    if (uName) parts.push(uName);
    if (bName) parts.push(bName);
    if (fName) parts.push(fName);
    parts.push(seat.label);
    return parts.join(' > ');
  };

  const latestRequestIdRef = useRef(0);
  const directoryOptionsAbortRef = useRef<AbortController | null>(null);
  const directoryDataAbortRef = useRef<AbortController | null>(null);

  const selectedAreaIsMaster = isAuthoritativeAreaIdFilter(
    dirOfficeAreaFilter,
    searchParams,
    new Set(directoryOptions.areaOptions.map((area) => area.id)),
  );

  const buildDirectoryQuery = () => {
    const params = new URLSearchParams({ page: String(directoryPage), pageSize: String(directoryPageSize) });
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (dirUnitFilter !== ALL_FILTER) params.set('unitId', dirUnitFilter);
    if (dirBuildingFilter !== ALL_FILTER) params.set('buildingId', dirBuildingFilter);
    if (dirFloorFilter !== ALL_FILTER) params.set('floorId', dirFloorFilter);
    if (dirOfficeAreaFilter !== ALL_FILTER) params.set(selectedAreaIsMaster ? 'areaId' : 'officeArea', dirOfficeAreaFilter);
    if (dirDeptFilter !== ALL_FILTER) params.set('departmentId', dirDeptFilter);
    if (dirSectionFilter !== ALL_FILTER) params.set('sectionId', dirSectionFilter);
    if (dirFunctionFilter !== ALL_FILTER) params.set('functionId', dirFunctionFilter);
    if (dirReportingToFilter !== ALL_FILTER) params.set('reportingTo', dirReportingToFilter);
    if (dirHodFilter !== ALL_FILTER) params.set('hod', dirHodFilter);
    if (dirStatusFilter !== ALL_FILTER) params.set('status', dirStatusFilter === 'ASSIGNED' ? 'assigned' : 'unassigned');
    if (dirActiveFilter !== ALL_FILTER) params.set('isActive', dirActiveFilter === 'ACTIVE' ? 'active' : 'inactive');
    params.set('sortBy', directorySortBy);
    params.set('sortOrder', directorySortOrder);
    return params;
  };

  const loadEmployeePage = async (signal?: AbortSignal) => {
    const reqId = ++latestRequestIdRef.current;
    const empRes = await apiRequest<any>(`/employees?${buildDirectoryQuery().toString()}`, { signal });
    if (reqId !== latestRequestIdRef.current) return;
    const empList = empRes?.employees || empRes?.data || (Array.isArray(empRes) ? empRes : []);
    setEmployees(empList);
    setTotalEmployees(Number(empRes?.total ?? empList.length));
  };

  const loadDirectoryKpis = async (signal?: AbortSignal) => {
    const unitQuery = dirUnitFilter !== 'ALL' ? `&unitId=${encodeURIComponent(dirUnitFilter)}` : '';
    const readTotal = async (filters = '') => {
      const response = await apiRequest<{ total?: number }>(`/employees?limit=1${unitQuery}${filters}`, { signal });
      return Number(response?.total || 0);
    };
    const [total, active, seated, unseated] = await Promise.all([
      readTotal(),
      readTotal('&isActive=active'),
      readTotal('&status=assigned'),
      readTotal('&status=unassigned'),
    ]);
    setDirectoryKpis({ total, active, seated, unseated });
  };

  const loadDirectoryOptions = useCallback(async () => {
    directoryOptionsAbortRef.current?.abort();
    const controller = new AbortController();
    directoryOptionsAbortRef.current = controller;
    setDirectoryOptionsLoading(true);

    const params = new URLSearchParams();
    const activeUnitId = (isUnitAdmin && adminUser?.assignedUnitId)
      ? adminUser.assignedUnitId
      : (dirUnitFilter !== ALL_FILTER ? dirUnitFilter : '');
    if (activeUnitId) params.set('unitId', activeUnitId);
    if (dirBuildingFilter !== ALL_FILTER) params.set('buildingId', dirBuildingFilter);
    if (dirFloorFilter !== ALL_FILTER) params.set('floorId', dirFloorFilter);
    if (dirOfficeAreaFilter !== ALL_FILTER) params.set(selectedAreaIsMaster ? 'areaId' : 'officeArea', dirOfficeAreaFilter);
    if (dirDeptFilter !== ALL_FILTER) params.set('departmentId', dirDeptFilter);
    if (dirSectionFilter !== ALL_FILTER) params.set('sectionId', dirSectionFilter);

    try {
      const options = await apiRequest<EmployeeDirectoryFilterOptions>(`/employees/filter-options?${params.toString()}`, { signal: controller.signal });
      if (!controller.signal.aborted) setDirectoryOptions(options);
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        console.error('Failed to load employee hierarchy options', err);
        setLoadError('The employee hierarchy filters could not be refreshed.');
      }
    } finally {
      if (directoryOptionsAbortRef.current === controller) {
        setDirectoryOptionsLoading(false);
      }
    }
  }, [dirUnitFilter, dirBuildingFilter, dirFloorFilter, dirOfficeAreaFilter, dirDeptFilter, dirSectionFilter, selectedAreaIsMaster, isUnitAdmin, adminUser?.assignedUnitId]);

  useEffect(() => {
    void loadDirectoryOptions();
  }, [loadDirectoryOptions]);

  const loadCategoryOptions = async () => {
    const [buildingsRes, floorsRes, areasRes, sectionsRes, functionsRes] = await Promise.all([
      apiRequest<BuildingOption[]>('/buildings?includeInactive=true').catch(() => []),
      apiRequest<FloorOption[]>('/floors?includeInactive=true').catch(() => []),
      apiRequest<AreaOption[]>('/areas?includeInactive=true').catch(() => []),
      apiRequest<SectionOption[]>('/sections?includeInactive=true').catch(() => []),
      apiRequest<FunctionOption[]>('/functions?includeInactive=true').catch(() => []),
    ]);
    setDirectoryBuildings(buildingsRes);
    setDirectoryFloors(floorsRes);
    setDirectoryAreas(areasRes);
    setDirectorySections(sectionsRes);
    setDirectoryFunctions(functionsRes);
  };

  const loadMasterOptions = async () => {
    try {
      const [deptRes, unitRes] = await Promise.all([
        apiRequest<Department[]>('/departments').catch(() => []),
        apiRequest<UnitOption[]>('/units').catch(() => []),
      ]);
      await loadCategoryOptions();
      if (Array.isArray(deptRes) && deptRes.length > 0) setDepartments(deptRes);
      if (Array.isArray(unitRes) && unitRes.length > 0) setUnits(unitRes);
    } catch (err) {
      console.error('Failed to load master directory metadata', err);
    }
  };

  useEffect(() => {
    loadMasterOptions();
  }, []);

  const loadData = async () => {
    directoryDataAbortRef.current?.abort();
    const controller = new AbortController();
    directoryDataAbortRef.current = controller;
    setLoading(true);
    setLoadError(null);
    setEmployees([]);
    try {
      await Promise.all([loadEmployeePage(controller.signal), loadDirectoryKpis(controller.signal)]);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      console.error('Failed to load employee directory', err);
      if (directoryDataAbortRef.current === controller) setLoadError('The employee directory could not be refreshed.');
    } finally {
      if (directoryDataAbortRef.current === controller) setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    return () => directoryDataAbortRef.current?.abort();
  }, [directoryPage, debouncedSearch, dirUnitFilter, dirBuildingFilter, dirFloorFilter, dirDeptFilter, dirOfficeAreaFilter, dirSectionFilter, dirFunctionFilter, dirReportingToFilter, dirHodFilter, dirStatusFilter, dirActiveFilter, directorySortBy, directorySortOrder, directoryPageSize]);

  // Employee creation/editing consumes the same cascading hierarchy endpoint
  // as the workstation page. This keeps master IDs and RBAC scope identical.
  useEffect(() => {
    if (!formUnitId) {
      setAvailableBuildings([]);
      setAvailableFloors([]);
      setModalHierarchyOptions({ departments: [], areaOptions: [], sectionOptions: [], functionOptions: [] });
      setAvailableSeats([]);
      return;
    }
    let cancelled = false;
    fetchWorkstationFilterOptions({
      unitId: formUnitId,
      buildingId: formBuildingId || undefined,
      floorId: formFloorId || undefined,
      departmentId: formDeptId || undefined,
      section: formSection || undefined
    })
      .then((options) => {
        if (cancelled) return;
        setAvailableBuildings((options.buildings || []) as BuildingOption[]);
        setAvailableFloors((options.floors || []) as FloorOption[]);
        setModalHierarchyOptions({
          departments: (options.departments || []) as Department[],
          areaOptions: (options.areaOptions || []) as AreaOption[],
          sectionOptions: (options.sectionOptions || []) as SectionOption[],
          functionOptions: (options.functionOptions || []) as FunctionOption[]
        });
      })
      .catch((err) => console.error('Failed to load employee hierarchy options', err));
    return () => { cancelled = true; };
  }, [formUnitId, formBuildingId, formFloorId, formDeptId, formSection]);

  // When Floor changes in Modal -> load available Seats
  useEffect(() => {
    setModalSeatSearch('');
    setModalSeatAreaFilter('ALL');
    setModalSeatTypeFilter('ALL');
    if (!formFloorId) {
      setAvailableSeats([]);
      setTotalFloorSeatsCount(0);
      return;
    }
    setLoadingSeats(true);
    apiRequest<SeatOption[]>(`/seats?floorId=${formFloorId}`)
      .then((seats) => {
        setTotalFloorSeatsCount(seats?.length || 0);
        // Show seats that are either vacant or already held by this employee
        const valid = (seats || []).filter(
          (s) => (!s.employeeId && s.status === 'AVAILABLE') || (currentAssignedSeat && s.id === currentAssignedSeat.id)
        );
        setAvailableSeats(valid);
      })
      .catch((err) => console.error('Failed to load seats', err))
      .finally(() => setLoadingSeats(false));
  }, [formFloorId, currentAssignedSeat]);

  // Open Add Modal
  const handleOpenAdd = () => {
    setModalMode('ADD');
    setActiveTab('profile');
    setEditingEmpId(null);
    setFormError(null);
    setFormFieldErrors({});

    // Initial values
    setFormFullName('');
    setFormEmail('');
    setFormCode('');
    setFormDeptId(departments[0]?.id || '');
    setFormDesignation('');
    setFormGrade('');
    setFormPhone('');
    setFormExt('');
    setFormSection('');
    setFormSectionId('');
    setFormFunction('');
    setFormFunctionId('');
    setFormReportingTo('');
    setFormHod('');
    setFormRemarks('');
    setFormIsActive(true);
    setFormPcNumber('');
    setFormOfficeArea('');
    setFormSubLocation('');

    // Pre-select unit if Unit Admin or HOD
    const defaultUnitId = (!isGlobalAdmin && adminUser?.assignedUnitId) ? adminUser.assignedUnitId : (units[0]?.id || '');
    setFormUnitId(defaultUnitId);
    const initialDepts = departments.filter((d) => !defaultUnitId || d.unitId === defaultUnitId);
    setFormDeptId(initialDepts[0]?.id || '');
    setFormBuildingId('');
    setFormFloorId('');
    setFormSeatId('');
    setCurrentAssignedSeat(null);
  };

  // Open Edit Modal
  const handleOpenEdit = (emp: Employee) => {
    setModalMode('EDIT');
    setActiveTab('profile');
    setEditingEmpId(emp.id);
    setFormError(null);
    setFormFieldErrors({});

    setFormFullName(emp.fullName || '');
    setFormEmail(emp.email || '');
    setFormCode(emp.employeeCode || '');
    setFormDeptId(emp.departmentId || (departments[0]?.id || ''));
    setFormDesignation(emp.designation || '');
    setFormGrade(emp.grade || '');
    setFormPhone(emp.phone || '');
    setFormExt(emp.ext || '');
    setFormSection(emp.section || '');
    setFormSectionId(emp.sectionId || directorySections.find((item) => item.departmentId === emp.departmentId && item.name.toLowerCase() === (emp.section || '').toLowerCase())?.id || '');
    setFormFunction(emp.functionName || '');
    setFormFunctionId(emp.functionId || directoryFunctions.find((item) => item.name.toLowerCase() === (emp.functionName || '').toLowerCase())?.id || '');
    setFormReportingTo(emp.reportingManager || emp.reportingTo || '');
    setFormHod(emp.hod || '');
    setFormRemarks(emp.remarks || '');
    setFormIsActive(emp.isActive !== undefined ? emp.isActive : true);
    setFormPcNumber(emp.pcNumber || emp.seat?.pcNumber || '');
    setFormOfficeArea(emp.officeArea || '');
    setFormSubLocation(emp.subLocation || '');

    setCurrentAssignedSeat(emp.seat || null);
    if (emp.seat) {
      setFormSeatId(emp.seat.id);
      // Pre-populate unit/building/floor if seat exists
      const unitObj = emp.seat.floor?.building?.plant?.unit;
      const flrObj = emp.seat.floor;

      if (unitObj?.id) setFormUnitId(unitObj.id);
      else if (!isGlobalAdmin && adminUser?.assignedUnitId) setFormUnitId(adminUser.assignedUnitId);

      const buildingObj = emp.seat.floor?.building;
      if (buildingObj?.id) setFormBuildingId(buildingObj.id);
      if (flrObj?.id) setFormFloorId(flrObj.id);
    } else {
      setFormSeatId('');
      setFormBuildingId('');
      setFormFloorId('');
      const defaultUnitId = (!isGlobalAdmin && adminUser?.assignedUnitId) ? adminUser.assignedUnitId : (emp.department?.unitId || units[0]?.id || '');
      setFormUnitId(defaultUnitId);
    }
  };

  const handleAssignSeat = (emp: Employee) => {
    setProfileEmp(null);
    handleOpenEdit(emp);
    setActiveTab('workstation');
  };

  const handleStartTransfer = (emp: Employee) => {
    setProfileEmp(null);
    navigate(`/transfer-requests?employeeId=${encodeURIComponent(emp.id)}`);
  };

  // Submit Add / Edit Form
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validateEmployeeForm({
      fullName: formFullName,
      employeeCode: formCode,
      email: formEmail,
      phone: formPhone,
      ext: formExt,
      reportingTo: formReportingTo,
      hod: formHod,
      unitId: formUnitId,
      departmentId: formDeptId,
      sectionId: formSectionId,
      functionId: formFunctionId,
      seatId: formSeatId,
    }, {
      unitIds: new Set(units.map((unit) => unit.id)),
      departmentIds: new Set(modalDepartments.map((department) => department.id)),
      sectionIds: new Set(modalSections.map((section) => section.id)),
      functionIds: new Set(modalFunctions.map((fn) => fn.id)),
      availableSeatIds: new Set([
        ...availableSeats.map((seat) => seat.id),
        ...(currentAssignedSeat?.id ? [currentAssignedSeat.id] : []),
      ]),
      validReportingManagers: distinctDirReportingTo.length > 0 ? new Set(distinctDirReportingTo) : undefined,
      validHods: distinctDirHods.length > 0 ? new Set(distinctDirHods) : undefined,
    });
    setFormFieldErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setFormError(validationErrors.form || 'Please correct the highlighted fields.');
      const firstInvalid = (['fullName', 'employeeCode', 'email', 'phone', 'ext', 'reportingTo', 'hod', 'unitId', 'departmentId', 'sectionId', 'functionId', 'seatId'] as EmployeeFormField[])
        .find((field) => validationErrors[field]);
      if (firstInvalid) {
        window.setTimeout(() => document.querySelector<HTMLElement>(`[name="employee-${firstInvalid}"]`)?.focus(), 0);
      }
      return;
    }

    setFormError(null);
    setFormSubmitting(true);

    const payload: any = {
      fullName: formFullName.trim(),
      email: formEmail.trim() || null,
      employeeCode: formCode.trim().toUpperCase(),
      unitId: formUnitId,
      buildingId: formBuildingId || undefined,
      floorId: formFloorId || undefined,
      areaId: modalAreas.find((area) => area.name.trim().toLowerCase() === formOfficeArea.trim().toLowerCase())?.id || undefined,
      departmentId: formDeptId,
      designation: formDesignation.trim() || null,
      grade: formGrade.trim() || null,
      phone: formPhone.trim() || null,
      ext: formExt.trim() || null,
      section: formSection.trim() || null,
      sectionId: formSectionId || null,
      functionName: formFunction.trim() || null,
      functionId: formFunctionId || null,
      reportingManager: formReportingTo.trim() || null,
      reportingTo: formReportingTo.trim() || null,
      hod: formHod.trim() || null,
      remarks: formRemarks.trim() || null,
      pcNumber: formPcNumber.trim() || null,
      officeArea: formOfficeArea.trim() || null,
      subLocation: formSubLocation.trim() || null,
      isActive: formIsActive,
      seatId: formSeatId ? formSeatId : null,
    };

    try {
      if (modalMode === 'ADD') {
        await apiRequest('/employees', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } else if (modalMode === 'EDIT' && editingEmpId) {
        await apiRequest(`/employees/${editingEmpId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      }
      setModalMode(null);
      await loadData();
      setToast({ tone: 'success', message: modalMode === 'ADD' ? 'Employee created successfully.' : 'Employee profile updated.' });
    } catch (err: any) {
      const mappedErrors = mapEmployeeApiError(err);
      setFormFieldErrors(mappedErrors);
      setFormError(mappedErrors.form || 'Please correct the highlighted fields.');
      setToast({ tone: 'error', message: mappedErrors.form || Object.values(mappedErrors)[0] || 'Employee save failed.' });
    } finally {
      setFormSubmitting(false);
    }
  };

  // Release Current Seat inside Edit Modal
  const handleReleaseCurrentDesk = () => {
    setFormSeatId('');
    setCurrentAssignedSeat(null);
  };

  // Clear PC Number inside Modal
  const handleClearPcNumber = () => {
    setFormPcNumber('');
  };

  // Execute Smart Delete
  const handleConfirmDelete = async () => {
    if (!empToDelete) return;
    setIsDeleting(true);
    try {
      await apiRequest(`/employees/${empToDelete.id}`, {
        method: 'DELETE',
      });
      setEmpToDelete(null);
      if (profileEmp?.id === empToDelete.id) {
        setProfileEmp(null);
      }
      await loadData();
      setToast({ tone: 'success', message: 'Employee deactivated and workstation released.' });
    } catch (err: any) {
      setToast({ tone: 'error', message: err.message || 'Employee deactivation failed.' });
    } finally {
      setIsDeleting(false);
    }
  };

  // Office / Seating Areas for Add/Edit Modal Datalist
  const availableOfficeAreas = useMemo(() => {
    const set = new Set<string>();
    employees.forEach((e) => {
      if (e.officeArea) set.add(e.officeArea.trim());
      if (e.seat?.officeArea) set.add(e.seat.officeArea.trim());
    });
    return Array.from(set).sort();
  }, [employees]);

  // The employee filter option lists come from the same authoritative
  // hierarchy endpoint contract as the workstation directory. No client-side
  // employee filtering is performed; these values only drive ID-based queries.
  const distinctDirReportingTo = directoryOptions.reportingToList;
  const distinctDirHods = directoryOptions.hods;

  // Keep an active incompatible selection readable while its intersection is empty.
  const displayDirectoryOptions = {
    ...directoryOptions,
    areaOptions: [...directoryOptions.areaOptions, ...directoryAreas.filter((item) =>
      item.id === dirOfficeAreaFilter && !directoryOptions.areaOptions.some((option) => option.id === item.id))],
    departments: [...directoryOptions.departments, ...departments.filter((item) =>
      item.id === dirDeptFilter && !directoryOptions.departments.some((option) => option.id === item.id))],
    sectionOptions: [...directoryOptions.sectionOptions, ...directorySections.filter((item) =>
      item.id === dirSectionFilter && !directoryOptions.sectionOptions.some((option) => option.id === item.id))],
    functionOptions: [...directoryOptions.functionOptions, ...directoryFunctions.filter((item) =>
      item.id === dirFunctionFilter && !directoryOptions.functionOptions.some((option) => option.id === item.id))]
  };

  // Scoped Department Options for Add/Edit Modal
  const modalDepartments = useMemo(() => {
    const source = modalHierarchyOptions.departments.length > 0 ? modalHierarchyOptions.departments : departments;
    if (!formUnitId) return source;
    return source.filter((d) => !d.unitId || d.unitId === formUnitId);
  }, [departments, formUnitId, modalHierarchyOptions.departments]);

  const modalSections = useMemo(() => {
    const source = modalHierarchyOptions.sectionOptions.length > 0 ? modalHierarchyOptions.sectionOptions : directorySections;
    return source.filter((section) => section.isActive !== false && section.departmentId === formDeptId);
  }, [directorySections, formDeptId, modalHierarchyOptions.sectionOptions]);
  const modalFunctions = useMemo(() => {
    const source = modalHierarchyOptions.functionOptions.length > 0 ? modalHierarchyOptions.functionOptions : directoryFunctions;
    return source.filter((fn) => fn.isActive !== false && fn.sectionId === formSectionId);
  }, [directoryFunctions, formSectionId, modalHierarchyOptions.functionOptions]);
  const modalAreas = useMemo(() => {
    const source = modalHierarchyOptions.areaOptions.length > 0 ? modalHierarchyOptions.areaOptions : directoryAreas;
    return source.filter((area) => area.isActive !== false && (!formFloorId || area.floorId === formFloorId));
  }, [directoryAreas, formFloorId, modalHierarchyOptions.areaOptions]);

  // Keep modal department synced if formUnitId changes
  useEffect(() => {
    if (modalMode && formUnitId) {
      const source = modalHierarchyOptions.departments.length > 0 ? modalHierarchyOptions.departments : departments;
      const depts = source.filter((d) => !d.unitId || d.unitId === formUnitId);
      if (depts.length > 0 && !depts.some((d) => d.id === formDeptId)) {
        setFormDeptId(depts[0].id);
      }
    }
  }, [formUnitId, departments, modalHierarchyOptions.departments, modalMode, formDeptId]);

  const resetAllFilters = () => {
    applyDirectoryFilterState(clearEmployeeFilters(getDirectoryFilterState(), isUnitAdmin ? adminUser?.assignedUnitId : null));
  };

  // Filtered employees list rendered directly from server-side query results
  const filteredEmployees = employees;

  const totalDirectoryPages = Math.max(1, Math.ceil(totalEmployees / directoryPageSize));


  const selectedBuildingId = dirBuildingFilter !== ALL_FILTER ? dirBuildingFilter : undefined;
  const selectedFloorId = dirFloorFilter !== ALL_FILTER ? dirFloorFilter : undefined;
  const selectedDepartmentId = dirDeptFilter !== ALL_FILTER ? dirDeptFilter : undefined;
  const selectedSectionId = dirSectionFilter !== ALL_FILTER ? dirSectionFilter : undefined;

  const managerConfig = managerKind ? (() => {
    if (managerKind === 'building') return { parentId: dirUnitFilter === ALL_FILTER ? undefined : dirUnitFilter, parentOptions: units, parentLabel: 'Unit' };
    if (managerKind === 'floor') return {
      parentId: selectedBuildingId,
      parentOptions: directoryBuildings.filter((item) => dirUnitFilter === ALL_FILTER || item.plant?.unitId === dirUnitFilter),
      parentLabel: 'Building'
    };
    if (managerKind === 'area') return {
      parentId: selectedFloorId,
      parentOptions: directoryFloors.filter((item) => !selectedBuildingId || item.buildingId === selectedBuildingId),
      parentLabel: 'Floor'
    };
    if (managerKind === 'department') return { parentId: dirUnitFilter === ALL_FILTER ? undefined : dirUnitFilter, parentOptions: units, parentLabel: 'Unit' };
    if (managerKind === 'section') return {
      parentId: selectedDepartmentId,
      parentOptions: departments.filter((item) => dirUnitFilter === ALL_FILTER || !item.unitId || item.unitId === dirUnitFilter),
      parentLabel: 'Department'
    };
    return {
      parentId: selectedSectionId,
      parentOptions: directorySections.filter((item) => !selectedDepartmentId || item.departmentId === selectedDepartmentId),
      parentLabel: 'Section'
    };
  })() : null;

  const scopeLabel = isGlobalAdmin
    ? (dirUnitFilter === ALL_FILTER ? 'All authorized Units' : units.find((unit) => unit.id === dirUnitFilter)?.name || 'Selected Unit')
    : units.find((unit) => unit.id === adminUser?.assignedUnitId)?.name || 'Assigned Unit';

  return (
    <div className="ios-page employees-v3 max-w-[1700px] mx-auto px-4 sm:px-6 py-6 space-y-5" data-testid="employee-directory">
      {/* Page Header */}
      <header className="employees-v3-heading" aria-labelledby="employee-directory-title">
        <div>
          <div className="employees-v3-kicker"><UsersRound className="h-4 w-4" /> People operations</div>
          <h1 id="employee-directory-title" className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">Employee Directory</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Manage authorized employee records, workplace assignments and organizational context from one directory.</p>
        </div>
        <div className="employees-v3-header-actions">
          <div className="employees-v3-scope"><Building2 className="h-4 w-4 text-blue-600" /><span>{adminUser?.role || 'Administrator'}</span><span className="text-slate-300">·</span><span>{scopeLabel}</span></div>
          <button type="button" aria-label="Refresh employee directory" onClick={() => { void loadData(); setToast({ tone: 'success', message: 'Employee directory refresh started.' }); }} className="employees-v3-secondary-action"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button>
          {!isReadOnly && <button type="button" onClick={handleOpenAdd} className="employees-v3-primary-action"><UserPlus className="h-4 w-4" /> Add employee</button>}
        </div>
      </header>

      <section className="employees-v3-kpi-grid" aria-label="Employee directory metrics">
        {[
          { label: 'Total employees', value: directoryKpis.total, detail: 'In authorized scope', icon: UsersRound, tone: 'blue' },
          { label: 'Active employees', value: directoryKpis.active, detail: 'Current workforce', icon: UserCheck, tone: 'emerald' },
          { label: 'Seated employees', value: directoryKpis.seated, detail: 'Assigned workstations', icon: Armchair, tone: 'blue' },
          { label: 'Unseated employees', value: directoryKpis.unseated, detail: 'Ready for allocation', icon: UserX, tone: 'amber' },
        ].map((card) => { const Icon = card.icon; return <article key={card.label} className={`employees-v3-kpi employees-v3-kpi-${card.tone}`} data-testid="employee-kpi"><div><p>{card.label}</p><strong>{card.value.toLocaleString()}</strong><span>{card.detail}</span></div><Icon className="h-5 w-5" /></article>; })}
      </section>

      {loadError && <div className="employees-v3-error" role="alert"><span>{loadError}</span><button type="button" onClick={() => void loadData()}>Retry</button></div>}
      {toast && <div className={`employees-v3-toast employees-v3-toast-${toast.tone}`} role="status">{toast.message}</div>}

      {/* Admin Industrial Seating & HR Filters Terminal */}
      <EmployeeFilters
        filters={{
          unitId: dirUnitFilter === ALL_FILTER ? undefined : dirUnitFilter,
          buildingId: dirBuildingFilter === ALL_FILTER ? undefined : dirBuildingFilter,
          floorId: dirFloorFilter === ALL_FILTER ? undefined : dirFloorFilter,
          officeArea: dirOfficeAreaFilter === ALL_FILTER ? undefined : dirOfficeAreaFilter,
          departmentId: dirDeptFilter === ALL_FILTER ? undefined : dirDeptFilter,
          sectionId: dirSectionFilter === ALL_FILTER ? undefined : dirSectionFilter,
          functionId: dirFunctionFilter === ALL_FILTER ? undefined : dirFunctionFilter,
          reportingTo: dirReportingToFilter === ALL_FILTER ? undefined : dirReportingToFilter,
          hod: dirHodFilter === ALL_FILTER ? undefined : dirHodFilter,
          seatingStatus: dirStatusFilter,
          activeStatus: dirActiveFilter,
          search,
          sortBy: directorySortBy,
          sortOrder: directorySortOrder,
          page: directoryPage,
          pageSize: directoryPageSize,
        }}
        options={displayDirectoryOptions}
        loadingOptions={directoryOptionsLoading}
        onFilterChange={(newFilters) => {
          if (Object.prototype.hasOwnProperty.call(newFilters, 'unitId')) {
            setDirUnitFilter(newFilters.unitId || ALL_FILTER);
            setDirBuildingFilter(ALL_FILTER);
            setDirFloorFilter(ALL_FILTER);
            setDirOfficeAreaFilter(ALL_FILTER);
            setDirDeptFilter(ALL_FILTER);
            setDirSectionFilter(ALL_FILTER);
            setDirFunctionFilter(ALL_FILTER);
            setDirectoryPage(1);
          }
          if (Object.prototype.hasOwnProperty.call(newFilters, 'buildingId')) {
            setDirBuildingFilter(newFilters.buildingId || ALL_FILTER);
            setDirFloorFilter(ALL_FILTER);
            setDirOfficeAreaFilter(ALL_FILTER);
            setDirectoryPage(1);
          }
          if (Object.prototype.hasOwnProperty.call(newFilters, 'floorId')) {
            setDirFloorFilter(newFilters.floorId || ALL_FILTER);
            setDirOfficeAreaFilter(ALL_FILTER);
            setDirectoryPage(1);
          }
          if (Object.prototype.hasOwnProperty.call(newFilters, 'officeArea')) {
            setDirOfficeAreaFilter(newFilters.officeArea || ALL_FILTER);
            setDirectoryPage(1);
          }
          if (Object.prototype.hasOwnProperty.call(newFilters, 'departmentId')) {
            setDirDeptFilter(newFilters.departmentId || ALL_FILTER);
            setDirSectionFilter(ALL_FILTER);
            setDirFunctionFilter(ALL_FILTER);
            setDirectoryPage(1);
          }
          if (Object.prototype.hasOwnProperty.call(newFilters, 'sectionId')) {
            setDirSectionFilter(newFilters.sectionId || ALL_FILTER);
            setDirFunctionFilter(ALL_FILTER);
            setDirectoryPage(1);
          }
          if (Object.prototype.hasOwnProperty.call(newFilters, 'functionId')) {
            setDirFunctionFilter(newFilters.functionId || ALL_FILTER);
            setDirectoryPage(1);
          }
          if (Object.prototype.hasOwnProperty.call(newFilters, 'reportingTo')) {
            setDirReportingToFilter(newFilters.reportingTo || ALL_FILTER);
            setDirectoryPage(1);
          }
          if (Object.prototype.hasOwnProperty.call(newFilters, 'hod')) {
            setDirHodFilter(newFilters.hod || ALL_FILTER);
            setDirectoryPage(1);
          }
          if (newFilters.seatingStatus !== undefined) {
            setDirStatusFilter(newFilters.seatingStatus);
            setDirectoryPage(1);
          }
          if (newFilters.activeStatus !== undefined) {
            setDirActiveFilter(newFilters.activeStatus);
            setDirectoryPage(1);
          }
          if (newFilters.search !== undefined) {
            setSearch(newFilters.search);
            setDirectoryPage(1);
          }
          if (newFilters.sortBy !== undefined) {
            setDirectorySortBy(newFilters.sortBy);
            setDirectoryPage(1);
          }
          if (newFilters.sortOrder !== undefined) {
            setDirectorySortOrder(newFilters.sortOrder);
            setDirectoryPage(1);
          }
          if (newFilters.page !== undefined) {
            setDirectoryPage(newFilters.page);
          }
          if (newFilters.pageSize !== undefined) {
            setDirectoryPageSize(newFilters.pageSize);
            setDirectoryPage(1);
          }
        }}
        onResetAll={resetAllFilters}
        totalCount={totalEmployees}
        loadedCount={filteredEmployees.length}
        page={directoryPage}
        totalPages={totalDirectoryPages}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        pageSize={directoryPageSize}
        onPageSizeChange={(newSize) => {
          setDirectoryPageSize(newSize);
          setDirectoryPage(1);
        }}
      />

      {/* Employee List Presentation: R4 Matrix Cards vs Table */}
      {viewMode === 'cards' ? (
        <div className="employees-v3-card-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredEmployees.length > 0 ? (
            filteredEmployees.map((emp) => {
              const ext = emp.ext || emp.phone || '—';
              const reportingManager = emp.reportingManager || emp.reportingTo || '—';
              const hod = emp.hod || '—';
              const section = emp.section || '—';
              const functionName = emp.functionName || '—';
              const grade = emp.grade || '—';

              return (
                <div
                  key={emp.id}
                  className="bg-white rounded-lg border border-slate-200/90 shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all p-3.5 flex flex-col justify-between space-y-3"
                >
                  {/* R4 Header / Title Area: [Emp ID] | [Emp Name] | [Emp Email] | Ext: [ext] */}
                  <div className="pb-2.5 border-b border-slate-100 flex items-start justify-between gap-2">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                          {emp.employeeCode}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span
                          className="font-bold text-slate-900 text-xs truncate hover:text-orange-600 cursor-pointer"
                          onClick={() => setProfileEmp(emp)}
                          title="Click to view dossier"
                        >
                          {emp.fullName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono truncate">
                        <span className="truncate" title={emp.email || ''}>
                          {emp.email || '—'}
                        </span>
                        <span className="text-slate-300">|</span>
                        <span className="text-slate-700 font-medium">Ext: {ext}</span>
                      </div>
                    </div>

                    {/* Status Badge & Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                          emp.isActive !== false
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {emp.isActive !== false ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        type="button"
                        onClick={() => setProfileEmp(emp)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-50 transition-colors"
                        title="View 360° dossier"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      {!isReadOnly && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(emp)}
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-50 transition-colors"
                            title={`Edit ${emp.fullName}`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmpToDelete(emp)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                            title={`Delete ${emp.fullName}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* R4 Body / Details Area (Clean 2-Column Grid) */}
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    {/* Column 1 */}
                    <div className="space-y-1.5 border-r border-slate-100 pr-2">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                          Department
                        </span>
                        <span className="font-semibold text-slate-800 text-[11px] truncate block">
                          {emp.department?.name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                          Section
                        </span>
                        <span className="text-slate-700 text-[11px] truncate block">
                          {section}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                          Function
                        </span>
                        <span className="text-slate-700 text-[11px] truncate block">
                          {functionName}
                        </span>
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-1.5 pl-1">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                          Grade
                        </span>
                        <span className="font-mono font-medium text-slate-800 text-[11px] block">
                          {grade}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                          Reporting Manager
                        </span>
                        <span className="text-slate-700 text-[11px] truncate block">
                          {reportingManager}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider">
                          Department Head (HOD)
                        </span>
                        <span className="text-slate-700 text-[11px] truncate block">
                          {hod}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Footer: Physical Workstation & Hardware PC Number */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1 font-mono text-slate-600 truncate max-w-[65%]">
                      <Armchair className="w-3 h-3 text-slate-400 shrink-0" />
                      {emp.seat ? (
                        <span
                          className="text-emerald-700 font-semibold truncate"
                          title={formatSeatPath(emp.seat, emp)}
                        >
                          {emp.seat.label} ({emp.seat.floor?.name || emp.floor?.name || 'Floor'})
                        </span>
                      ) : (
                        <span className="text-slate-400">Unassigned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 font-mono text-slate-600">
                      <Monitor className="w-3 h-3 text-blue-500 shrink-0" />
                      <span className="font-semibold text-slate-700">
                        {emp.pcNumber || emp.seat?.pcNumber || '—'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full">
              {loading ? (
                <SkeletonCards count={6} />
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 shadow-2xs">
                  <EmptyState
                    title="No employees found"
                    description="No employees match your current filter query. Try adjusting your parameters or resetting filters."
                    actionText="Reset All Filters"
                    onAction={resetAllFilters}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Table View */
        <div className="employees-v3-table-shell bg-white rounded-lg border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-100 text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50/95 text-slate-600 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-200">
                <tr>
                  <th className="px-3.5 py-2.5 text-left font-mono whitespace-nowrap">Emp Code</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Location</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Sub-location / Floor</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Office / Area</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">WS NO</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Desktop No</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">E. Name</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Department</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Section</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Function</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Reporting Manager</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">HOD</th>
                  <th className="px-3.5 py-2.5 text-left whitespace-nowrap">Active or not</th>
                  <th className="px-3.5 py-2.5 text-right whitespace-nowrap sticky right-0 bg-slate-50">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 tabular-nums">
                {filteredEmployees.length > 0 ? (
                  filteredEmployees.map((emp) => {
                    const locationName = emp.unit?.name || emp.seat?.floor?.building?.plant?.unit?.name || '—';
                    const officeArea = emp.officeArea?.trim() || emp.seat?.officeArea?.trim() || [
                      emp.building?.name || emp.seat?.floor?.building?.name,
                      emp.floor?.name || emp.seat?.floor?.name
                    ].filter(Boolean).join(' - ') || '—';
                    const reportingManager = emp.reportingManager || emp.reportingTo || '—';
                    const ext = emp.ext || emp.phone || '—';

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/80 transition-colors h-11 group">
                        {/* 1. Emp Code */}
                        <td className="px-3.5 py-2 font-mono text-[11px] font-semibold text-slate-800 whitespace-nowrap">
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            {emp.employeeCode}
                          </span>
                        </td>

                        {/* 2. Location (Unit) */}
                        <td className="px-3.5 py-2 text-xs text-slate-700 whitespace-nowrap font-medium">
                          {locationName}
                        </td>

                        {/* 3. Sub-location / Floor */}
                        <td className="px-3.5 py-2 text-xs text-slate-700 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-indigo-500 shrink-0" strokeWidth={1.75} />
                            <span>
                              {emp.subLocation || emp.floor?.name || emp.seat?.floor?.name || '—'}
                            </span>
                          </div>
                          {(emp.building?.name || emp.seat?.floor?.building?.name) && (
                            <div className="text-[10px] text-slate-400 pl-5">
                              {emp.building?.name || emp.seat?.floor?.building?.name}
                            </div>
                          )}
                        </td>

                        {/* 4. Office / Area */}
                        <td className="px-3.5 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {officeArea}
                        </td>

                        {/* 5. WS NO */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          {emp.seat ? (
                            <span
                              className="inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold"
                              title={formatSeatPath(emp.seat, emp)}
                            >
                              <CheckCircle className="w-3 h-3 text-emerald-600 shrink-0" strokeWidth={1.75} />
                              {emp.seat.label}
                              {(emp.seat.floor?.name || emp.floor?.name) && (
                                <span className="text-[10px] font-sans font-medium text-emerald-700 bg-emerald-100/90 px-1 rounded ml-1">
                                  {emp.seat.floor?.name || emp.floor?.name}
                                </span>
                              )}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              Unassigned
                            </span>
                          )}
                        </td>

                        {/* 6. Desktop No */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          {emp.pcNumber || emp.seat?.pcNumber ? (
                            <span className="inline-flex items-center gap-1 font-mono text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200 font-semibold">
                              <Monitor className="w-3 h-3 text-blue-600 shrink-0" strokeWidth={1.75} />
                              {emp.pcNumber || emp.seat?.pcNumber}
                            </span>
                          ) : (
                            <span className="font-mono text-[11px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                              —
                            </span>
                          )}
                        </td>

                        {/* 7. E. Name */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          <div
                            className="font-semibold text-slate-900 hover:text-orange-600 cursor-pointer text-xs"
                            onClick={() => setProfileEmp(emp)}
                            title="Click to view dossier"
                          >
                            {emp.fullName}
                          </div>
                          <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                            {emp.designation && <span>{emp.designation}</span>}
                            <span>Ext: {ext}</span>
                          </div>
                        </td>

                        {/* 8. Department */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          {emp.department ? (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border"
                              style={{
                                backgroundColor: `${emp.department.colorHex}10`,
                                color: emp.department.colorHex,
                                borderColor: `${emp.department.colorHex}30`,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full mr-1.5 shrink-0"
                                style={{ backgroundColor: emp.department.colorHex }}
                              />
                              {emp.department.name}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* 9. Section */}
                        <td className="px-3.5 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {emp.section || '—'}
                        </td>

                        {/* 10. Function */}
                        <td className="px-3.5 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {emp.functionName || '—'}
                        </td>

                        {/* 11. Reporting Manager */}
                        <td className="px-3.5 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {reportingManager}
                        </td>

                        {/* 12. HOD */}
                        <td className="px-3.5 py-2 text-xs text-slate-600 whitespace-nowrap">
                          {emp.hod || '—'}
                        </td>

                        {/* 13. Active or not */}
                        <td className="px-3.5 py-2 whitespace-nowrap">
                          {emp.isActive !== false ? (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100 text-emerald-800 border border-emerald-200">
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* 14. Actions */}
                        <td className="px-3.5 py-2 text-right whitespace-nowrap sticky right-0 bg-white group-hover:bg-slate-50">
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              type="button"
                              onClick={() => setProfileEmp(emp)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                              title="View 360° Employee Dossier"
                            >
                              <Eye className="w-3.5 h-3.5" strokeWidth={1.75} />
                            </button>
                            {!isReadOnly && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(emp)}
                                  className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                  title={`Edit ${emp.fullName}`}
                                >
                                  <Pencil className="w-3.5 h-3.5" strokeWidth={1.75} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEmpToDelete(emp)}
                                  className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                  title={`Delete ${emp.fullName}`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" strokeWidth={1.75} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={14} className="p-0">
                      {loading ? (
                        <SkeletonTable rows={10} cols={14} />
                      ) : (
                        <EmptyState
                          title="No employees found"
                          description="No employees match your current filter query. Try adjusting your parameters or resetting filters."
                          actionText="Reset All Filters"
                          onAction={resetAllFilters}
                        />
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-2xs">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <label htmlFor="employee-page-size">Rows:</label>
          <select
            id="employee-page-size"
            aria-label="Employee page size"
            value={directoryPageSize}
            onChange={(e) => setDirectoryPageSize(Number(e.target.value))}
            className="rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
          <span>records per page · Search and filters run on the server</span>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" disabled={directoryPage <= 1 || loading} onClick={() => setDirectoryPage((page) => Math.max(1, page - 1))} className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40">Previous</button>
          <span className="text-xs font-mono text-slate-600">{directoryPage} / {totalDirectoryPages}</span>
          <button type="button" disabled={directoryPage >= totalDirectoryPages || loading} onClick={() => setDirectoryPage((page) => Math.min(totalDirectoryPages, page + 1))} className="rounded border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 disabled:opacity-40">Next</button>
        </div>
      </div>

      {/* 360° Employee Profile Popup Modal */}
      <EmployeeProfileModal
        employee={profileEmp}
        onClose={() => setProfileEmp(null)}
        onEdit={(emp) => handleOpenEdit(emp as Employee)}
        onAssignSeat={(emp) => handleAssignSeat(emp as Employee)}
        onStartTransfer={!isTechAdmin ? (emp) => handleStartTransfer(emp as Employee) : undefined}
            onDeactivate={(emp) => {
              setProfileEmp(null);
              setEmpToDelete(emp as Employee);
            }}
        isReadOnly={isReadOnly}
      />

      {/* Smart Delete Confirmation Modal */}
      <DeleteEmployeeModal
        employee={empToDelete}
        deleting={isDeleting}
        onCancel={() => setEmpToDelete(null)}
        onConfirm={handleConfirmDelete}
      />

      {/* Unified 2-Tab Add / Edit Employee Modal */}
      {modalMode && (
        <EmployeeFormModal
          mode={modalMode}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onClose={() => setModalMode(null)}
        >

            {/* Error Message */}
            {formError && (
              <div className="mx-4 mt-3 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-md">
                {formError}
              </div>
            )}

            {/* Form Content */}
            <form onSubmit={handleSubmitForm} className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* TAB 1: Profile & Organization */}
              {activeTab === 'profile' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Employee Code */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Employee Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="employee-employeeCode"
                        type="text"
                        required
                        value={formCode}
                        placeholder="e.g. 10615 or SI3644"
                        aria-invalid={Boolean(formFieldErrors.employeeCode)}
                        aria-describedby={formFieldErrors.employeeCode ? 'employee-code-error' : undefined}
                        onChange={(e) => { setFormCode(e.target.value); setFormFieldErrors((current) => ({ ...current, employeeCode: undefined, form: undefined })); }}
                        className={`w-full h-8 px-2.5 border rounded-md text-xs font-mono uppercase focus:outline-none focus:border-slate-400 ${formFieldErrors.employeeCode ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                      />
                      {formFieldErrors.employeeCode && <p id="employee-code-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.employeeCode}</p>}
                    </div>

                    {/* Full Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Full Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="employee-fullName"
                        type="text"
                        required
                        value={formFullName}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^a-zA-Z\s.'-]/g, '');
                          setFormFullName(val);
                          setFormFieldErrors((current) => ({ ...current, fullName: undefined, form: undefined }));
                        }}
                        placeholder="e.g. Kavaiya Rajesh Bhupatbhai"
                        aria-invalid={Boolean(formFieldErrors.fullName)}
                        aria-describedby={formFieldErrors.fullName ? 'employee-full-name-error' : undefined}
                        className={`w-full h-8 px-2.5 border rounded-md text-xs focus:outline-none focus:border-slate-400 ${formFieldErrors.fullName ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                      />
                      {formFieldErrors.fullName && <p id="employee-full-name-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.fullName}</p>}
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Corporate Email</label>
                      <input
                        name="employee-email"
                        type="email"
                        value={formEmail}
                        onChange={(e) => { setFormEmail(e.target.value); setFormFieldErrors((current) => ({ ...current, email: undefined, form: undefined })); }}
                        placeholder="rajesh.k@shaktiman.com"
                        aria-invalid={Boolean(formFieldErrors.email)}
                        aria-describedby={formFieldErrors.email ? 'employee-email-error' : undefined}
                        className={`w-full h-8 px-2.5 border rounded-md text-xs focus:outline-none focus:border-slate-400 ${formFieldErrors.email ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                      />
                      {formFieldErrors.email && <p id="employee-email-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.email}</p>}
                    </div>

                    {/* Phone */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Office Mobile Phone</label>
                      <input
                        name="employee-phone"
                        type="text"
                        maxLength={10}
                        value={formPhone}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                          setFormPhone(val);
                          setFormFieldErrors((current) => ({ ...current, phone: undefined, form: undefined }));
                        }}
                        placeholder="e.g. 9227927958 (10 digits)"
                        aria-invalid={Boolean(formFieldErrors.phone)}
                        aria-describedby={formFieldErrors.phone ? 'employee-phone-error' : undefined}
                        className={`w-full h-8 px-2.5 border rounded-md text-xs font-mono focus:outline-none focus:border-slate-400 ${formFieldErrors.phone ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                      />
                      {formFieldErrors.phone && <p id="employee-phone-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.phone}</p>}
                    </div>

                    {/* Intercom Extension */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Intercom Extension (Ext)</label>
                      <input
                        name="employee-ext"
                        type="text"
                        value={formExt}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setFormExt(val);
                          setFormFieldErrors((current) => ({ ...current, ext: undefined, form: undefined }));
                        }}
                        placeholder="e.g. 5012 or 408"
                        aria-invalid={Boolean(formFieldErrors.ext)}
                        aria-describedby={formFieldErrors.ext ? 'employee-ext-error' : undefined}
                        className={`w-full h-8 px-2.5 border rounded-md text-xs font-mono focus:outline-none focus:border-slate-400 ${formFieldErrors.ext ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                      />
                      {formFieldErrors.ext && <p id="employee-ext-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.ext}</p>}
                    </div>

                    {/* Designation */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Designation / Title</label>
                      <input
                        type="text"
                        value={formDesignation}
                        onChange={(e) => setFormDesignation(e.target.value)}
                        placeholder="e.g. Senior Manager"
                        className="w-full h-8 px-2.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    {/* Grade */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Grade (Pay Band)</label>
                      <input
                        type="text"
                        value={formGrade}
                        onChange={(e) => setFormGrade(e.target.value)}
                        placeholder="e.g. M-3, O-2, O-1"
                        className="w-full h-8 px-2.5 border border-slate-200 rounded-md text-xs font-mono uppercase focus:outline-none focus:border-slate-400"
                      />
                    </div>

                    {/* Location (Unit) */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Location (Unit) <span className="text-red-500">*</span>
                      </label>
                      {isGlobalAdmin ? (
                        <select
                          name="employee-unitId"
                          value={formUnitId}
                          onChange={(e) => {
                            const newUnitId = e.target.value;
                            setFormUnitId(newUnitId);
                            setFormBuildingId('');
                            setFormFloorId('');
                            setFormSeatId('');
                            setFormFieldErrors((current) => ({ ...current, unitId: undefined, departmentId: undefined, seatId: undefined, form: undefined }));
                          }}
                          aria-invalid={Boolean(formFieldErrors.unitId)}
                          aria-describedby={formFieldErrors.unitId ? 'employee-unit-error' : undefined}
                          className={`w-full h-8 px-2 border rounded-md text-xs bg-white focus:outline-none focus:border-slate-400 font-medium ${formFieldErrors.unitId ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                        >
                          <option value="">Select Unit</option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name} {u.location ? `(${u.location})` : ''}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full h-8 px-2.5 bg-slate-100 border border-slate-200 rounded-md text-xs flex items-center justify-between text-slate-700 font-medium">
                          <span>{units.find((u) => u.id === formUnitId)?.name || 'Assigned Unit'}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">
                            Locked ({adminUser?.role})
                          </span>
                        </div>
                      )}
                      {formFieldErrors.unitId && <p id="employee-unit-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.unitId}</p>}
                    </div>

                    {/* Department */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Department <span className="text-red-500">*</span>
                      </label>
                      <select
                        name="employee-departmentId"
                        value={formDeptId}
                        disabled={modalDepartments.length === 0}
                        onChange={(e) => {
                          setFormDeptId(e.target.value);
                          setFormSectionId('');
                          setFormSection('');
                          setFormFunctionId('');
                          setFormFunction('');
                          setFormFieldErrors((current) => ({ ...current, departmentId: undefined, sectionId: undefined, functionId: undefined, form: undefined }));
                        }}
                        aria-invalid={Boolean(formFieldErrors.departmentId)}
                        aria-describedby={formFieldErrors.departmentId ? 'employee-department-error' : undefined}
                        className={`w-full h-8 px-2 border rounded-md text-xs bg-white focus:outline-none focus:border-slate-400 ${formFieldErrors.departmentId ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                      >
                        {modalDepartments.length === 0 && (
                          <option value="">No departments configured for this Unit</option>
                        )}
                        {modalDepartments.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} {d.unit?.name ? `(${d.unit.name})` : ''}
                          </option>
                        ))}
                      </select>
                      {formFieldErrors.departmentId && <p id="employee-department-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.departmentId}</p>}
                      {modalDepartments.length === 0 && formUnitId && (
                        <p role="alert" className="mt-1.5 text-[10px] leading-4 text-amber-700">
                          No authorized department is configured for this Unit. Use “Manage Departments…” in the Department filter to add one, then reopen this form.
                        </p>
                      )}
                    </div>

                    {/* Desktop No / PC Number */}
                    <div>
                      <label className="block text-[11px] font-semibold text-blue-900 mb-1 flex items-center gap-1">
                        <Monitor className="w-3 h-3 text-blue-600" />
                        Desktop No / PC Number
                      </label>
                      <input
                        type="text"
                        value={formPcNumber}
                        onChange={(e) => setFormPcNumber(e.target.value)}
                        placeholder="e.g. PC-104 or PC-U1-ADM-042"
                        className="w-full h-8 px-2.5 border border-blue-200 bg-blue-50/20 rounded-md text-xs font-mono uppercase focus:outline-none focus:border-blue-400"
                      />
                    </div>

                    {/* Section */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Section</label>
                      <select
                        name="employee-sectionId"
                        value={formSectionId || (formSection ? `legacy:${formSection}` : '')}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id.startsWith('legacy:')) return;
                          setFormSectionId(id);
                          setFormSection(modalSections.find((item) => item.id === id)?.name || '');
                          setFormFunctionId('');
                          setFormFunction('');
                          setFormFieldErrors((current) => ({ ...current, sectionId: undefined, functionId: undefined, form: undefined }));
                        }}
                        aria-invalid={Boolean(formFieldErrors.sectionId)}
                        aria-describedby={formFieldErrors.sectionId ? 'employee-section-error' : undefined}
                        className={`w-full h-8 px-2.5 border rounded-md text-xs focus:outline-none focus:border-slate-400 ${formFieldErrors.sectionId ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                      >
                        <option value="">Select Section</option>
                        {formSection && !modalSections.some((item) => item.name === formSection) && <option value={`legacy:${formSection}`}>{formSection} (legacy)</option>}
                        {modalSections.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      {formFieldErrors.sectionId && <p id="employee-section-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.sectionId}</p>}
                    </div>

                    {/* Function */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Function</label>
                      <select
                        name="employee-functionId"
                        value={formFunctionId || (formFunction ? `legacy:${formFunction}` : '')}
                        onChange={(e) => {
                          const id = e.target.value;
                          if (id.startsWith('legacy:')) return;
                          setFormFunctionId(id);
                          setFormFunction(modalFunctions.find((item) => item.id === id)?.name || '');
                          setFormFieldErrors((current) => ({ ...current, functionId: undefined, form: undefined }));
                        }}
                        aria-invalid={Boolean(formFieldErrors.functionId)}
                        aria-describedby={formFieldErrors.functionId ? 'employee-function-error' : undefined}
                        className={`w-full h-8 px-2.5 border rounded-md text-xs focus:outline-none focus:border-slate-400 ${formFieldErrors.functionId ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-200'}`}
                      >
                        <option value="">Select Function</option>
                        {formFunction && !modalFunctions.some((item) => item.name === formFunction) && <option value={`legacy:${formFunction}`}>{formFunction} (legacy)</option>}
                        {modalFunctions.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                      {formFieldErrors.functionId && <p id="employee-function-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.functionId}</p>}
                    </div>

                    {/* Office / Area */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Office / Area</label>
                      <select
                        value={formOfficeArea}
                        onChange={(e) => setFormOfficeArea(e.target.value)}
                        className="w-full h-8 px-2.5 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-slate-400"
                      >
                        <option value="">Select Area</option>
                        {Array.from(new Set([...modalAreas.map((item) => item.name), ...availableOfficeAreas])).sort().map((area) => <option key={area} value={area}>{area}</option>)}
                      </select>
                    </div>

                    {/* Active Status */}
                    <div className="flex items-center gap-2 pt-5">
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formIsActive}
                          onChange={(e) => setFormIsActive(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                        <span className="ml-2 text-xs font-medium text-slate-700">
                          {formIsActive ? 'Active Employee' : 'Inactive Employee'}
                        </span>
                      </label>
                    </div>

                    {/* Reporting Manager */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Reporting Manager</label>
                      <SearchableSelect
                        id="employee-reportingTo"
                        name="employee-reportingTo"
                        value={formReportingTo}
                        onChange={(val) => {
                          setFormReportingTo(val);
                          setFormFieldErrors((current) => ({ ...current, reportingTo: undefined, form: undefined }));
                        }}
                        options={[
                          ...(formReportingTo && !distinctDirReportingTo.includes(formReportingTo) ? [formReportingTo] : []),
                          ...distinctDirReportingTo.filter((mgr) => !formFullName || mgr.trim().toLowerCase() !== formFullName.trim().toLowerCase()),
                        ]}
                        placeholder="Select Reporting Manager (Optional)"
                        emptyOptionLabel="Select Reporting Manager (Optional)"
                        hasError={Boolean(formFieldErrors.reportingTo)}
                        ariaDescribedBy={formFieldErrors.reportingTo ? 'employee-reportingTo-error' : undefined}
                      />
                      {formFieldErrors.reportingTo && <p id="employee-reportingTo-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.reportingTo}</p>}
                    </div>

                    {/* HOD */}
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">Department Head (HOD)</label>
                      <SearchableSelect
                        id="employee-hod"
                        name="employee-hod"
                        value={formHod}
                        onChange={(val) => {
                          setFormHod(val);
                          setFormFieldErrors((current) => ({ ...current, hod: undefined, form: undefined }));
                        }}
                        options={[
                          ...(formHod && !distinctDirHods.includes(formHod) ? [formHod] : []),
                          ...distinctDirHods.filter((h) => !formFullName || h.trim().toLowerCase() !== formFullName.trim().toLowerCase()),
                        ]}
                        placeholder="Select Department Head (Optional)"
                        emptyOptionLabel="Select Department Head (Optional)"
                        hasError={Boolean(formFieldErrors.hod)}
                        ariaDescribedBy={formFieldErrors.hod ? 'employee-hod-error' : undefined}
                      />
                      {formFieldErrors.hod && <p id="employee-hod-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.hod}</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: Workstation & PC Asset */}
              {activeTab === 'workstation' && (
                <div className="space-y-4">
                  {/* Current Desk Banner */}
                  {currentAssignedSeat ? (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-xs">
                      <div>
                        <div className="font-semibold text-emerald-900 flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 text-emerald-600" />
                          Currently Assigned Workstation:
                        </div>
                        <div className="font-mono text-emerald-800 font-bold mt-0.5">
                          {currentAssignedSeat.label} ({currentAssignedSeat.floor?.name || 'Floor'})
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleReleaseCurrentDesk}
                        className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded text-xs font-medium transition-colors"
                      >
                        Release Workstation
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-500 text-xs">
                      No physical desk currently allocated. Select a floor below to assign a vacant workstation.
                    </div>
                  )}

                  {/* Cascading Workstation Picker */}
                  <div className="border border-slate-200/80 rounded-lg p-3 space-y-3">
                    <div className="font-semibold text-slate-800 text-xs">
                      Cascading Physical Workstation Selector
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {/* Unit */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Unit</label>
                        <select
                          value={formUnitId}
                          disabled={!isGlobalAdmin}
                          onChange={(e) => {
                            setFormUnitId(e.target.value);
                            setFormBuildingId('');
                            setFormFloorId('');
                            setFormSeatId('');
                          }}
                          className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-slate-400"
                        >
                          <option value="">Select Unit</option>
                          {units.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Building */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Building</label>
                        <select
                          value={formBuildingId}
                          onChange={(e) => {
                            setFormBuildingId(e.target.value);
                            setFormFloorId('');
                            setFormSeatId('');
                          }}
                          className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-slate-400"
                        >
                          <option value="">Select Building</option>
                          {availableBuildings.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Floor */}
                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">Floor</label>
                        <select
                          value={formFloorId}
                          onChange={(e) => {
                            setFormFloorId(e.target.value);
                            setFormSeatId('');
                          }}
                          className="w-full h-8 px-2 border border-slate-200 rounded-md text-xs bg-white focus:outline-none focus:border-slate-400"
                        >
                          <option value="">Select Floor</option>
                          {availableFloors.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    {/* Floor Vacancy Overview & Workstation Selector */}
                    <div className="space-y-3 pt-1">
                      {formFloorId ? (
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/90 space-y-2.5">
                          {/* Live Vacancy Overview Header */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                                Workstation Allocation on Floor
                              </label>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
                                {availableSeats.length} Available Desks
                                {totalFloorSeatsCount > 0 && ` of ${totalFloorSeatsCount} total`}
                              </span>
                            </div>
                            <div className="flex items-center text-[10px] text-slate-600 bg-white/70 px-2 py-1 rounded border border-slate-200">
                              <MapPin className="w-3 h-3 text-slate-400 mr-1 shrink-0" />
                              <span>{units.find((u) => u.id === formUnitId)?.name || 'Unit'}</span>
                              <span className="mx-1 text-slate-300">›</span>
                              <span>{availableBuildings.find((b) => b.id === formBuildingId)?.name || 'Building'}</span>
                              <span className="mx-1 text-slate-300">›</span>
                              <span className="font-semibold text-slate-800">{availableFloors.find((f) => f.id === formFloorId)?.name || 'Floor'}</span>
                            </div>
                          </div>

                          {/* Multi-Criteria Seat Filters */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {/* Search */}
                            <div className="relative">
                              <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                              <input
                                type="text"
                                value={modalSeatSearch}
                                onChange={(e) => setModalSeatSearch(e.target.value)}
                                placeholder="Search desk, PC, area..."
                                className="w-full h-7.5 pl-7 pr-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-500"
                              />
                            </div>

                            {/* Seating Area Dropdown */}
                            <div>
                              <select
                                value={modalSeatAreaFilter}
                                onChange={(e) => setModalSeatAreaFilter(e.target.value)}
                                className="w-full h-7.5 px-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-500"
                              >
                                <option value="ALL">All Seating Areas ({distinctModalAreas.length})</option>
                                {distinctModalAreas.map((area) => (
                                  <option key={area} value={area}>
                                    {area}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Type Dropdown */}
                            <div>
                              <select
                                value={modalSeatTypeFilter}
                                onChange={(e) => setModalSeatTypeFilter(e.target.value)}
                                className="w-full h-7.5 px-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-500"
                              >
                                <option value="ALL">All Desk Types</option>
                                <option value="STANDARD_DESK">Standard Desk</option>
                                <option value="CABIN">Executive Cabin</option>
                                <option value="CUBICLE">Cubicle</option>
                                <option value="MEETING_ROOM">Meeting Room</option>
                              </select>
                            </div>
                          </div>

                          {/* Workstation Select Dropdown */}
                          <div>
                            <select
                              name="employee-seatId"
                              value={formSeatId}
                              onChange={(e) => {
                                const newId = e.target.value;
                                setFormSeatId(newId);
                                const found = availableSeats.find((s) => s.id === newId);
                                if (found?.pcNumber && !formPcNumber) {
                                  setFormPcNumber(found.pcNumber);
                                }
                                setFormFieldErrors((current) => ({ ...current, seatId: undefined, form: undefined }));
                              }}
                              disabled={loadingSeats}
                              aria-invalid={Boolean(formFieldErrors.seatId)}
                              aria-describedby={formFieldErrors.seatId ? 'employee-seat-error' : undefined}
                              className={`w-full h-9 px-2.5 border rounded bg-white text-slate-900 font-mono text-xs focus:outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-500 ${formFieldErrors.seatId ? 'border-red-500 ring-1 ring-red-300' : 'border-slate-300'}`}
                            >
                              <option value="">-- No Workstation (Leave Unassigned) --</option>
                              {filteredModalSeats.map((s) => {
                                const isCurrent = currentAssignedSeat && s.id === currentAssignedSeat.id;
                                const areaText = s.officeArea || s.zone || 'General Bay';
                                const pcText = s.pcNumber ? ` • PC: ${s.pcNumber}` : '';
                                const deptText = s.department?.name ? ` • Dept: ${s.department.name}` : '';
                                const typeText = s.type ? s.type.replace(/_/g, ' ') : 'Standard Desk';
                                return (
                                  <option key={s.id} value={s.id}>
                                    🟢 {s.label} — {isCurrent ? 'CURRENT DESK' : 'VACANT'} | Area: {areaText}{deptText} | {typeText}{pcText}
                                  </option>
                                );
                              })}
                            </select>
                            {formFieldErrors.seatId && <p id="employee-seat-error" role="alert" className="mt-1 text-[10px] text-red-600">{formFieldErrors.seatId}</p>}
                          </div>

                          {/* Quick Pick Cards Grid */}
                          {filteredModalSeats.length > 0 && (
                            <div className="space-y-1">
                              <span className="text-[10px] text-slate-600 font-medium block">
                                Quick Select Desk on Floor:
                              </span>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-36 overflow-y-auto p-1 bg-white rounded border border-slate-200">
                                {filteredModalSeats.slice(0, 9).map((s) => {
                                  const isSelected = formSeatId === s.id;
                                  const isCurrent = currentAssignedSeat && s.id === currentAssignedSeat.id;
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => {
                                        setFormSeatId(s.id);
                                        if (s.pcNumber && !formPcNumber) {
                                          setFormPcNumber(s.pcNumber);
                                        }
                                      }}
                                      className={`p-2 rounded text-left text-xs transition border flex flex-col justify-between ${
                                        isSelected
                                          ? 'bg-indigo-50 border-indigo-600 text-indigo-950 font-semibold ring-1 ring-indigo-500 shadow-xs'
                                          : 'bg-slate-50/60 border-slate-200 hover:border-slate-300 text-slate-700'
                                      }`}
                                    >
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                          <span className="font-mono font-bold text-xs">{s.label}</span>
                                        </div>
                                        {isCurrent ? (
                                          <span className="text-[9px] font-bold px-1 py-0.2 bg-blue-100 text-blue-700 rounded border border-blue-200">
                                            Current
                                          </span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                            VACANT
                                          </span>
                                        )}
                                      </div>
                                      <div className="text-[10px] text-slate-600 truncate mt-1">
                                        <span className="font-medium text-slate-800">Area: </span>
                                        {s.officeArea || s.zone || 'General Bay'}
                                      </div>
                                      <div className="flex items-center justify-between text-[9px] text-slate-500 mt-0.5 pt-0.5 border-t border-slate-100">
                                        <span>{s.department?.name ? `Dept: ${s.department.name}` : (s.type ? s.type.replace(/_/g, ' ').toLowerCase() : 'Desk')}</span>
                                        {s.pcNumber && <span className="font-mono font-semibold text-slate-700">PC: {s.pcNumber}</span>}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Selected Destination Seat Summary Card */}
                          {selectedModalSeatObj && (
                            <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <span className="p-1 rounded bg-emerald-200 text-emerald-800">
                                    <Armchair className="w-4 h-4" />
                                  </span>
                                  <div>
                                    <div className="flex items-center space-x-2">
                                      <span className="font-mono font-bold text-emerald-950 text-xs">
                                        {selectedModalSeatObj.label}
                                      </span>
                                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-600 text-white">
                                        {currentAssignedSeat?.id === selectedModalSeatObj.id ? 'ASSIGNED' : '🟢 VACANT'}
                                      </span>
                                    </div>
                                    <span className="text-[10px] text-emerald-800 font-medium">
                                      Area: {selectedModalSeatObj.officeArea || selectedModalSeatObj.zone || 'General Floor Area'}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-1.5">
                                  {selectedModalSeatObj.pcNumber ? (
                                    <span className="font-mono text-[10px] px-1.5 py-0.5 bg-white text-slate-800 font-semibold rounded border border-emerald-300">
                                      PC: {selectedModalSeatObj.pcNumber}
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                      No PC Tag
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={handleReleaseCurrentDesk}
                                    className="px-2 py-0.5 text-[10px] text-rose-700 hover:bg-rose-50 border border-rose-200 rounded font-medium transition"
                                  >
                                    Unassign
                                  </button>
                                </div>
                              </div>

                              {/* Location & Desk Specification Details */}
                              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-emerald-200/80 text-emerald-900">
                                <div>
                                  <span className="text-emerald-700 font-normal">Location: </span>
                                  <span className="font-medium">
                                    {availableBuildings.find((b) => b.id === formBuildingId)?.name || 'Building'} • {availableFloors.find((f) => f.id === formFloorId)?.name || 'Floor'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-emerald-700 font-normal">Desk Type: </span>
                                  <span className="font-medium capitalize">
                                    {selectedModalSeatObj.type ? selectedModalSeatObj.type.replace(/_/g, ' ').toLowerCase() : 'Standard Desk'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-emerald-700 font-normal">Seating Area: </span>
                                  <span className="font-medium">
                                    {selectedModalSeatObj.officeArea || selectedModalSeatObj.zone || 'General Bay'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-emerald-700 font-normal">Department: </span>
                                  <span className="font-medium">
                                    {selectedModalSeatObj.department?.name || 'Any / Multi-purpose'}
                                  </span>
                                </div>
                              </div>

                              <div className="text-[10px] text-emerald-700 flex items-center pt-0.5">
                                <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600 shrink-0" />
                                <span>Workstation designated for allocation upon saving.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-center text-xs text-slate-400">
                          Select a Floor above to browse available workstations.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* PC Number / IT Asset Tag (Admin Only) */}
                  <div className="border border-blue-200 bg-blue-50/40 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-blue-950 text-xs flex items-center gap-1.5">
                        <Monitor className="w-3.5 h-3.5 text-blue-600" />
                        PC Number / IT Hardware Asset Tag (Admin Only)
                      </label>
                      {formPcNumber && (
                        <button
                          type="button"
                          onClick={handleClearPcNumber}
                          className="text-[11px] text-red-600 hover:text-red-700 font-medium"
                        >
                          Clear PC
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={formPcNumber}
                        onChange={(e) => setFormPcNumber(e.target.value)}
                        placeholder="e.g. PC-U1-042 or LAPTOP-IT-105"
                        className="flex-1 h-8 px-2.5 border border-blue-200 rounded-md text-xs font-mono uppercase bg-white focus:outline-none focus:border-blue-400"
                      />
                      {formPcNumber && (
                        <button
                          type="button"
                          onClick={handleClearPcNumber}
                          className="px-2.5 h-8 border border-red-200 bg-white text-red-600 hover:bg-red-50 rounded-md text-xs font-medium"
                        >
                          Unlink
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-blue-800/80">
                      Stores the workstation's assigned computer asset tag. Only Super Admin and Unit Admin can edit or clear this.
                    </p>
                  </div>

                  {/* Seating Remarks */}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">Seating Remarks / Notes</label>
                    <textarea
                      rows={2}
                      value={formRemarks}
                      onChange={(e) => setFormRemarks(e.target.value)}
                      placeholder="e.g. Ground floor admin cabin, corner workstation next to window..."
                      className="w-full p-2 border border-slate-200 rounded-md text-xs focus:outline-none focus:border-slate-400 resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Form Footer */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div>
                  {activeTab === 'profile' ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab('workstation')}
                      className="h-8 px-3 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      Next: Workstation & PC →
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('profile')}
                      className="h-8 px-3 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50 flex items-center gap-1"
                    >
                      ← Back to Profile
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setModalMode(null)}
                    className="h-8 px-3 border border-slate-200 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={formSubmitting}
                    className="h-8 px-3.5 bg-orange-600 text-white rounded-md text-xs font-semibold hover:bg-orange-500 disabled:opacity-50 transition-colors shadow-2xs"
                  >
                    {formSubmitting ? 'Saving...' : modalMode === 'ADD' ? 'Create Employee' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
        </EmployeeFormModal>
      )}

      {managerKind && managerConfig && (
        <CategoryManagerModal
          kind={managerKind}
          parentId={managerConfig.parentId}
          parentOptions={managerConfig.parentOptions}
          parentLabel={managerConfig.parentLabel}
          onClose={() => setManagerKind(null)}
          onChanged={async () => {
            await Promise.all([loadCategoryOptions(), apiRequest<Department[]>('/departments').then(setDepartments)]);
          }}
        />
      )}
    </div>
  );
};
