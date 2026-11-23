import { apiRequest } from './client';

export type ReconciliationStatus =
  | 'OPEN'
  | 'NEEDS_REVIEW'
  | 'EXCEL_STALE'
  | 'SYSTEM_CORRECTION_REQUIRED'
  | 'FORMATTING_ONLY'
  | 'RESOLVED'
  | 'BLOCKED'
  | 'REOPENED';

export type ReconciliationClassification =
  | 'EXPECTED_LIVE_CHANGE'
  | 'EXCEL_STALE'
  | 'SYSTEM_WRONG'
  | 'FORMATTING_ONLY'
  | 'DUPLICATE_EXCEL_CONFLICT'
  | 'UNKNOWN';

export type ComparisonFieldStatus = 'SAME' | 'DIFFERENCE' | 'RESOLVED' | 'BLOCKED';

export interface FieldComparison {
  field: string;
  fieldLabel: string;
  excelValue: string | null;
  systemValue: string | null;
  status: ComparisonFieldStatus;
  notes?: string | null;
}

function normalizeComparisonStatus(status: string | undefined, isMatch?: boolean): ComparisonFieldStatus {
  if (status === 'MISMATCH' || status === 'DIFFERENCE') return 'DIFFERENCE';
  if (status === 'BLOCKED') return 'BLOCKED';
  if (status === 'RESOLVED') return 'RESOLVED';
  return isMatch === false ? 'DIFFERENCE' : 'SAME';
}

export interface TransferExplanation {
  id: string;
  requestNumber?: string;
  status: string;
  fromLocation?: string;
  toLocation?: string;
  approvedAt?: string | null;
  explainsMismatch: boolean;
  explanationNote?: string;
}

export interface DuplicateExcelConflict {
  isDuplicate: boolean;
  count: number;
  occurrences: Array<{
    rowNumber: number;
    sheetName?: string;
    details?: string;
    values?: Record<string, string | null>;
  }>;
  warningMessage?: string;
}

export interface ReconciliationAuditEntry {
  id: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details?: string;
}

export interface EvidenceData {
  currentRecord: {
    id: string;
    employeeCode: string;
    fullName: string;
    email?: string | null;
    status: string;
    designation?: string | null;
    updatedAt?: string;
  } | null;
  currentSeat: {
    id: string;
    label: string;
    floorName?: string | null;
    roomOrArea?: string | null;
    buildingName?: string | null;
    status: string;
    type?: string;
  } | null;
  hierarchy: {
    unitName?: string | null;
    plantName?: string | null;
    buildingName?: string | null;
    floorName?: string | null;
    departmentName?: string | null;
    sectionName?: string | null;
    functionName?: string | null;
  };
  transferHistory: TransferExplanation[];
  hasApprovedExplainingTransfer: boolean;
  duplicateConflict?: DuplicateExcelConflict | null;
  recentAuditLogs: ReconciliationAuditEntry[];
  excelRowInfo?: {
    rowNumber?: number;
    sheetName?: string;
    rawValues?: Record<string, any>;
  };
}

export interface ReconciliationCase {
  id: string;
  employeeCode: string;
  employeeName: string;
  status: ReconciliationStatus;
  classification: ReconciliationClassification;
  unitName?: string | null;
  departmentName?: string | null;
  fieldComparisons: FieldComparison[];
  mismatchCount: number;
  allFieldsMatch?: boolean;
  evidence: EvidenceData;
  reviewNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  employeeSnapshotUpdatedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReconciliationSummary {
  totalExcelEmployees?: number;
  totalCases?: number;
  matchedEmployees: number;
  openMismatches: number;
  resolvedMismatches: number;
  needsReview: number;
  excelStale: number;
  systemCorrectionRequired: number;
  formattingOnly: number;
  blockedAmbiguous?: number;
  blocked?: number;
}

export type BulkPlanItemStatus =
  | 'NO_CHANGE'
  | 'SAFE_FIELD_UPDATE'
  | 'SAFE_SEAT_ASSIGNMENT'
  | 'SAFE_SEAT_MOVE'
  | 'BLOCKED_DUPLICATE_EXCEL'
  | 'BLOCKED_DUPLICATE_WORKSTATION'
  | 'BLOCKED_OCCUPIED_TARGET_SEAT'
  | 'BLOCKED_INVALID_HIERARCHY'
  | 'BLOCKED_AMBIGUOUS_MAPPING'
  | 'BLOCKED_OTHER'
  | 'STALE';

export interface BulkReconciliationPlanItem {
  employeeCode: string;
  employeeId?: string;
  employeeName: string;
  excelRowNumbers: number[];
  status: BulkPlanItemStatus;
  reasons: string[];
  changedFields: string[];
  currentSeatLabel?: string | null;
  proposedSeatLabel?: string | null;
}

export interface BulkReconciliationPlan {
  runId: string;
  sourceFilename: string;
  sourceHash: string;
  generatedAt: string;
  counts: Record<BulkPlanItemStatus | 'FORMATTING_ONLY' | 'TOTAL', number>;
  items: BulkReconciliationPlanItem[];
}

export interface ReconciliationFiltersQuery {
  page?: number;
  limit?: number;
  status?: string;
  classification?: string;
  unit?: string;
  unitId?: string;
  department?: string;
  departmentId?: string;
  mismatchField?: string;
  search?: string;
}

export interface ReconciliationCasesResponse {
  cases: ReconciliationCase[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  total?: number;
  page?: number;
  limit?: number;
  totalPages?: number;
  summary?: ReconciliationSummary;
}

export interface CorrectionPreviewResponse {
  caseId: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  fieldDiffs: Array<{
    field: string;
    fieldLabel: string;
    currentValue: string | null;
    proposedValue: string | null;
    validationStatus: 'VALID' | 'WARNING' | 'INVALID';
    validationMessage?: string;
  }>;
  hierarchyValidation: {
    isValid: boolean;
    unitExists: boolean;
    buildingBelongsToUnit: boolean;
    floorBelongsToBuilding: boolean;
    deptValid: boolean;
    warnings: string[];
    errors: string[];
  };
  seatConflict: {
    hasConflict: boolean;
    targetSeatLabel?: string;
    currentOccupant?: string | null;
    status: 'AVAILABLE' | 'OCCUPIED' | 'NOT_FOUND' | 'NO_CHANGE';
    warning?: string;
    isBlocked: boolean;
  };
  snapshotUpdatedAt: string;
  canApply: boolean;
}

export function normalizeReconciliationCase(raw: any): ReconciliationCase {
  if (!raw) return raw;
  const rawDiff = raw.diff || raw.fieldComparisons || [];
  const fieldComparisons: FieldComparison[] = rawDiff.map((item: any) => ({
    field: item.field || item.fieldName || '',
    fieldLabel: item.fieldLabel || item.label || item.field || '',
    excelValue: item.excelValue !== undefined ? item.excelValue : null,
    systemValue: item.systemValue !== undefined ? item.systemValue : null,
    status: normalizeComparisonStatus(item.status, item.isMatch),
    notes: item.notes || null,
  }));

  const rawEvidence = raw.evidence || {};
  const duplicateConflict = rawEvidence.duplicateConflict || (rawEvidence.duplicateExcelRows ? {
    isDuplicate: Array.isArray(rawEvidence.duplicateExcelRows) && rawEvidence.duplicateExcelRows.length > 1,
    count: Array.isArray(rawEvidence.duplicateExcelRows) ? rawEvidence.duplicateExcelRows.length : 0,
    occurrences: Array.isArray(rawEvidence.duplicateExcelRows)
      ? rawEvidence.duplicateExcelRows.map((row: any, idx: number) => ({
          rowNumber: row.rowNumber || row.rowIndex || idx + 1,
          sheetName: row.sheetName,
          details: typeof row === 'object' ? JSON.stringify(row) : String(row),
        }))
      : [],
    warningMessage: 'Multiple Excel rows found for this employee identifier with conflicting data.',
  } : null);

  const transferList: TransferExplanation[] = (rawEvidence.transferHistory || []).map((t: any) => ({
    id: t.id || t.requestId || Math.random().toString(),
    requestNumber: t.requestNumber || t.code || t.id,
    status: t.status || 'APPROVED',
    fromLocation: t.fromLocation || t.sourceLocation,
    toLocation: t.toLocation || t.targetLocation,
    approvedAt: t.approvedAt || t.completedAt || t.createdAt,
    explainsMismatch: Boolean(t.explainsMismatch || t.explainsDiscrepancy || t.status === 'APPROVED'),
    explanationNote: t.explanationNote || t.notes || t.reason,
  }));

  const hasApprovedExplainingTransfer = Boolean(
    rawEvidence.hasApprovedExplainingTransfer !== undefined
      ? rawEvidence.hasApprovedExplainingTransfer
      : transferList.some((t) => t.explainsMismatch)
  );

  return {
    id: raw.id || raw._id,
    employeeCode: raw.employeeCode || raw.code || '',
    employeeName: raw.employeeName || raw.name || '',
    status: raw.status || 'OPEN',
    classification: raw.classification || 'UNKNOWN',
    unitName: raw.unitName || raw.unit?.name || null,
    departmentName: raw.departmentName || raw.department?.name || null,
    fieldComparisons,
    mismatchCount: raw.mismatchCount ?? raw.fieldDiffCount ?? fieldComparisons.filter((c) => c.status === 'DIFFERENCE').length,
    allFieldsMatch: raw.allFieldsMatch ?? (raw.mismatchCount ?? raw.fieldDiffCount ?? fieldComparisons.filter((c) => c.status === 'DIFFERENCE').length) === 0,
    evidence: {
      currentRecord: rawEvidence.currentRecord || null,
      currentSeat: rawEvidence.currentSeat || null,
      hierarchy: rawEvidence.hierarchy || {},
      transferHistory: transferList,
      hasApprovedExplainingTransfer,
      duplicateConflict,
      recentAuditLogs: rawEvidence.recentAuditLogs || rawEvidence.auditLogs || [],
      excelRowInfo: rawEvidence.excelRowInfo || rawEvidence.excelRowDetails || {},
    },
    reviewNotes: raw.reviewNotes || raw.notes || null,
    resolvedAt: raw.resolvedAt || null,
    resolvedBy: raw.resolvedBy || null,
    employeeSnapshotUpdatedAt: raw.snapshotUpdatedAt || raw.employeeSnapshotUpdatedAt,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

export async function fetchReconciliationSummary(): Promise<ReconciliationSummary> {
  const res = await apiRequest<any>('/data-reconciliation/summary');
  return {
    totalExcelEmployees: res.totalExcelEmployees ?? res.totalCases ?? 0,
    totalCases: res.totalCases ?? res.totalExcelEmployees ?? 0,
    matchedEmployees: res.matchedEmployees ?? 0,
    openMismatches: res.openMismatches ?? 0,
    resolvedMismatches: res.resolvedMismatches ?? 0,
    needsReview: res.needsReview ?? 0,
    excelStale: res.excelStale ?? 0,
    systemCorrectionRequired: res.systemCorrectionRequired ?? 0,
    formattingOnly: res.formattingOnly ?? 0,
    blockedAmbiguous: res.blockedAmbiguous ?? res.blocked ?? 0,
    blocked: res.blocked ?? res.blockedAmbiguous ?? 0,
  };
}

export async function fetchReconciliationCases(
  filters: ReconciliationFiltersQuery = {}
): Promise<ReconciliationCasesResponse> {
  const params = new URLSearchParams();
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  if (filters.status && filters.status !== 'ALL') params.set('status', filters.status);
  if (filters.classification && filters.classification !== 'ALL') params.set('classification', filters.classification);
  if (filters.unitId && filters.unitId !== 'ALL') {
    params.set('unitId', filters.unitId);
  } else if (filters.unit && filters.unit !== 'ALL') {
    params.set('unit', filters.unit);
    params.set('unitId', filters.unit);
  }
  if (filters.departmentId && filters.departmentId !== 'ALL') {
    params.set('departmentId', filters.departmentId);
  } else if (filters.department && filters.department !== 'ALL') {
    params.set('department', filters.department);
    params.set('departmentId', filters.department);
  }
  if (filters.mismatchField && filters.mismatchField !== 'ALL') params.set('mismatchField', filters.mismatchField);
  if (filters.search && filters.search.trim()) params.set('search', filters.search.trim());

  const query = params.toString() ? `?${params.toString()}` : '';
  const res = await apiRequest<any>(`/data-reconciliation/cases${query}`);

  const rawCases: any[] = res.cases || [];
  const normalizedCases = rawCases.map(normalizeReconciliationCase);
  const total = res.total ?? res.pagination?.total ?? normalizedCases.length;
  const page = res.page ?? res.pagination?.page ?? filters.page ?? 1;
  const limit = res.limit ?? res.pagination?.limit ?? filters.limit ?? 25;
  const totalPages = res.totalPages ?? res.pagination?.totalPages ?? Math.ceil(total / limit);

  return {
    cases: normalizedCases,
    total,
    page,
    limit,
    totalPages,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
    summary: res.summary ? {
      totalExcelEmployees: res.summary.totalExcelEmployees ?? res.summary.totalCases ?? 0,
      totalCases: res.summary.totalCases ?? res.summary.totalExcelEmployees ?? 0,
      matchedEmployees: res.summary.matchedEmployees ?? 0,
      openMismatches: res.summary.openMismatches ?? 0,
      resolvedMismatches: res.summary.resolvedMismatches ?? 0,
      needsReview: res.summary.needsReview ?? 0,
      excelStale: res.summary.excelStale ?? 0,
      systemCorrectionRequired: res.summary.systemCorrectionRequired ?? 0,
      formattingOnly: res.summary.formattingOnly ?? 0,
      blockedAmbiguous: res.summary.blockedAmbiguous ?? res.summary.blocked ?? 0,
      blocked: res.summary.blocked ?? res.summary.blockedAmbiguous ?? 0,
    } : undefined,
  };
}

export async function fetchReconciliationCase(id: string): Promise<ReconciliationCase> {
  const res = await apiRequest<any>(`/data-reconciliation/cases/${encodeURIComponent(id)}`);
  return normalizeReconciliationCase(res);
}

export async function generateReconciliationPlan(): Promise<BulkReconciliationPlan> {
  return apiRequest<BulkReconciliationPlan>('/data-reconciliation/bulk-plan', { method: 'POST' });
}

export async function applyReconciliationPlan(runId: string): Promise<{
  runId: string;
  sourceHash: string;
  applied: number;
  stale: number;
  blocked: number;
  errors: number;
}> {
  return apiRequest('/data-reconciliation/bulk-apply', {
    method: 'POST',
    body: JSON.stringify({ runId }),
  });
}

export async function previewReconciliationCorrection(id: string): Promise<CorrectionPreviewResponse> {
  const res = await apiRequest<any>(`/data-reconciliation/cases/${encodeURIComponent(id)}/preview`, {
    method: 'POST',
  });

  const rawDiffs = res.diffs || res.fieldDiffs || [];
  const fieldDiffs = rawDiffs.map((d: any) => ({
    field: d.field || d.name || '',
    fieldLabel: d.fieldLabel || d.label || d.field || '',
    currentValue: d.currentValue !== undefined ? d.currentValue : (d.systemValue !== undefined ? d.systemValue : null),
    proposedValue: d.proposedValue !== undefined ? d.proposedValue : (d.excelValue !== undefined ? d.excelValue : null),
    validationStatus: d.validationStatus || (d.isValid === false ? 'INVALID' : 'VALID'),
    validationMessage: d.validationMessage || d.message || undefined,
  }));

  const rawHierarchy = res.hierarchyValidation || {};
  const validationErrors = res.validationErrors || [];
  const hierarchyValidation = {
    isValid: res.valid !== undefined ? Boolean(res.valid) : (rawHierarchy.isValid ?? validationErrors.length === 0),
    unitExists: rawHierarchy.unitExists ?? true,
    buildingBelongsToUnit: rawHierarchy.buildingBelongsToUnit ?? true,
    floorBelongsToBuilding: rawHierarchy.floorBelongsToBuilding ?? true,
    deptValid: rawHierarchy.deptValid ?? true,
    warnings: rawHierarchy.warnings || [],
    errors: rawHierarchy.errors || (Array.isArray(validationErrors) ? validationErrors : []),
  };

  const rawSeat = res.seatConflict || {};
  const isOccupied = rawSeat.status === 'OCCUPIED' || Boolean(rawSeat.currentOccupant) || Boolean(rawSeat.hasConflict);
  const seatConflict = {
    hasConflict: rawSeat.hasConflict ?? isOccupied,
    targetSeatLabel: rawSeat.targetSeatLabel || rawSeat.seatLabel || rawSeat.label,
    currentOccupant: rawSeat.currentOccupant || rawSeat.occupantName || null,
    status: rawSeat.status || (isOccupied ? 'OCCUPIED' : 'AVAILABLE'),
    warning: rawSeat.warning || (isOccupied ? `Workstation ${rawSeat.targetSeatLabel || ''} is occupied by ${rawSeat.currentOccupant || 'another employee'}.` : undefined),
    isBlocked: rawSeat.isBlocked ?? isOccupied,
  };

  const canApply = res.canApply !== undefined ? Boolean(res.canApply) : (Boolean(res.valid) && !seatConflict.isBlocked);

  return {
    caseId: res.caseId || id,
    employeeId: res.employeeId || '',
    employeeCode: res.employeeCode || '',
    employeeName: res.employeeName || '',
    fieldDiffs,
    hierarchyValidation,
    seatConflict,
    snapshotUpdatedAt: res.snapshotUpdatedAt || new Date().toISOString(),
    canApply,
  };
}

export async function applyReconciliationCorrection(
  id: string,
  payload: { snapshotUpdatedAt: string; notes?: string }
): Promise<{ success: boolean; message: string; case: ReconciliationCase }> {
  return apiRequest<{ success: boolean; message: string; case: ReconciliationCase }>(
    `/data-reconciliation/cases/${encodeURIComponent(id)}/apply`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    }
  );
}

export async function resolveReconciliationCase(
  id: string,
  payload: { resolutionType: 'KEEP_CURRENT' | 'FORMATTING_ONLY'; notes?: string }
): Promise<ReconciliationCase> {
  return apiRequest<ReconciliationCase>(`/data-reconciliation/cases/${encodeURIComponent(id)}/resolve`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function markReconciliationNeedsReview(
  id: string,
  payload: { notes: string }
): Promise<ReconciliationCase> {
  return apiRequest<ReconciliationCase>(`/data-reconciliation/cases/${encodeURIComponent(id)}/needs-review`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function reopenReconciliationCase(
  id: string,
  payload?: { notes?: string }
): Promise<ReconciliationCase> {
  return apiRequest<ReconciliationCase>(`/data-reconciliation/cases/${encodeURIComponent(id)}/reopen`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });
}
