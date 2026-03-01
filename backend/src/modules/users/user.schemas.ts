import { z } from 'zod';

export const createUserSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email(),
  phone: z.string().min(10).max(15).optional(),
  password: z.string().min(8),
  roles: z.array(z.string()).min(1, 'At least one role is required'),
  isActive: z.boolean().default(true),
});

export const updateUserSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15).nullish(),
  isActive: z.boolean().optional(),
  roles: z.array(z.string()).optional(),
});

export const userQuerySchema = z.object({
  page: z.string().optional().default('1'),
  perPage: z.string().optional().default('20'),
  search: z.string().optional(),
  role: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
  sort: z.string().optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UserQuery = z.infer<typeof userQuerySchema>;
