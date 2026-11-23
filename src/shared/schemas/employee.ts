import { z } from 'zod';
import { CODE_REGEX } from '../constants/regex.js';

const ObjectIdOrUuidSchema = z.string().uuid().or(z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID (must be UUID or 24-character hexadecimal ObjectId)'));

export const CreateEmployeeRequestSchema = z.object({
  employeeCode: z.string().trim().regex(CODE_REGEX, 'Employee code must be alphanumeric (1-30 chars)'),
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  designation: z.string().trim().max(100).optional().nullable(),
  grade: z.string().trim().max(30).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  ext: z.string().trim().max(30).optional().nullable(),
  section: z.string().trim().max(100).optional().nullable(),
  functionName: z.string().trim().max(100).optional().nullable(),
  reportingManager: z.string().trim().max(100).optional().nullable(),
  reportingTo: z.string().trim().max(100).optional().nullable(),
  hod: z.string().trim().max(100).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
  pcNumber: z.string().trim().max(100).optional().nullable(),
  officeArea: z.string().trim().max(100).optional().nullable(),
  departmentId: ObjectIdOrUuidSchema,
  seatId: ObjectIdOrUuidSchema.optional().nullable()
});

export const UpdateEmployeeRequestSchema = z.object({
  employeeCode: z.string().trim().regex(CODE_REGEX, 'Employee code must be alphanumeric (1-30 chars)').optional(),
  fullName: z.string().trim().min(1).max(100).optional(),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  designation: z.string().trim().max(100).optional().nullable(),
  grade: z.string().trim().max(30).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(),
  ext: z.string().trim().max(30).optional().nullable(),
  section: z.string().trim().max(100).optional().nullable(),
  functionName: z.string().trim().max(100).optional().nullable(),
  reportingManager: z.string().trim().max(100).optional().nullable(),
  reportingTo: z.string().trim().max(100).optional().nullable(),
  hod: z.string().trim().max(100).optional().nullable(),
  remarks: z.string().trim().max(500).optional().nullable(),
  pcNumber: z.string().trim().max(100).optional().nullable(),
  officeArea: z.string().trim().max(100).optional().nullable(),
  departmentId: ObjectIdOrUuidSchema.optional(),
  seatId: ObjectIdOrUuidSchema.optional().nullable(),
  isActive: z.boolean().optional()
});

export const EmployeeCsvRowSchema = z.object({
  employeeCode: z.string().trim().min(1, 'Employee code is required'),
  fullName: z.string().trim().min(1, 'Full name is required'),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  departmentCode: z.string().trim().min(1, 'Department code is required'),
  ext: z.string().trim().optional(),
  section: z.string().trim().optional(),
  functionName: z.string().trim().optional(),
  grade: z.string().trim().optional(),
  reportingManager: z.string().trim().optional(),
  hod: z.string().trim().optional(),
  officeArea: z.string().trim().optional(),
});
