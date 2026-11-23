import { apiRequest } from './client';

export type InitialImportStatus = {
  status: string;
  sourceFilename: string | null;
  sourceHash: string | null;
  startedAt: string | null;
  completedAt: string | null;
  processedRows: number;
  successfulRows: number;
  blockedRows: number;
  failedRows: number;
  databasePopulated: boolean;
  mode: string;
  verification: Record<string, unknown> | null;
};

export type InitialImportPlan = {
  runId: string;
  sourceFilename: string;
  sourceHash: string;
  source: Record<string, number>;
  counts: Record<string, number>;
  blockers: Array<Record<string, unknown>>;
  extraRecords: Array<Record<string, unknown>>;
};

export type InitialImportOverride = {
  sourceHash: string;
  sheet: 'Sheet1';
  rowNumber: number;
  field: string;
  originalValue?: unknown;
  correctedValue: unknown;
  explanation: string;
};

export const fetchInitialImportStatus = () => apiRequest<InitialImportStatus>('/initial-import/status');
export const generateInitialImportDryRun = () => apiRequest<InitialImportPlan>('/initial-import/dry-run', { method: 'POST' });
export const generateInitialImportPlan = () => apiRequest<InitialImportPlan>('/initial-import/plan', { method: 'POST' });
export const saveInitialImportOverride = (override: InitialImportOverride) => apiRequest('/initial-import/overrides', {
  method: 'POST',
  body: JSON.stringify(override)
});
export const saveInitialImportExtraDecision = (decision: {
  sourceHash: string;
  entityType: 'EMPLOYEE' | 'WORKSTATION';
  entityId: string;
  decision: 'QUARANTINED' | 'ARCHIVED';
  explanation: string;
}) => apiRequest('/initial-import/extra-decisions', {
  method: 'POST',
  body: JSON.stringify(decision)
});
export const applyInitialImportPlan = (runId: string, sourceHash: string) => apiRequest('/initial-import/apply', {
  method: 'POST',
  body: JSON.stringify({ runId, sourceHash, confirmation: 'APPLY_AUTHORITATIVE_WORKBOOK' })
});
