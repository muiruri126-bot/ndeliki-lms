import { z } from 'zod';

export const createLoanSchema = z.object({
  borrowerId: z.string().uuid(),
  loanProductId: z.string().uuid(),
  principalAmount: z.number().positive('Principal must be positive'),
  interestRate: z.number().min(0).max(100).optional(), // override product rate
  durationValue: z.number().int().positive(),
  durationUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS']).optional(),
  repaymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']).optional(),
  interestMethod: z.enum(['FLAT', 'REDUCING_BALANCE']).optional(),
  purpose: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
  disbursementDate: z.string().optional().transform((val) => val ? new Date(val) : undefined),
});

export const approveLoanSchema = z.object({
  notes: z.string().max(500).optional(),
});

export const disburseLoanSchema = z.object({
  disbursementDate: z.string().transform((val) => new Date(val)),
  disbursementMethod: z.string().max(50).optional(),
  disbursementReference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const loanQuerySchema = z.object({
  page: z.string().optional().default('1'),
  perPage: z.string().optional().default('20'),
  search: z.string().optional(),
  status: z.string().optional(),
  borrowerId: z.string().optional(),
  loanProductId: z.string().optional(),
  officerId: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.string().optional(),
});

export const previewLoanSchema = z.object({
  principalAmount: z.number().positive(),
  interestRate: z.number().min(0).max(100),
  durationValue: z.number().int().positive(),
  durationUnit: z.enum(['DAYS', 'WEEKS', 'MONTHS']),
  repaymentFrequency: z.enum(['DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY']),
  interestMethod: z.enum(['FLAT', 'REDUCING_BALANCE']),
  startDate: z.string().transform((val) => new Date(val)),
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
export type ApproveLoanInput = z.infer<typeof approveLoanSchema>;
export type DisburseLoanInput = z.infer<typeof disburseLoanSchema>;
export type LoanQuery = z.infer<typeof loanQuerySchema>;
export type PreviewLoanInput = z.infer<typeof previewLoanSchema>;
