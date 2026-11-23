import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiRequest, broadcastNotificationsChanged, broadcastWorkspaceDataChanged } from '../api/client';
import { useDebounce } from '../hooks/useDebounce';
import {
  buildTransferEmployeeSearchParams,
  getTransferEmployeeSearchUnitId,
  matchesTransferEmployeeSearch,
  moveTransferEmployeeActiveIndex,
} from '../utils/transferEmployeeSearch';
import {
  getTransferActorLabel,
  getTransferDecisionRecord,
  getTransferDisplayStatus,
  getTransferStage2Label,
} from '../utils/transferWorkflowPresentation';
import {
  isTransferTransactionConflict,
  TRANSFER_TRANSACTION_CONFLICT_MESSAGE,
  transferDestinationConflictMessage,
  transferUniqueConflictMessage,
} from '../utils/transferApprovalConflict';
import { getTransferDestinationBuildings, getTransferDestinationFloors } from '../utils/transferDestinationFilters';
import { PageHeroHeader } from '../components/PageHeroHeader';
import {
  GitPullRequest,
  Clock,
  AlertCircle,
  ArrowRight,
  User,
  Plus,
  Send,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Image as ImageIcon,
  Eye,
  Paperclip,
  Search,
  CheckCircle2,
  Armchair,
  MapPin,
} from 'lucide-react';

interface Unit {
  id: string;
  name: string;
  code: string;
}

interface Plant {
  id: string;
  name: string;
  code: string;
  unitId: string;
}

interface Building {
  id: string;
  name: string;
  code: string;
  plantId?: string | null;
  unitId?: string | null;
}

interface Floor {
  id: string;
  name: string;
  floorNumber: number;
  buildingId: string;
  _count?: { seats?: number };
}

interface AreaOption { id: string; name: string; floorId: string; }
interface DepartmentOption { id: string; name: string; code?: string; unitId?: string | null; }
interface SectionOption { id: string; name: string; departmentId: string; }
interface FunctionOption { id: string; name: string; sectionId: string; }

interface TransferEmployee {
  id: string;
  fullName: string;
  employeeCode: string;
  email?: string | null;
  department?: { name: string; unitId?: string | null } | null;
  seat?: {
    label: string;
    floor?: { name: string; building?: { name: string; plant?: { unit?: { name: string } } } };
  } | null;
}

interface Seat {
  id: string;
  label: string;
  floorId: string;
  status: string;
  employeeId?: string | null;
  type?: string;
  pcNumber?: string | null;
  officeArea?: string | null;
  zone?: string | null;
  remarks?: string | null;
  areaId?: string | null;
  departmentId?: string | null;
  department?: {
    id: string;
    name: string;
    code?: string;
    colorHex?: string;
  } | null;
  floor?: {
    id: string;
    name: string;
    floorNumber?: number;
    building?: {
      id: string;
      name: string;
      code?: string;
      plant?: {
        id: string;
        name: string;
        code?: string;
        unit?: {
          id: string;
          name: string;
          code?: string;
        };
      };
    };
  };
}

interface ApprovalRecord {
  approvedById?: string;
  approverName?: string;
  adminId?: string;
  adminName?: string;
  adminRole?: string;
  action: string;
  comment?: string;
  timestamp?: string;
  isLegacy?: boolean;
}

interface TransferRequestItem {
  id: string;
  requestNumber: string;
  employeeId: string;
  employee?: {
    id: string;
    fullName: string;
    employeeCode: string;
    email: string;
    department?: {
      id: string;
      name: string;
      code: string;
    };
  } | null;
  sourceUnitId?: string | null;
  sourcePlantId?: string | null;
  sourceBuildingId?: string | null;
  sourceFloorId?: string | null;
  sourceSeatId?: string | null;
  sourceUnitName?: string | null;
  sourceFloorName?: string | null;
  sourceSeatLabel?: string | null;
  sourceUnit?: Unit | null;
  sourceSeat?: Seat | null;

  targetUnitId: string;
  targetPlantId?: string | null;
  targetBuildingId?: string | null;
  targetFloorId?: string | null;
  targetSeatId?: string | null;
  targetUnitName?: string | null;
  targetPlantName?: string | null;
  targetBuildingName?: string | null;
  targetFloorName?: string | null;
  targetSeatLabel?: string | null;
  targetUnit?: Unit | null;
  targetFloor?: Floor | null;
  targetSeat?: Seat | null;

  proofImageUrl?: string | null;
  proofFileName?: string | null;

  status: string;
  reason: string;
  rejectionReason?: string | null;
  rejectedByRole?: string | null;

  managerApproval?: ApprovalRecord | null;
  hodApproval?: ApprovalRecord | null;
  sourceAdminApproval?: ApprovalRecord | null;
  targetAdminApproval?: ApprovalRecord | null;

  createdAt: string;
  updatedAt: string;
}

export const TransferRequestsPage: React.FC = () => {
  const { adminUser } = useAuth();
  const [requests, setRequests] = useState<TransferRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'all' | 'my'>('pending');
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);

  // Lightbox modal state for proof image
  const [lightboxImage, setLightboxImage] = useState<{ url: string; name: string } | null>(null);

  // New Request Modal state
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState<{
    open: boolean;
    request: TransferRequestItem | null;
    actionType: 'APPROVE' | 'REJECT';
  }>({
    open: false,
    request: null,
    actionType: 'APPROVE',
  });

  // Action form state
  const [actionComment, setActionComment] = useState('');
  const [selectedTargetSeatId, setSelectedTargetSeatId] = useState('');
  const [approvalBuildingId, setApprovalBuildingId] = useState('');
  const [approvalFloorId, setApprovalFloorId] = useState('');
  const [approvalAreaId, setApprovalAreaId] = useState('');
  const [approvalDepartmentId, setApprovalDepartmentId] = useState('');
  const [approvalSectionId, setApprovalSectionId] = useState('');
  const [approvalFunctionId, setApprovalFunctionId] = useState('');
  const [approvalAreas, setApprovalAreas] = useState<AreaOption[]>([]);
  const [approvalDepartments, setApprovalDepartments] = useState<DepartmentOption[]>([]);
  const [approvalSections, setApprovalSections] = useState<SectionOption[]>([]);
  const [approvalFunctions, setApprovalFunctions] = useState<FunctionOption[]>([]);
  const [vacantSeatsForTargetFloor, setVacantSeatsForTargetFloor] = useState<Seat[]>([]);
  const [totalTargetFloorSeatsCount, setTotalTargetFloorSeatsCount] = useState(0);
  const [targetSeatSearch, setTargetSeatSearch] = useState('');
  const [targetSeatAreaFilter, setTargetSeatAreaFilter] = useState('ALL');
  const [targetSeatTypeFilter, setTargetSeatTypeFilter] = useState('ALL');
  const [loadingVacantSeats, setLoadingVacantSeats] = useState(false);
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // New Request Form cascading states
  const [units, setUnits] = useState<Unit[]>([]);
  const [availableSeatsByUnit, setAvailableSeatsByUnit] = useState<Record<string, number>>({});
  const [allPlants, setAllPlants] = useState<Plant[]>([]);
  const [allBuildings, setAllBuildings] = useState<Building[]>([]);
  const [allFloors, setAllFloors] = useState<Floor[]>([]);
  const [transferEmployees, setTransferEmployees] = useState<TransferEmployee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('');
  const [selectedTransferEmployee, setSelectedTransferEmployee] = useState<TransferEmployee | null>(null);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeSearchOpen, setEmployeeSearchOpen] = useState(false);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [employeeSearchError, setEmployeeSearchError] = useState<string | null>(null);
  const [activeEmployeeIndex, setActiveEmployeeIndex] = useState(-1);
  const employeeSearchRequestRef = useRef(0);
  const approvalFloorRequestRef = useRef(0);
  const employeeComboboxRef = useRef<HTMLDivElement>(null);
  const debouncedEmployeeSearch = useDebounce(employeeSearch, 250);

  const visibleTransferEmployees = useMemo(
    () => transferEmployees.filter((employee) => matchesTransferEmployeeSearch(employee, employeeSearch)),
    [employeeSearch, transferEmployees]
  );

  const [formData, setFormData] = useState({
    sourceUnitId: '',
    targetUnitId: '',
    reason: '',
  });

  const isSuperAdmin = adminUser?.role === 'SUPER_ADMIN';
  const isTechAdmin = adminUser?.role === 'TECH_ADMIN';
  const isGlobalAdmin = isSuperAdmin || isTechAdmin;
  const sourceUnitId = getTransferEmployeeSearchUnitId({
    role: adminUser?.role,
    assignedUnitId: adminUser?.assignedUnitId,
    sourceUnitId: formData.sourceUnitId,
  });
  const selectedSourceUnit = units.find((unit) => unit.id === sourceUnitId);

  const loadTransferOptions = async () => {
    try {
      const options = await apiRequest<{ units: Unit[]; availableSeatCounts: Array<{ unitId: string; availableSeats: number }> }>('/transfer-requests/options');
      setUnits(options.units || []);
      setAvailableSeatsByUnit(Object.fromEntries((options.availableSeatCounts || []).map((item) => [item.unitId, item.availableSeats])));
      if (!isGlobalAdmin && adminUser?.assignedUnitId) {
        setFormData((prev) => ({ ...prev, sourceUnitId: adminUser.assignedUnitId || '' }));
      }
    } catch (err) {
      console.error('Failed to load transfer options:', err);
    }
  };

  useEffect(() => {
    if (!isNewModalOpen) return;

    const requestId = ++employeeSearchRequestRef.current;
    const query = debouncedEmployeeSearch.trim();
    if (!sourceUnitId) {
      setTransferEmployees([]);
      setActiveEmployeeIndex(-1);
      setEmployeeSearchLoading(false);
      setEmployeeSearchError(null);
      return;
    }

    setEmployeeSearchLoading(true);
    setEmployeeSearchError(null);

    const params = buildTransferEmployeeSearchParams(
      {
        role: adminUser?.role,
        assignedUnitId: adminUser?.assignedUnitId,
        sourceUnitId: formData.sourceUnitId,
      },
      query,
    );

    void apiRequest<{ employees: TransferEmployee[] }>(`/employees?${params.toString()}`)
      .then((response) => {
        if (requestId !== employeeSearchRequestRef.current) return;
        setTransferEmployees(response.employees || []);
        setActiveEmployeeIndex(response.employees?.length ? 0 : -1);
      })
      .catch((err: any) => {
        if (requestId !== employeeSearchRequestRef.current) return;
        setTransferEmployees([]);
        setActiveEmployeeIndex(-1);
        setEmployeeSearchError(err.message || 'Unable to search employees.');
      })
      .finally(() => {
        if (requestId === employeeSearchRequestRef.current) setEmployeeSearchLoading(false);
      });
  }, [adminUser?.assignedUnitId, adminUser?.role, debouncedEmployeeSearch, formData.sourceUnitId, isNewModalOpen, sourceUnitId]);

  useEffect(() => {
    if (!employeeSearchOpen) return;

    const handleOutsidePointerDown = (event: MouseEvent) => {
      if (!employeeComboboxRef.current?.contains(event.target as Node)) {
        setEmployeeSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsidePointerDown);
    return () => document.removeEventListener('mousedown', handleOutsidePointerDown);
  }, [employeeSearchOpen]);

  // Attached proof image in new request form
  const [proofFile, setProofFile] = useState<{
    dataUrl: string;
    name: string;
    size: number;
  } | null>(null);

  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch all transfer requests
  const loadRequests = async (throwOnError = false): Promise<TransferRequestItem[]> => {
    setLoading(true);
    try {
      const data = await apiRequest<TransferRequestItem[]>('/transfer-requests');
      setRequests(data || []);
      if (data && data.length > 0 && !expandedRequestId) {
        setExpandedRequestId(data[0].id);
      }
      return data || [];
    } catch (err) {
      console.error('Failed to load transfer requests:', err);
      if (throwOnError) throw err;
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch current user's seat allocation
  useEffect(() => {
    loadRequests();
    loadTransferOptions();
  }, [adminUser]);

  // Request creation selects the source/target Units and employee. Destination
  // hierarchy and workstation selection belong to the receiving decision-maker.
  const handleUnitChange = (unitId: string) => {
    setFormData((prev) => ({ ...prev, targetUnitId: unitId }));
  };

  const handleSourceUnitChange = (unitId: string) => {
    setFormData((prev) => ({
      ...prev,
      sourceUnitId: unitId,
      targetUnitId: prev.targetUnitId === unitId ? '' : prev.targetUnitId,
    }));
    setSelectedEmployeeId('');
    setSelectedTransferEmployee(null);
    setEmployeeSearch('');
    setTransferEmployees([]);
    setEmployeeSearchOpen(false);
    setActiveEmployeeIndex(-1);
    setEmployeeSearchError(null);
  };

  // Handle image proof file selection
  const handleProofFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFormError('Attached proof must be an image file (PNG, JPEG, JPG, WEBP).');
      return;
    }

    if (file.size > 1024 * 1024) {
      setFormError('Attached image proof exceeds the maximum allowed size of 1 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setProofFile({
          dataUrl: reader.result,
          name: file.name,
          size: file.size,
        });
        setFormError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit new transfer request (PO Rule 1: No seat selection by employee)
  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!sourceUnitId) {
      setFormError(isGlobalAdmin ? 'Select a source Unit before choosing an employee.' : 'Your assigned source Unit could not be resolved.');
      return;
    }

    if (!selectedEmployeeId || !selectedTransferEmployee) {
      setFormError('Select a valid employee from the selected source Unit before submitting.');
      setEmployeeSearchOpen(true);
      return;
    }

    if (!formData.targetUnitId || formData.targetUnitId === sourceUnitId) {
      setFormError('Select a different target Unit. Same-Unit movement uses the separate seat reassignment workflow.');
      return;
    }

    setFormSubmitting(true);

    try {
      await apiRequest('/transfer-requests', {
        method: 'POST',
        body: JSON.stringify({
          employeeId: selectedEmployeeId,
          sourceUnitId,
          targetUnitId: formData.targetUnitId,
          reason: formData.reason,
          proofImageUrl: proofFile?.dataUrl || undefined,
          proofFileName: proofFile?.name || undefined,
        }),
      });

      setIsNewModalOpen(false);
      setFormData({
        sourceUnitId: isGlobalAdmin ? '' : (adminUser?.assignedUnitId || ''),
        targetUnitId: '',
        reason: '',
      });
      setSelectedEmployeeId('');
      setSelectedTransferEmployee(null);
      setEmployeeSearch('');
      setTransferEmployees([]);
      setEmployeeSearchOpen(false);
      setProofFile(null);
      broadcastNotificationsChanged();
      broadcastWorkspaceDataChanged('transfer');
      await loadRequests();
    } catch (err: any) {
      setFormError(err.message || 'Failed to submit transfer request');
    } finally {
      setFormSubmitting(false);
    }
  };

  const selectTransferEmployee = (employee: TransferEmployee) => {
    setSelectedEmployeeId(employee.id);
    setSelectedTransferEmployee(employee);
    setEmployeeSearch('');
    setEmployeeSearchOpen(false);
    setActiveEmployeeIndex(-1);
    setEmployeeSearchError(null);
  };

  const clearTransferEmployee = () => {
    setSelectedEmployeeId('');
    setSelectedTransferEmployee(null);
    setEmployeeSearch('');
    setEmployeeSearchOpen(true);
    setActiveEmployeeIndex(transferEmployees.length ? 0 : -1);
  };

  // Check if current user is the original requester
  const isUserRequester = (req: TransferRequestItem | null | undefined): boolean => {
    if (!adminUser || !req) return false;
    return Boolean(
      (adminUser.employeeId && req.employeeId === adminUser.employeeId) ||
      (adminUser.email && req.employee?.email && adminUser.email.toLowerCase() === req.employee.email.toLowerCase())
    );
  };

  // Helper to determine if the currently logged in user can act on the request
  const canUserActOnStage = (req: TransferRequestItem): boolean => {
    if (!adminUser) return false;
    const role = adminUser.role || 'UNIT_ADMIN';

    if (role === 'UNIT_ADMIN') {
      return req.status === 'PENDING_TARGET_ADMIN' && adminUser.assignedUnitId === req.targetUnitId;
    }

    if (role === 'SUPER_ADMIN' || role === 'TECH_ADMIN') {
      return req.status === 'PENDING_TARGET_ADMIN';
    }

    return false;
  };
  // Filter requests based on tab
  const filteredRequests = useMemo(() => {
    if (activeTab === 'pending') {
      return requests.filter((r) => canUserActOnStage(r));
    }
    if (activeTab === 'my') {
      return requests.filter((r) => r.employee?.email === adminUser?.email || r.employeeId === adminUser?.employeeId);
    }
    return requests;
  }, [requests, activeTab, adminUser]);

  // Memoized filter helpers for Vacant Workstation Picker in approval modal
  const distinctTargetAreas = useMemo(() => {
    const set = new Set<string>();
    vacantSeatsForTargetFloor.forEach((s) => {
      const area = s.officeArea || s.zone || 'Unspecified Area';
      set.add(area);
    });
    return Array.from(set).sort();
  }, [vacantSeatsForTargetFloor]);

  const filteredVacantSeats = useMemo(() => {
    return vacantSeatsForTargetFloor.filter((s) => {
      if (approvalAreaId && s.areaId !== approvalAreaId) return false;
      if (targetSeatAreaFilter !== 'ALL' && (s.officeArea || s.zone || 'Unspecified Area') !== targetSeatAreaFilter) return false;
      if (targetSeatTypeFilter !== 'ALL' && (s.type || 'STANDARD_DESK') !== targetSeatTypeFilter) return false;
      if (targetSeatSearch.trim()) {
        const q = targetSeatSearch.toLowerCase();
        const matchLabel = s.label.toLowerCase().includes(q);
        const matchPc = s.pcNumber?.toLowerCase().includes(q);
        const matchArea = (s.officeArea || s.zone || '').toLowerCase().includes(q);
        const matchDept = s.department?.name?.toLowerCase().includes(q);
        if (!matchLabel && !matchPc && !matchArea && !matchDept) return false;
      }
      return true;
    });
  }, [approvalAreaId, vacantSeatsForTargetFloor, targetSeatAreaFilter, targetSeatTypeFilter, targetSeatSearch]);

  const selectedTargetSeatObj = useMemo(() => {
    return vacantSeatsForTargetFloor.find((s) => s.id === selectedTargetSeatId);
  }, [vacantSeatsForTargetFloor, selectedTargetSeatId]);

  const approvalFloorsForBuilding = useMemo(
    () => getTransferDestinationFloors(allFloors, approvalBuildingId),
    [allFloors, approvalBuildingId],
  );

  const approvalBuildingsForTargetUnit = useMemo(
    () => actionModal?.request
      ? getTransferDestinationBuildings(allBuildings, allPlants, actionModal.request.targetUnitId)
      : [],
    [actionModal?.request, allBuildings, allPlants],
  );

  const handleApprovalBuildingChange = (buildingId: string) => {
    approvalFloorRequestRef.current += 1;
    setApprovalBuildingId(buildingId);
    setApprovalFloorId('');
    setApprovalAreaId('');
    setApprovalSectionId('');
    setApprovalFunctionId('');
    setApprovalAreas([]);
    setApprovalSections([]);
    setApprovalFunctions([]);
    setSelectedTargetSeatId('');
    setVacantSeatsForTargetFloor([]);
    setTotalTargetFloorSeatsCount(0);
  };

  const handleApprovalFloorChange = async (floorId: string) => {
    const requestId = ++approvalFloorRequestRef.current;
    setApprovalFloorId(floorId);
    setApprovalAreaId('');
    setApprovalSectionId('');
    setApprovalFunctionId('');
    setApprovalAreas([]);
    setApprovalSections([]);
    setApprovalFunctions([]);
    setSelectedTargetSeatId('');
    setVacantSeatsForTargetFloor([]);
    setTotalTargetFloorSeatsCount(0);
    if (!floorId) return;

    try {
      const [areas, seats] = await Promise.all([
        apiRequest<AreaOption[]>(`/areas?floorId=${floorId}`),
        apiRequest<Seat[]>(`/seats?floorId=${floorId}`)
      ]);
      if (requestId !== approvalFloorRequestRef.current) return;
      setApprovalAreas(areas || []);
      setTotalTargetFloorSeatsCount(seats?.length || 0);
      setVacantSeatsForTargetFloor((seats || []).filter((seat) => !seat.employeeId && seat.status === 'AVAILABLE'));
    } catch (err) {
      if (requestId === approvalFloorRequestRef.current) {
        console.error('Failed to load destination floor filters:', err);
      }
    }
  };

  const handleApprovalDepartmentChange = async (departmentId: string) => {
    setApprovalDepartmentId(departmentId);
    setApprovalSectionId('');
    setApprovalFunctionId('');
    setApprovalFunctions([]);
    setApprovalSections(departmentId ? await apiRequest<SectionOption[]>(`/sections?departmentId=${departmentId}`) : []);
  };

  const handleApprovalSectionChange = async (sectionId: string) => {
    setApprovalSectionId(sectionId);
    setApprovalFunctionId('');
    setApprovalFunctions(sectionId ? await apiRequest<FunctionOption[]>(`/functions?sectionId=${sectionId}`) : []);
  };

  // Open action modal and fetch vacant seats for the Target Unit Admin decision.
  const openActionModal = async (
    req: TransferRequestItem,
    actionType: 'APPROVE' | 'REJECT'
  ) => {
    approvalFloorRequestRef.current += 1;
    setActionComment('');
    setSelectedTargetSeatId('');
    setApprovalBuildingId('');
    setApprovalFloorId('');
    setApprovalAreaId('');
    setApprovalDepartmentId('');
    setApprovalSectionId('');
    setApprovalFunctionId('');
    setApprovalAreas([]);
    setApprovalSections([]);
    setApprovalFunctions([]);
    setApprovalDepartments([]);
    setVacantSeatsForTargetFloor([]);
    setTotalTargetFloorSeatsCount(0);
    setTargetSeatSearch('');
    setTargetSeatAreaFilter('ALL');
    setTargetSeatTypeFilter('ALL');

    const requiresSeatPicker = actionType === 'APPROVE' && req.status === 'PENDING_TARGET_ADMIN';

    if (requiresSeatPicker && req.targetUnitId) {
      setLoadingVacantSeats(true);
      try {
        const [departments, plants, buildings, floors] = await Promise.all([
          apiRequest<DepartmentOption[]>(`/departments?unitId=${req.targetUnitId}`),
          apiRequest<Plant[]>(`/plants?unitId=${req.targetUnitId}`),
          apiRequest<Building[]>(`/buildings?unitId=${req.targetUnitId}`),
          apiRequest<Floor[]>(`/floors?unitId=${req.targetUnitId}`)
        ]);
        setApprovalDepartments(departments || []);
        setAllPlants(plants || []);
        setAllBuildings(buildings || []);
        setAllFloors(floors || []);
      } catch (err) {
        console.error('Failed to load target hierarchy for approval:', err);
      } finally {
        setLoadingVacantSeats(false);
      }
    }

    setActionModal({
      open: true,
      request: req,
      actionType,
    });
  };

  // Submit the Target Unit Admin decision.
  const handleActionSubmit = async () => {
    if (!actionModal.request || actionSubmitting) return;
    setActionSubmitting(true);

    try {
      await apiRequest(`/transfer-requests/${actionModal.request.id}/action`, {
        method: 'POST',
        body: JSON.stringify({
          action: actionModal.actionType,
          comment: actionComment || undefined,
          allocatedSeatId: selectedTargetSeatId || undefined,
          assignedTargetSeatId: selectedTargetSeatId || undefined,
          targetBuildingId: approvalBuildingId || undefined,
          targetFloorId: approvalFloorId || undefined,
          areaId: approvalAreaId || undefined,
          departmentId: approvalDepartmentId || undefined,
          sectionId: approvalSectionId || undefined,
          functionId: approvalFunctionId || undefined,
        }),
      });

      setActionModal({ open: false, request: null, actionType: 'APPROVE' });
      broadcastNotificationsChanged();
      broadcastWorkspaceDataChanged('transfer');
      await loadRequests();
    } catch (err: any) {
      const uniqueMessage = transferUniqueConflictMessage(err);
      const destinationMessage = transferDestinationConflictMessage(err);
      if (isTransferTransactionConflict(err) || uniqueMessage || destinationMessage) {
        try {
          const refreshedRequests = await loadRequests(true);
          const refreshedRequest = refreshedRequests.find((item) => item.id === actionModal.request?.id);
          if (!refreshedRequest || refreshedRequest.status !== 'PENDING_TARGET_ADMIN') {
            setActionModal({ open: false, request: null, actionType: 'APPROVE' });
            alert('This transfer was finalized by another administrator. The request list has been refreshed.');
          } else {
            setActionModal((current) => ({ ...current, request: refreshedRequest }));
            if (approvalFloorId) {
              const seats = await apiRequest<Seat[]>(`/seats?floorId=${approvalFloorId}`);
              const availableSeats = (seats || []).filter((seat) => !seat.employeeId && seat.status === 'AVAILABLE');
              setTotalTargetFloorSeatsCount(seats?.length || 0);
              setVacantSeatsForTargetFloor(availableSeats);
              if (!availableSeats.some((seat) => seat.id === selectedTargetSeatId)) setSelectedTargetSeatId('');
            }
            alert(uniqueMessage || destinationMessage || TRANSFER_TRANSACTION_CONFLICT_MESSAGE);
          }
        } catch (refreshError) {
          console.error('Failed to refresh transfer approval state:', refreshError);
          alert(uniqueMessage || destinationMessage || 'The approval conflicted with another transaction. Refresh the page and select a workstation again.');
        }
      } else {
        alert(`Action failed: ${err.message || 'Unknown error'}`);
      }
    } finally {
      setActionSubmitting(false);
    }
  };

  // Current transfer presentation is intentionally two-stage. Legacy approval
  // fields remain available on the response but are never rendered as active
  // workflow stages.
  const renderTransferProgress = (req: TransferRequestItem) => {
    const displayStatus = getTransferDisplayStatus(req.status);
    const decision = getTransferDecisionRecord(req);
    const sourceSubmission = req.sourceAdminApproval;
    const sourceActor = getTransferActorLabel(sourceSubmission, 'Source Unit Admin');
    const decisionActor = getTransferActorLabel(decision, 'Target Unit Admin');
    const targetUnitLabel = req.targetUnitName || req.targetUnit?.name || `Unit (${req.targetUnitId})`;
    const stage2Label = getTransferStage2Label(req.status);
    const stage2Icon = displayStatus === 'APPROVED' ? (
      <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
        <Check className="w-4 h-4" strokeWidth={2.5} />
      </div>
    ) : displayStatus === 'REJECTED' ? (
      <div className="w-7 h-7 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-xs">
        <X className="w-4 h-4" strokeWidth={2.5} />
      </div>
    ) : displayStatus === 'CANCELLED' ? (
      <div className="w-7 h-7 rounded-full bg-slate-500 text-white flex items-center justify-center shadow-xs">
        <X className="w-4 h-4" strokeWidth={2.5} />
      </div>
    ) : (
      <div className="w-7 h-7 rounded-full bg-amber-500 text-white flex items-center justify-center shadow-xs animate-pulse">
        <Clock className="w-4 h-4" />
      </div>
    );
    const stage2LabelClass = displayStatus === 'APPROVED'
      ? 'text-emerald-700'
      : displayStatus === 'REJECTED'
        ? 'text-rose-700'
        : displayStatus === 'CANCELLED'
          ? 'text-slate-700'
          : 'text-amber-700';

    return (
      <div className="w-full py-3.5 px-3 bg-slate-50/80 rounded-lg border border-slate-200/70 mt-3">
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <div className="flex flex-col items-center text-center px-1">
            <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-xs">
              <Check className="w-4 h-4" strokeWidth={2.5} />
            </div>
            <span className="text-[11px] leading-tight font-semibold text-emerald-700 mt-1">
              1. Source Unit Admin Request
            </span>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5">Submitted</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{sourceActor}</span>
            {sourceSubmission?.timestamp && (
              <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                {new Date(sourceSubmission.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            )}
          </div>

          <div className="hidden sm:block h-0.5 w-12 bg-emerald-300" />

          <div className="flex flex-col items-center text-center px-1">
            {stage2Icon}
            <span className={`text-[11px] leading-tight font-semibold mt-1 ${stage2LabelClass}`}>
              2. Target Unit Admin Decision
            </span>
            <span className={`text-[10px] font-medium mt-0.5 ${stage2LabelClass}`}>{stage2Label}</span>
            <span className="text-[10px] text-slate-400 mt-0.5">{targetUnitLabel}</span>
            {!decision && displayStatus === 'PENDING' ? (
              <span className="text-[9px] text-slate-400 mt-0.5">No decision recorded</span>
            ) : (
              <>
                <span className="text-[10px] text-slate-600 mt-0.5">{decisionActor}</span>
                {decision?.timestamp && (
                  <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                    {new Date(decision.timestamp).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </>
            )}
          </div>
        </div>

        {(displayStatus === 'REJECTED' || displayStatus === 'CANCELLED') && decision && (
          <div className={`mt-3 p-2.5 rounded text-xs flex items-start space-x-2 ${displayStatus === 'REJECTED' ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-slate-100 border border-slate-200 text-slate-700'}`}>
            {displayStatus === 'REJECTED' ? <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" /> : <X className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />}
            <div>
              <span className="font-semibold">{displayStatus === 'REJECTED' ? 'Rejected by' : 'Cancelled by'} {decisionActor}:</span>{' '}
              <span>{decision.comment || (displayStatus === 'REJECTED' ? 'No reason provided.' : 'Cancelled before approval.')}</span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="ios-page max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6 font-sans antialiased text-slate-900">
      <PageHeroHeader
        id="transfer-requests-title"
        eyebrow="Workforce movement"
        title="Transfer Requests"
        description="Track employee transfers, review requests and manage approvals across authorized Units."
        icon={GitPullRequest}
        actions={<>
          <span className="bg-purple-100 text-purple-800 border border-purple-200 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">Admin-to-Admin Cross-Unit Workflow</span>
          <div className="flex items-center space-x-2">
            <button onClick={() => { void loadRequests(); }} className="h-8.5 px-3 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-md text-xs font-medium flex items-center space-x-1.5 transition-all shadow-2xs">
              <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button onClick={() => { setFormError(null); setIsNewModalOpen(true); }} className="h-8.5 px-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-md text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-xs">
              <Plus className="w-3.5 h-3.5" />
              <span>Submit Seat Transfer Request</span>
            </button>
          </div>
        </>}
      />
      {/* Tabs Bar */}
      <div className="ios-tabs flex items-center justify-between border-b border-slate-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${activeTab === 'pending'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Action Required ({requests.filter(canUserActOnStage).length})</span>
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${activeTab === 'all'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <GitPullRequest className="w-3.5 h-3.5 text-slate-400" />
            <span>All Requests ({requests.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`pb-2.5 text-xs font-semibold flex items-center space-x-1.5 border-b-2 transition-all ${activeTab === 'my'
              ? 'border-slate-900 text-slate-900'
              : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
          >
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>My Transfers</span>
          </button>
        </div>

        <div className="text-[11px] text-slate-500 font-mono">
          Current Role: <span className="font-bold text-slate-800">{adminUser?.role || 'EMPLOYEE'}</span>
        </div>
      </div>

      {/* Main List */}
      {filteredRequests.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-12 text-center space-y-3">
          <GitPullRequest className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-sm font-semibold text-slate-800">No requests found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeTab === 'pending'
              ? 'There are currently no transfer requests waiting for your approval level.'
              : 'No transfer requests recorded in this category.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((req) => {
            const isExpanded = expandedRequestId === req.id;
            const canAct = canUserActOnStage(req);
            // direct cross-unit flow
            const isTargetAdminStage = req.status === 'PENDING_TARGET_ADMIN';
            const displayStatus = getTransferDisplayStatus(req.status);

            const fromUnit = req.sourceUnitName || req.sourceUnit?.name;
            const fromSeat = req.sourceSeatLabel || req.sourceSeat?.label;
            const toUnit = req.targetUnitName || req.targetUnit?.name || `Unit (${req.targetUnitId})`;
            const toFloor = req.targetFloorName || req.targetFloor?.name;
            const toSeat = req.targetSeatLabel || req.targetSeat?.label;

            return (
              <div
                key={req.id}
                className="bg-white rounded-lg border border-slate-200/90 shadow-2xs overflow-hidden transition-all"
              >
                {/* Request Card Header */}
                <div className="p-4 sm:p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2.5">
                      <span className="font-mono text-xs font-bold text-slate-900">
                        {req.requestNumber}
                      </span>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${req.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : req.status === 'REJECTED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : req.status === 'CANCELLED'
                              ? 'bg-slate-100 text-slate-700 border-slate-300'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                      >
                        {displayStatus}
                      </span>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(req.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>

                      {/* Image Proof Attachment Badge */}
                      {req.proofImageUrl && (
                        <button
                          type="button"
                          onClick={() => setLightboxImage({ url: req.proofImageUrl!, name: req.proofFileName || 'Proof Image' })}
                          className="inline-flex items-center space-x-1 px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded text-[10px] font-medium transition-all"
                          title="Click to view attached proof"
                        >
                          <ImageIcon className="w-3 h-3 text-blue-600" />
                          <span>Proof Attached</span>
                          <Eye className="w-3 h-3 text-blue-500 ml-0.5" />
                        </button>
                      )}
                    </div>

                    {/* Employee & Transfer Direction */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 pt-1">
                      <div className="flex items-center space-x-1.5 font-medium text-slate-900">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{req.employee?.fullName ?? 'Deleted Employee'}</span>
                        {req.employee?.employeeCode && (
                          <span className="text-slate-400 font-mono text-[11px]">
                            ({req.employee.employeeCode})
                          </span>
                        )}
                      </div>

                      <span className="text-slate-300">•</span>

                      {/* Source Location */}
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-400">From:</span>
                        <span className="font-semibold text-slate-700">
                          {fromUnit || 'Unassigned / Fresh Joinee'}
                        </span>
                        {fromSeat && (
                          <span className="bg-slate-100 font-mono text-[10px] px-1 rounded">
                            {fromSeat}
                          </span>
                        )}
                      </div>

                      <ArrowRight className="w-3 h-3 text-slate-400" />

                      {/* Target Location */}
                      <div className="flex items-center space-x-1">
                        <span className="text-slate-400">To:</span>
                        <span className="font-semibold text-slate-700">
                          {toUnit}
                        </span>
                        {toFloor && (
                          <span className="text-slate-500 text-[11px]">
                            {toFloor}
                          </span>
                        )}
                        {req.status === 'APPROVED' && toSeat ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-mono text-[10px] px-1.5 py-0.5 rounded font-bold">
                            {toSeat}
                          </span>
                        ) : displayStatus === 'REJECTED' ? (
                          <span className="bg-rose-50 text-rose-700 border border-rose-200 text-[10px] px-1.5 py-0.5 rounded italic">
                            Not Allocated (Rejected)
                          </span>
                        ) : displayStatus === 'CANCELLED' ? (
                          <span className="bg-slate-100 text-slate-700 border border-slate-300 text-[10px] px-1.5 py-0.5 rounded italic">
                            Cancelled before approval
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] px-1.5 py-0.5 rounded italic">
                            Pending Allocation by Target Unit Admin or Super Admin (on {toFloor || 'Target Floor'})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div className="flex items-center space-x-2 shrink-0">
                    {/* Action buttons if user can act */}
                    {canAct && (
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => openActionModal(req, 'APPROVE')}
                          className="h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center space-x-1 transition-all shadow-xs"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {isTargetAdminStage
                              ? `${adminUser?.role === 'SUPER_ADMIN' ? 'Allocate Seat & ' : ''}Approve & Finalize`
                              : 'Approve & Advance'}
                          </span>
                        </button>
                        <button
                          onClick={() => openActionModal(req, 'REJECT')}
                          className="h-8 px-2.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded text-xs font-semibold flex items-center space-x-1 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Reject</span>
                        </button>
                      </div>
                    )}

                    {/* Requester cancellation button */}
                    {!canAct && adminUser?.role === 'UNIT_ADMIN' && adminUser.assignedUnitId === req.sourceUnitId && req.status === 'PENDING_TARGET_ADMIN' && (
                      <button
                        onClick={async () => {
                          if (!window.confirm('Cancel this pending transfer request?')) return;
                          try {
                            await apiRequest(`/transfer-requests/${req.id}/cancel`, { method: 'POST' });
                            broadcastNotificationsChanged();
                            await loadRequests();
                          } catch (err: any) {
                            alert(`Cancellation failed: ${err.message || 'Unknown error'}`);
                          }
                        }}
                        className="h-8 px-2.5 bg-rose-50 border border-rose-300 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold flex items-center space-x-1 transition-all"
                        title="Cancel your pending transfer request"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Cancel</span>
                      </button>
                    )}

                    <button
                      onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                      className="h-8 w-8 rounded border border-slate-200 hover:bg-slate-50 flex items-center justify-center text-slate-500"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details & Stepper */}
                {isExpanded && (
                  <div className="border-t border-slate-100 p-4 sm:p-5 bg-white space-y-4">
                    {/* Reason & Attached Proof */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="md:col-span-2 bg-slate-50/80 rounded p-3 border border-slate-200/60 text-xs">
                        <span className="font-semibold text-slate-700 block mb-0.5">
                          Transfer Justification &amp; Business Reason:
                        </span>
                        <p className="text-slate-600">{req.reason}</p>
                      </div>

                      {/* Image Proof Card if available */}
                      <div className="bg-slate-50/80 rounded p-3 border border-slate-200/60 text-xs flex flex-col justify-between">
                        <div>
                          <span className="font-semibold text-slate-700 block mb-1">
                            Attached Proof / Documentation:
                          </span>
                          {req.proofImageUrl ? (
                            <div className="flex items-center space-x-3 mt-1">
                              <img
                                src={req.proofImageUrl}
                                alt="Proof thumbnail"
                                className="w-14 h-14 object-cover rounded border border-slate-300 cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => setLightboxImage({ url: req.proofImageUrl!, name: req.proofFileName || 'Proof Image' })}
                              />
                              <div className="space-y-1">
                                <span className="text-[11px] font-mono text-slate-700 truncate block max-w-[160px]">
                                  {req.proofFileName || 'proof_attachment.png'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setLightboxImage({ url: req.proofImageUrl!, name: req.proofFileName || 'Proof Image' })}
                                  className="text-[10px] text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1"
                                >
                                  <Eye className="w-3 h-3" />
                                  <span>View Full Image</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">No proof image attached</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Two-stage transfer progress */}
                    <div>
                      <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider block mb-1">
                        UNIT TRANSFER PROGRESS
                      </span>
                      {renderTransferProgress(req)}
                    </div>

                    {/* Two-stage decision records */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
                      {[
                        { title: '1. Source Unit Admin Request', data: req.sourceAdminApproval },
                        { title: '2. Target Unit Admin Decision', data: req.targetAdminApproval },
                      ].map((item, idx) => (
                        <div
                          key={idx}
                          className={`p-2.5 rounded border text-xs ${item.data
                            ? 'bg-slate-50 border-slate-200'
                            : 'bg-slate-50/40 border-dashed border-slate-200 text-slate-400'
                            }`}
                        >
                          <span className="font-semibold text-[11px] text-slate-700 block">
                            {item.title}
                          </span>
                          {item.data ? (
                            <div className="mt-1 space-y-0.5">
                              <span className="text-[10px] font-bold text-emerald-700 uppercase">
                                ✓ {item.data.action}
                              </span>
                              <div className="text-[10px] text-slate-600">
                                By: <span className="font-medium">{item.data.approverName || item.data.adminName || 'Approver'}</span>
                              </div>
                              {item.data.comment && (
                                <div className="text-[10px] italic text-slate-500 bg-white p-1 rounded border border-slate-100">
                                  "{item.data.comment}"
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-[10px] italic mt-1 block">{getTransferStage2Label(req.status)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Seat Transfer Request Modal (Cleaned-Up PO Version) */}
      {isNewModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Submit Seat Transfer Request</h3>
                <p className="text-xs text-slate-500">Submit a transfer request for approval by the destination Unit Admin or Super Admin</p>
              </div>
              <button
                onClick={() => setIsNewModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmitNewRequest} className="space-y-3.5">
              {/* Source Unit: selectable only for Super Admins; Unit Admins are
                  permanently constrained to their authenticated Unit. */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  SOURCE UNIT *
                </label>
                {isGlobalAdmin ? (
                  <select
                    required
                    value={formData.sourceUnitId}
                    onChange={(event) => handleSourceUnitChange(event.target.value)}
                    className="w-full h-8.5 px-2.5 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                  >
                    <option value="">Select the employee&apos;s current Unit</option>
                    {units.map((unit) => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name} ({unit.code})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex h-8.5 items-center justify-between rounded border border-slate-200 bg-slate-50 px-2.5 text-xs text-slate-700">
                    <span className="font-medium">
                      {selectedSourceUnit?.name || (adminUser?.assignedUnitId ? 'Assigned Unit' : 'No Unit assigned')}
                      {selectedSourceUnit?.code ? ` (${selectedSourceUnit.code})` : ''}
                    </span>
                    <span className="text-[10px] text-slate-400">Fixed to your assigned Unit</span>
                  </div>
                )}
                {isGlobalAdmin && (
                  <p className="text-[10px] text-slate-500">
                    Employee search is limited to the selected source Unit.
                  </p>
                )}
              </div>

              {/* Source employee */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  EMPLOYEE TO TRANSFER *
                </label>
                <div ref={employeeComboboxRef} className="relative">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      role="combobox"
                      aria-label="Search employees by Employee ID or Employee Name"
                      aria-required="true"
                      aria-autocomplete="list"
                      aria-expanded={employeeSearchOpen}
                      aria-controls="transfer-employee-listbox"
                      aria-activedescendant={activeEmployeeIndex >= 0 ? `transfer-employee-option-${activeEmployeeIndex}` : undefined}
                      value={employeeSearch}
                      onFocus={() => setEmployeeSearchOpen(true)}
                      onChange={(event) => {
                        setEmployeeSearch(event.target.value);
                        setEmployeeSearchOpen(true);
                        setEmployeeSearchError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                          event.preventDefault();
                          setEmployeeSearchOpen(false);
                          return;
                        }
                        if (event.key === 'ArrowDown') {
                          event.preventDefault();
                          if (visibleTransferEmployees.length) {
                            setEmployeeSearchOpen(true);
                            setActiveEmployeeIndex((current) => moveTransferEmployeeActiveIndex(current, visibleTransferEmployees.length, 1));
                          }
                          return;
                        }
                        if (event.key === 'ArrowUp') {
                          event.preventDefault();
                          if (visibleTransferEmployees.length) {
                            setEmployeeSearchOpen(true);
                            setActiveEmployeeIndex((current) => moveTransferEmployeeActiveIndex(current, visibleTransferEmployees.length, -1));
                          }
                          return;
                        }
                        if (event.key === 'Enter' && employeeSearchOpen && activeEmployeeIndex >= 0) {
                          event.preventDefault();
                          const employee = visibleTransferEmployees[activeEmployeeIndex];
                          if (employee) selectTransferEmployee(employee);
                        }
                      }}
                      placeholder="Search by Employee ID or Employee Name..."
                      className="w-full h-8.5 pl-8 pr-9 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                    />
                    {selectedTransferEmployee && (
                      <button
                        type="button"
                        onClick={clearTransferEmployee}
                        aria-label="Clear selected employee"
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-orange-50 hover:text-orange-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  {selectedTransferEmployee && (
                    <div className="mt-1.5 flex items-center justify-between rounded border border-orange-100 bg-orange-50/60 px-2.5 py-1.5 text-[11px] text-slate-700">
                      <span className="min-w-0 truncate">
                        <span className="font-semibold text-slate-900">{selectedTransferEmployee.employeeCode}</span>
                        <span className="mx-1 text-orange-500">—</span>
                        {selectedTransferEmployee.fullName}
                      </span>
                      <CheckCircle2 className="ml-2 h-3.5 w-3.5 shrink-0 text-orange-600" />
                    </div>
                  )}

                  {employeeSearchOpen && (
                    <div
                      id="transfer-employee-listbox"
                      role="listbox"
                      aria-label={sourceUnitId ? `Employees in ${selectedSourceUnit?.name || 'the selected source Unit'}` : 'Employees in the selected source Unit'}
                      className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-white p-1 shadow-lg"
                    >
                      {employeeSearchLoading && (
                        <div className="px-2.5 py-2 text-[11px] text-slate-500">Searching employees...</div>
                      )}
                      {!employeeSearchLoading && employeeSearchError && (
                        <div className="px-2.5 py-2 text-[11px] text-red-600">{employeeSearchError}</div>
                      )}
                      {!employeeSearchLoading && !employeeSearchError && visibleTransferEmployees.length === 0 && (
                        <div className="px-2.5 py-2 text-[11px] text-slate-500">
                          {!sourceUnitId
                            ? 'Select a source Unit before searching employees.'
                            : employeeSearch.trim()
                              ? 'No employees found. Try a different Employee ID or name.'
                              : `No employees found in ${selectedSourceUnit?.name || 'the selected source Unit'}.`}
                        </div>
                      )}
                      {!employeeSearchLoading && !employeeSearchError && visibleTransferEmployees.map((employee, index) => (
                        <button
                          type="button"
                          role="option"
                          id={`transfer-employee-option-${index}`}
                          aria-selected={selectedEmployeeId === employee.id}
                          key={employee.id}
                          onMouseDown={(event) => event.preventDefault()}
                          onClick={() => selectTransferEmployee(employee)}
                          className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-xs transition-colors ${activeEmployeeIndex === index ? 'bg-orange-50 text-slate-900' : 'text-slate-700 hover:bg-slate-50'
                            }`}
                        >
                          <span className="min-w-0 truncate">
                            <span className="font-semibold">{employee.employeeCode}</span>
                            <span className="mx-1 text-orange-500">—</span>
                            {employee.fullName}
                          </span>
                          {employee.department?.name && (
                            <span className="ml-2 max-w-[38%] truncate text-[10px] text-slate-400">{employee.department.name}</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <p className="text-[10px] text-slate-500">
                  Search results are loaded from the selected source Unit only.
                </p>
              </div>

              {/* Target Unit * dropdown */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  Target Unit *
                </label>
                <select
                  required
                  disabled={isGlobalAdmin && !sourceUnitId}
                  value={formData.targetUnitId}
                  onChange={(e) => handleUnitChange(e.target.value)}
                  className="w-full h-8.5 px-2.5 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                >
                  <option value="">Select a different target Unit</option>
                  {units
                    .filter((u) => u.id !== sourceUnitId)
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.code}) — {availableSeatsByUnit[u.id] ?? 0} available seats
                      </option>
                    ))}
                </select>
              </div>

              {/* Destination hierarchy is selected by the receiving Unit Admin. */}
              <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-start space-x-2">
                <span className="text-base shrink-0">ℹ️</span>
                <div>
                  <span className="font-semibold block">Workstation Allocation:</span>
                  <span className="text-[11px] text-blue-800">
                    The receiving Unit Admin will choose Building, Floor, Office / Area, Department, Section, Function, and Workstation during final approval.
                  </span>
                </div>
              </div>

              {/* Transfer Justification / Reason * */}
              <div className="space-y-1">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  Transfer Justification / Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData((prev) => ({ ...prev, reason: e.target.value }))}
                  placeholder="Detail project requirements, relocation purpose, or team re-alignment..."
                  className="w-full p-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-900"
                />
              </div>

              {/* Attach Image Proof with Preview, File Name, Size, and Remove Button */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                  Attach Image Proof (Optional)
                </label>

                {!proofFile ? (
                  <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-slate-400 transition-colors bg-slate-50/50">
                    <Paperclip className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-xs font-medium text-slate-700">Click to upload image proof</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">PNG, JPEG, JPG, WEBP (Max 1 MB)</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      onChange={handleProofFileChange}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img
                        src={proofFile.dataUrl}
                        alt="Preview"
                        className="w-12 h-12 object-cover rounded border border-slate-300"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-800 block truncate max-w-[220px]">
                          {proofFile.name}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {(proofFile.size / 1024).toFixed(1)} KB
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setProofFile(null)}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold px-2 py-1 rounded hover:bg-rose-50"
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsNewModalOpen(false)}
                  className="px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-4 py-1.5 rounded bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center space-x-1.5"
                >
                  {formSubmitting ? (
                    <span>Submitting...</span>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Submit Request</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Role-Specific Approval & Seat Allocation Modal */}
      {actionModal.open && actionModal.request && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl border border-slate-200 w-full max-w-md p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  {actionModal.actionType === 'REJECT'
                    ? (isUserRequester(actionModal.request) ? 'Withdraw Transfer Request' : 'Reject Transfer Request')
                    : actionModal.request.status === 'PENDING_TARGET_ADMIN'
                      ? `Workstation Allocation & ${adminUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Target Unit Admin'} Approval`
                      : `Confirm ${adminUser?.role === 'SUPER_ADMIN' ? 'Super Admin' : 'Target Unit Admin'} Decision`}
                </h3>
                <span className="text-[11px] font-mono text-slate-500">
                  {actionModal.request.requestNumber} • {actionModal.request.employee?.fullName ?? 'Deleted Employee'}
                </span>
              </div>
              <button
                onClick={() => setActionModal({ open: false, request: null, actionType: 'APPROVE' })}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Request Summary */}
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200/80 text-xs space-y-1">
              <div>
                <span className="text-slate-500 font-medium">Justification: </span>
                <span className="text-slate-800">{actionModal.request.reason}</span>
              </div>
              {actionModal.request.proofImageUrl && (
                <div className="flex items-center space-x-2 pt-1">
                  <span className="text-slate-500 font-medium">Proof:</span>
                  <button
                    type="button"
                    onClick={() => setLightboxImage({ url: actionModal.request!.proofImageUrl!, name: actionModal.request!.proofFileName || 'Proof Image' })}
                    className="inline-flex items-center space-x-1 text-blue-600 hover:underline text-[11px] font-semibold"
                  >
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>View Attached Proof Image</span>
                  </button>
                </div>
              )}
            </div>

            {/* Destination hierarchy is locked to the request's target Unit and
                selected only by the receiving decision-maker. */}
            {actionModal.actionType === 'APPROVE' && actionModal.request.status === 'PENDING_TARGET_ADMIN' && (
              <div className="space-y-2.5 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="text-[11px] font-bold uppercase tracking-wide text-slate-700">Destination Allocation</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Unit (Locked)</label>
                    <input
                      readOnly
                      value={actionModal.request.targetUnitName || actionModal.request.targetUnit?.name || actionModal.request.targetUnitId}
                      className="w-full h-8 px-2 text-xs border border-slate-200 rounded bg-slate-100 text-slate-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Building *</label>
                    <select
                      required
                      value={approvalBuildingId}
                      onChange={(e) => handleApprovalBuildingChange(e.target.value)}
                      className="w-full h-8 px-2 text-xs border border-slate-200 rounded bg-white"
                    >
                      <option value="">Select Building</option>
                      {approvalBuildingsForTargetUnit
                        .map((building) => <option key={building.id} value={building.id}>{building.name} ({building.code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Floor *</label>
                    <select
                      required
                      disabled={!approvalBuildingId}
                      value={approvalFloorId}
                      onChange={(e) => void handleApprovalFloorChange(e.target.value)}
                      className="w-full h-8 px-2 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100"
                    >
                      <option value="">Select Floor</option>
                      {approvalFloorsForBuilding.map((floor) => <option key={floor.id} value={floor.id}>{floor.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Office / Area</label>
                    <select
                      disabled={!approvalFloorId}
                      value={approvalAreaId}
                      onChange={(e) => {
                        setApprovalAreaId(e.target.value);
                        setSelectedTargetSeatId('');
                      }}
                      className="w-full h-8 px-2 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100"
                    >
                      <option value="">Any Area</option>
                      {approvalAreas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Department *</label>
                    <select
                      required
                      value={approvalDepartmentId}
                      onChange={(e) => void handleApprovalDepartmentChange(e.target.value)}
                      className="w-full h-8 px-2 text-xs border border-slate-200 rounded bg-white"
                    >
                      <option value="">Select Department</option>
                      {approvalDepartments.map((department) => <option key={department.id} value={department.id}>{department.name}{department.code ? ` (${department.code})` : ''}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Section</label>
                    <select
                      disabled={!approvalDepartmentId}
                      value={approvalSectionId}
                      onChange={(e) => void handleApprovalSectionChange(e.target.value)}
                      className="w-full h-8 px-2 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100"
                    >
                      <option value="">No Section</option>
                      {approvalSections.map((section) => <option key={section.id} value={section.id}>{section.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-slate-600 mb-1">Function</label>
                    <select
                      disabled={!approvalSectionId}
                      value={approvalFunctionId}
                      onChange={(e) => setApprovalFunctionId(e.target.value)}
                      className="w-full h-8 px-2 text-xs border border-slate-200 rounded bg-white disabled:bg-slate-100"
                    >
                      <option value="">No Function</option>
                      {approvalFunctions.map((fn) => <option key={fn.id} value={fn.id}>{fn.name}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Target workstation selection for the Unit Admin or Super Admin approval */}
            {actionModal.actionType === 'APPROVE' && actionModal.request.status === 'PENDING_TARGET_ADMIN' && (
              <div className="space-y-3 bg-amber-50/60 p-3.5 rounded-lg border border-amber-200">
                {/* Floor Vacancy Overview Header */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-amber-950 uppercase tracking-wide">
                      Allocate Destination Workstation *
                    </label>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mr-1.5 animate-pulse" />
                      {vacantSeatsForTargetFloor.length} Vacant Workstations
                    </span>
                  </div>

                  {/* Target Location Path Breadcrumb */}
                  <div className="flex items-center text-[11px] text-slate-600 bg-white/80 px-2.5 py-1.5 rounded border border-amber-200/80">
                    <MapPin className="w-3.5 h-3.5 text-amber-600 mr-1.5 shrink-0" />
                    <span className="font-medium text-slate-800">
                      {actionModal.request.targetUnitName || actionModal.request.targetUnit?.name || 'Target Unit'}
                    </span>
                    <span className="mx-1 text-slate-400">›</span>
                    <span>{allBuildings.find((building) => building.id === approvalBuildingId)?.name || 'Building'}</span>
                    <span className="mx-1 text-slate-400">›</span>
                    <span className="font-semibold text-slate-900">
                      {allFloors.find((floor) => floor.id === approvalFloorId)?.name || 'Target Floor'}
                    </span>
                    {totalTargetFloorSeatsCount > 0 && (
                      <span className="ml-auto text-[10px] text-slate-500 font-mono">
                        ({vacantSeatsForTargetFloor.length} vacant of {totalTargetFloorSeatsCount} desks)
                      </span>
                    )}
                  </div>
                </div>

                {!approvalFloorId ? (
                  <div className="p-3 bg-white border border-amber-200 rounded text-center text-xs text-amber-800">
                    Select a destination Building and Floor to load vacant workstations.
                  </div>
                ) : loadingVacantSeats ? (
                  <div className="text-xs text-amber-700 py-3 text-center font-mono animate-pulse">
                    Loading floor workstations and vacancy layout...
                  </div>
                ) : vacantSeatsForTargetFloor.length === 0 ? (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded text-center space-y-1">
                    <span className="text-xs text-rose-700 font-semibold block">
                      No Vacant Workstations Available on this Floor
                    </span>
                    <p className="text-[11px] text-rose-600">
                      Approval requires an available workstation. Please add or free up desks on this floor before approving.
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Multi-Criteria Filters */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      {/* Search */}
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                        <input
                          type="text"
                          value={targetSeatSearch}
                          onChange={(e) => setTargetSeatSearch(e.target.value)}
                          placeholder="Search desk, PC, area..."
                          className="w-full h-7.5 pl-7 pr-2 text-xs border border-amber-200 rounded bg-white text-slate-800 focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      {/* Area / Zone Dropdown */}
                      <div>
                        <select
                          value={targetSeatAreaFilter}
                          onChange={(e) => setTargetSeatAreaFilter(e.target.value)}
                          className="w-full h-7.5 px-2 text-xs border border-amber-200 rounded bg-white text-slate-800 focus:outline-none focus:border-amber-500"
                        >
                          <option value="ALL">All Seating Areas ({distinctTargetAreas.length})</option>
                          {distinctTargetAreas.map((area) => (
                            <option key={area} value={area}>
                              {area}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Seat Type Dropdown */}
                      <div>
                        <select
                          value={targetSeatTypeFilter}
                          onChange={(e) => setTargetSeatTypeFilter(e.target.value)}
                          className="w-full h-7.5 px-2 text-xs border border-amber-200 rounded bg-white text-slate-800 focus:outline-none focus:border-amber-500"
                        >
                          <option value="ALL">All Desk Types</option>
                          <option value="STANDARD_DESK">Standard Desk</option>
                          <option value="CABIN">Executive Cabin</option>
                          <option value="CUBICLE">Cubicle</option>
                          <option value="MEETING_ROOM">Meeting Room</option>
                        </select>
                      </div>
                    </div>

                    {/* Workstation Selection Dropdown */}
                    <div>
                      <select
                        required
                        value={selectedTargetSeatId}
                        onChange={(e) => setSelectedTargetSeatId(e.target.value)}
                        className="w-full h-9 px-2.5 text-xs border border-amber-400 rounded bg-white text-slate-900 font-mono font-medium focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="">-- Choose a Vacant Workstation ({filteredVacantSeats.length} matching) --</option>
                        {filteredVacantSeats.map((s) => {
                          const areaText = s.officeArea || s.zone || 'General Bay';
                          const pcText = s.pcNumber ? ` • PC: ${s.pcNumber}` : '';
                          const deptText = s.department?.name ? ` • Dept: ${s.department.name}` : '';
                          const typeText = s.type ? s.type.replace(/_/g, ' ') : 'Standard Desk';
                          return (
                            <option key={s.id} value={s.id}>
                              🟢 {s.label} — VACANT | Area: {areaText}{deptText} | {typeText}{pcText}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Quick-Pick Cards Grid (First 9 filtered seats for fast 1-click selection) */}
                    {filteredVacantSeats.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-amber-800 font-medium block">
                          Quick Select from Matching Desks:
                        </span>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 max-h-40 overflow-y-auto p-1 bg-white/70 rounded border border-amber-200/70">
                          {filteredVacantSeats.slice(0, 9).map((s) => {
                            const isSelected = selectedTargetSeatId === s.id;
                            return (
                              <button
                                key={s.id}
                                type="button"
                                onClick={() => setSelectedTargetSeatId(s.id)}
                                className={`p-2 rounded text-left text-xs transition border flex flex-col justify-between ${isSelected
                                  ? 'bg-amber-100/90 border-amber-600 text-amber-950 font-semibold ring-1 ring-amber-500 shadow-xs'
                                  : 'bg-white border-slate-200 hover:border-amber-300 text-slate-700'
                                  }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="font-mono font-bold text-xs">{s.label}</span>
                                  </div>
                                  <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.2 rounded border border-emerald-200">
                                    VACANT
                                  </span>
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
                    {selectedTargetSeatObj && (
                      <div className="p-3 bg-emerald-50/90 border border-emerald-300 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <span className="p-1 rounded bg-emerald-200 text-emerald-800">
                              <Armchair className="w-4 h-4" />
                            </span>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="font-mono font-bold text-emerald-950 text-sm">
                                  {selectedTargetSeatObj.label}
                                </span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                                  🟢 VACANT
                                </span>
                              </div>
                              <span className="text-[11px] text-emerald-800 font-medium">
                                Area: {selectedTargetSeatObj.officeArea || selectedTargetSeatObj.zone || 'General Floor Area'}
                              </span>
                            </div>
                          </div>
                          {selectedTargetSeatObj.pcNumber ? (
                            <span className="font-mono text-xs px-2 py-1 bg-white text-slate-800 font-semibold rounded border border-emerald-300">
                              PC: {selectedTargetSeatObj.pcNumber}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded border border-slate-200">
                              No PC Tag
                            </span>
                          )}
                        </div>

                        {/* Location Details: Building, Floor, Type & Department */}
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1.5 border-t border-emerald-200/80 text-emerald-900">
                          <div>
                            <span className="text-emerald-700 font-normal">Location: </span>
                            <span className="font-medium">
                              {selectedTargetSeatObj.floor?.building?.name || actionModal.request.targetBuildingName || 'Building'} • {selectedTargetSeatObj.floor?.name || actionModal.request.targetFloorName || 'Floor'}
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-700 font-normal">Desk Type: </span>
                            <span className="font-medium capitalize">
                              {selectedTargetSeatObj.type ? selectedTargetSeatObj.type.replace(/_/g, ' ').toLowerCase() : 'Standard Desk'}
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-700 font-normal">Seating Area: </span>
                            <span className="font-medium">
                              {selectedTargetSeatObj.officeArea || selectedTargetSeatObj.zone || 'General Bay'}
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-700 font-normal">Department: </span>
                            <span className="font-medium">
                              {selectedTargetSeatObj.department?.name || 'Any / Multi-purpose'}
                            </span>
                          </div>
                        </div>

                        <div className="text-[10px] text-emerald-700 flex items-center pt-0.5">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600 shrink-0" />
                          <span>Ready for ACID atomic transfer: assigns employee & updates unit records upon approval.</span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* Comment / Reason */}
            <div className="space-y-1">
              <label className="block text-[11px] font-semibold text-slate-700 uppercase">
                {actionModal.actionType === 'REJECT'
                  ? (isUserRequester(actionModal.request) ? 'Reason for Withdrawal *' : 'Rejection Reason *')
                  : 'Approval Comment (Optional)'}
              </label>
              <textarea
                required={actionModal.actionType === 'REJECT'}
                rows={3}
                value={actionComment}
                onChange={(e) => setActionComment(e.target.value)}
                placeholder={
                  actionModal.actionType === 'REJECT'
                    ? 'Provide mandatory justification for rejecting request...'
                    : 'Add notes for handover, relocation timing, etc...'
                }
                className="w-full p-2 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setActionModal({ open: false, request: null, actionType: 'APPROVE' })}
                className="px-3 py-1.5 rounded border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleActionSubmit}
                disabled={
                  actionSubmitting ||
                  (actionModal.actionType === 'REJECT' && !actionComment.trim()) ||
                  (actionModal.actionType === 'APPROVE' && actionModal.request.status === 'PENDING_TARGET_ADMIN' &&
                    (!selectedTargetSeatId || !approvalFloorId || !approvalBuildingId || !approvalDepartmentId))
                }
                className={`px-4 py-1.5 rounded text-white text-xs font-semibold flex items-center space-x-1.5 disabled:opacity-50 ${actionModal.actionType === 'REJECT'
                  ? 'bg-rose-600 hover:bg-rose-700'
                  : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
              >
                {actionSubmitting ? (
                  <span>Processing...</span>
                ) : (
                  <span>
                    {actionModal.actionType === 'REJECT'
                      ? (isUserRequester(actionModal.request) ? 'Confirm Withdrawal' : 'Confirm Rejection')
                      : 'Confirm & Allocate Workstation'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image Proof Lightbox Modal */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl border border-slate-700 max-w-3xl w-full p-4 space-y-3 relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-2">
                <ImageIcon className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800">{lightboxImage.name}</span>
              </div>
              <button
                onClick={() => setLightboxImage(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-full hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[75vh] flex items-center justify-center overflow-auto bg-slate-100 rounded-lg p-2">
              <img
                src={lightboxImage.url}
                alt={lightboxImage.name}
                className="max-h-[70vh] max-w-full object-contain rounded shadow"
              />
            </div>

            <div className="flex justify-end pt-1">
              <a
                href={lightboxImage.url}
                download={lightboxImage.name}
                className="text-xs font-semibold text-blue-600 hover:underline px-3 py-1"
              >
                Download Image
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
