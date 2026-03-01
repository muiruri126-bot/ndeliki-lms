import { z } from 'zod';
import { RISK_RATING } from '../../config/constants';

export const createBorrowerSchema = z.object({
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  email: z.string().email().optional(),
  phone: z.string().min(10).max(15),
  alternativePhone: z.string().min(10).max(15).optional(),
  nationalId: z.string().min(5).max(20),
  dateOfBirth: z.string().optional().transform((val) => val ? new Date(val) : undefined),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: z.string().max(255).optional(),
  county: z.string().max(100).optional(),
  subCounty: z.string().max(100).optional(),
  ward: z.string().max(100).optional(),
  occupation: z.string().max(100).optional(),
  employer: z.string().max(100).optional(),
  monthlyIncome: z.number().positive().optional(),
  nextOfKinName: z.string().max(100).optional(),
  nextOfKinPhone: z.string().min(10).max(15).optional(),
  nextOfKinRelationship: z.string().max(50).optional(),
  riskRating: z.enum(Object.values(RISK_RATING) as [string, ...string[]]).default('STANDARD'),
  notes: z.string().max(1000).optional(),
});

export const updateBorrowerSchema = createBorrowerSchema.partial();

export const borrowerQuerySchema = z.object({
  page: z.string().optional().default('1'),
  perPage: z.string().optional().default('20'),
  search: z.string().optional(),
  county: z.string().optional(),
  riskRating: z.string().optional(),
  assignedOfficerId: z.string().optional(),
  sort: z.string().optional(),
});

export type CreateBorrowerInput = z.infer<typeof createBorrowerSchema>;
export type UpdateBorrowerInput = z.infer<typeof updateBorrowerSchema>;
export type BorrowerQuery = z.infer<typeof borrowerQuerySchema>;
