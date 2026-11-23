import { z } from 'zod';

export const AdminLoginRequestSchema = z.object({
  email: z.string().trim().email('Valid email address required'),
  password: z.string().min(1, 'Password is required')
});

export const AdminUserResponseSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  createdAt: z.string().optional()
});
