import { z } from 'zod';
import { HEX_COLOR_REGEX, CODE_REGEX } from '../constants/regex.js';
import { MIN_CANVAS_WIDTH, MAX_CANVAS_WIDTH, MIN_CANVAS_HEIGHT, MAX_CANVAS_HEIGHT } from '../constants/canvas.js';

export const CreateUnitRequestSchema = z.object({
  name: z.string().trim().min(1, 'Unit name is required').max(100),
  code: z.string().trim().regex(CODE_REGEX, 'Unit code must be alphanumeric (1-30 chars)').optional(),
  location: z.string().trim().max(255).optional()
});

export const UpdateUnitRequestSchema = CreateUnitRequestSchema.extend({
  lifecycleStatus: z.enum(['ACTIVE', 'INACTIVE', 'QUARANTINED']).optional()
}).partial();

export const CreatePlantRequestSchema = z.object({
  name: z.string().trim().min(1, 'Plant name is required').max(100),
  code: z.string().trim().regex(CODE_REGEX, 'Plant code must be alphanumeric (1-30 chars)'),
  unitId: z.string().trim().min(1, 'Valid unit ID required')
});

export const UpdatePlantRequestSchema = CreatePlantRequestSchema.partial();

export const CreateOfficeRequestSchema = z.object({
  name: z.string().trim().min(1, 'Office name is required').max(100),
  city: z.string().trim().min(1, 'City is required').max(100),
  address: z.string().trim().max(255).optional()
});

export const UpdateOfficeRequestSchema = CreateOfficeRequestSchema.partial();

export const CreateBuildingRequestSchema = z.object({
  name: z.string().trim().min(1, 'Building name is required').max(100),
  code: z.string().trim().regex(CODE_REGEX, 'Building code must be alphanumeric (1-30 chars)'),
  plantId: z.string().trim().min(1, 'Valid plant ID required').optional(),
  unitId: z.string().trim().min(1).optional(),
  officeId: z.string().trim().min(1).optional()
}).refine((data) => Boolean(data.plantId || data.unitId || data.officeId), {
  message: 'Valid plant ID required',
  path: ['plantId']
});

export const UpdateBuildingRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().regex(CODE_REGEX).optional()
});

export const CreateFloorRequestSchema = z.object({
  name: z.string().trim().min(1, 'Floor name is required').max(100),
  floorNumber: z.number().int('Floor number must be an integer'),
  buildingId: z.string().trim().min(1, 'Valid building ID required'),
  canvasWidth: z.number().int().min(MIN_CANVAS_WIDTH).max(MAX_CANVAS_WIDTH).default(1600),
  canvasHeight: z.number().int().min(MIN_CANVAS_HEIGHT).max(MAX_CANVAS_HEIGHT).default(1000)
});

export const UpdateFloorRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  floorNumber: z.number().int().optional(),
  canvasWidth: z.number().int().min(MIN_CANVAS_WIDTH).max(MAX_CANVAS_WIDTH).optional(),
  canvasHeight: z.number().int().min(MIN_CANVAS_HEIGHT).max(MAX_CANVAS_HEIGHT).optional()
});

export const CreateDepartmentRequestSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(100),
  code: z.string().trim().regex(CODE_REGEX, 'Department code must be alphanumeric (1-30 chars)'),
  colorHex: z.string().trim().regex(HEX_COLOR_REGEX, 'Color must be a valid 6-char hex code (#RRGGBB)')
});

export const UpdateDepartmentRequestSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  code: z.string().trim().regex(CODE_REGEX).optional(),
  colorHex: z.string().trim().regex(HEX_COLOR_REGEX).optional()
});
