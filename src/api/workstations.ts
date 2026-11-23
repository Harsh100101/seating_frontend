// apps/frontend/src/api/workstations.ts
import {
  WorkstationQueryParams,
  WorkstationListResponse,
  WorkstationFilterOptionsResponse
} from '@seating/shared';
import { apiRequest } from './client';

export async function fetchWorkstations(
  params: WorkstationQueryParams = {},
  signal?: AbortSignal
): Promise<WorkstationListResponse> {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, val]) => {
    if (val !== undefined && val !== null && val !== '' && val !== 'ALL') {
      searchParams.set(key, String(val));
    }
  });

  const queryStr = searchParams.toString();
  const endpoint = `/workstations${queryStr ? `?${queryStr}` : ''}`;

  return apiRequest<WorkstationListResponse>(endpoint, {
    method: 'GET',
    signal
  });
}

export async function fetchWorkstationFilterOptions(
  params: Partial<WorkstationQueryParams> = {},
  signal?: AbortSignal
): Promise<WorkstationFilterOptionsResponse> {
  const searchParams = new URLSearchParams();

  const relevantKeys: (keyof WorkstationQueryParams)[] = [
    'unitId',
    'buildingId',
    'floorId',
    'officeArea',
    'departmentId',
    'section',
    'functionName',
    'status'
  ];

  relevantKeys.forEach((key) => {
    const val = params[key];
    if (val !== undefined && val !== null && val !== '' && val !== 'ALL') {
      searchParams.set(key, String(val));
    }
  });

  const queryStr = searchParams.toString();
  const endpoint = `/workstations/filter-options${queryStr ? `?${queryStr}` : ''}`;

  return apiRequest<WorkstationFilterOptionsResponse>(endpoint, {
    method: 'GET',
    signal
  });
}
