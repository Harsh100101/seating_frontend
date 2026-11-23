import { z } from 'zod';
import { SeatType, SeatStatus } from '../enums/index.js';
import {
  DEFAULT_SEAT_WIDTH,
  DEFAULT_SEAT_HEIGHT,
  MIN_SEAT_WIDTH,
  MAX_SEAT_WIDTH,
  MIN_SEAT_HEIGHT,
  MAX_SEAT_HEIGHT
} from '../constants/canvas.js';

export const ObjectIdOrUuidSchema = z.string().uuid().or(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID (must be UUID or 24-character hexadecimal ObjectId)'));

export const SeatPositionSchema = z.object({
  id: z.string().min(1, 'Seat ID is required'),
  label: z.string().trim().min(1, 'Seat label is required').max(30),
  x: z.number().min(0, 'X coordinate must be non-negative'),
  y: z.number().min(0, 'Y coordinate must be non-negative'),
  rotation: z.number().min(0).max(360).default(0),
  width: z.number().min(MIN_SEAT_WIDTH).max(MAX_SEAT_WIDTH).default(DEFAULT_SEAT_WIDTH),
  height: z.number().min(MIN_SEAT_HEIGHT).max(MAX_SEAT_HEIGHT).default(DEFAULT_SEAT_HEIGHT),
  type: z.nativeEnum(SeatType).default(SeatType.STANDARD_DESK),
  status: z.nativeEnum(SeatStatus).default(SeatStatus.AVAILABLE)
});

const MAX_LAYOUT_ENTRIES = 10_000;
const boundedLayoutArray = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.preprocess((value, context) => {
    // Reject oversized arrays before Zod allocates one validation issue per
    // invalid element. The max() also documents and enforces the data contract.
    if (Array.isArray(value) && value.length > MAX_LAYOUT_ENTRIES) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Layout arrays cannot contain more than ${MAX_LAYOUT_ENTRIES} entries.`,
        fatal: true
      });
      return z.NEVER;
    }
    return value;
  }, z.array(itemSchema).max(MAX_LAYOUT_ENTRIES));

export const FloorLayoutUpdateRequestSchema = z.object({
  seats: boundedLayoutArray(SeatPositionSchema),
  deletedSeatIds: boundedLayoutArray(ObjectIdOrUuidSchema).optional()
});

export const AssignSeatRequestSchema = z.object({
  employeeId: ObjectIdOrUuidSchema
});
