import { ReconciliationStatus, ReconciliationClassification } from '../enums/index.js';

export interface ReconciliationFieldDiff {
  field: string;
  excelValue: string;
  systemValue: string;
  isMatch: boolean;
  status: 'MATCH' | 'MISMATCH' | 'FORMATTING_ONLY';
}

export interface ReconciliationCaseSummary {
  id: string;
  employeeCode: string;
  employeeName: string;
  departmentName: string;
  unitName: string;
  status: ReconciliationStatus;
  classification: ReconciliationClassification;
  mismatchedFields: string[];
  fieldDiffCount: number;
  mismatchCount: number;
  allFieldsMatch: boolean;
  hasDuplicateExcel: boolean;
  hasApprovedTransfer: boolean;
  notes: string | null;
  updatedAt: string;
}

export interface ReconciliationHierarchyEvidence {
  unit?: { id: string; name: string; code: string } | null;
  plant?: { id: string; name: string; code: string } | null;
  building?: { id: string; name: string; code: string } | null;
  floor?: { id: string; name: string; floorNumber: number } | null;
  department?: { id: string; name: string; code: string } | null;
  section?: { id: string; name: string } | null;
  functionName?: string | null;
}

export interface ReconciliationTransferEvidence {
  id: string;
  requestNumber: string;
  status: string;
  createdAt: string;
  sourceUnitName?: string | null;
  targetUnitName?: string | null;
  sourceFloorName?: string | null;
  targetFloorName?: string | null;
  sourceSeatLabel?: string | null;
  targetSeatLabel?: string | null;
}

export interface ReconciliationEvidence {
  currentRecord: Record<string, any> | null;
  currentSeat: Record<string, any> | null;
  hierarchy: ReconciliationHierarchyEvidence;
  transferHistory: ReconciliationTransferEvidence[];
  hasApprovedTransfer: boolean;
  explainsMismatch: boolean;
  duplicateExcelRows: Record<string, any>[];
  auditLogs: Record<string, any>[];
  excelRowDetails: {
    sheet: string;
    row: number;
    excelData: Record<string, any>;
  };
}

export interface ReconciliationCaseDetail {
  id: string;
  employeeCode: string;
  employeeName: string;
  status: ReconciliationStatus;
  classification: ReconciliationClassification;
  notes: string | null;
  snapshotUpdatedAt: string;
  diff: ReconciliationFieldDiff[];
  mismatchCount: number;
  allFieldsMatch: boolean;
  evidence: ReconciliationEvidence;
}

export interface ReconciliationSummaryMetrics {
  totalCases: number;
  totalExcelEmployees: number;
  matchedEmployees: number;
  openMismatches: number;
  resolvedMismatches: number;
  needsReview: number;
  excelStale: number;
  systemCorrectionRequired: number;
  formattingOnly: number;
  blocked: number;
}

export interface ReconciliationPreviewResult {
  valid: boolean;
  canApply: boolean;
  diffs: Array<{ field: string; current: string; proposed: string }>;
  validationErrors: string[];
  seatConflict: {
    hasConflict: boolean;
    occupiedBy?: { employeeId: string; employeeCode: string; fullName: string };
    seatLabel?: string;
    floorName?: string;
    message?: string;
  } | null;
  snapshotUpdatedAt: string;
}
