import { z } from 'zod';

export const createPaymentSchema = z.object({
  loanId: z.string().uuid(),
  amount: z.number().positive('Payment amount must be positive'),
  paymentDate: z.string().transform((val) => new Date(val)),
  paymentMethod: z.enum(['CASH', 'MPESA', 'BANK_TRANSFER', 'CHEQUE', 'OTHER']),
  reference: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const reversePaymentSchema = z.object({
  reason: z.string().min(5, 'Reason must be at least 5 characters').max(500),
});

export const paymentQuerySchema = z.object({
  page: z.string().optional().default('1'),
  perPage: z.string().optional().default('20'),
  loanId: z.string().optional(),
  borrowerId: z.string().optional(),
  status: z.string().optional(),
  paymentMethod: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  sort: z.string().optional(),
});

export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;
