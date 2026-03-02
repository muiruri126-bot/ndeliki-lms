import { Router, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { authenticate, requireRole, validate } from '../../middleware';
import { AuthenticatedRequest } from '../../types';

const router = Router();
router.use(authenticate);

const productSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  interestMethod: z.string(),
  interestRate: z.number().positive(),
  interestPeriod: z.string(),
  durationUnit: z.string(),
  repaymentFrequency: z.string(),
  minAmount: z.number().positive().default(1000),
  maxAmount: z.number().positive().default(1000000),
  minDurationUnits: z.number().int().positive().default(1),
  maxDurationUnits: z.number().int().positive().default(52),
  penaltyRate: z.number().min(0).default(0),
  penaltyGraceDays: z.number().int().min(0).default(0),
  requiresApproval: z.boolean().default(true),
  isActive: z.boolean().default(true),
});

// List all products
router.get(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const products = await prisma.loanProduct.findMany({
        orderBy: { name: 'asc' },
        include: { _count: { select: { loans: true } } },
      });
      res.json({ success: true, data: products });
    } catch (error) { next(error); }
  }
);

// Get by ID
router.get(
  '/:id',
  requireRole('SYSTEM_ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await prisma.loanProduct.findUnique({ where: { id: req.params.id as string } });
      if (!product) return res.status(404).json({ success: false, message: 'Product not found' });
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

// Create
router.post(
  '/',
  requireRole('SYSTEM_ADMIN'),
  validate(productSchema),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await prisma.loanProduct.create({ data: req.body });
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id, action: 'LOAN_PRODUCT_CREATED',
          entityType: 'LoanProduct', entityId: product.id,
          changes: JSON.stringify(req.body),
          ipAddress: (req.ip as string) || null,
        },
      });
      res.status(201).json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

// Update
router.put(
  '/:id',
  requireRole('SYSTEM_ADMIN'),
  validate(productSchema.partial()),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const product = await prisma.loanProduct.update({
        where: { id: req.params.id as string },
        data: req.body,
      });
      await prisma.auditLog.create({
        data: {
          userId: req.user!.id, action: 'LOAN_PRODUCT_UPDATED',
          entityType: 'LoanProduct', entityId: product.id,
          changes: JSON.stringify(req.body),
          ipAddress: (req.ip as string) || null,
        },
      });
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

// Toggle active status
router.patch(
  '/:id/toggle',
  requireRole('SYSTEM_ADMIN'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const existing = await prisma.loanProduct.findUnique({ where: { id: req.params.id as string } });
      if (!existing) return res.status(404).json({ success: false, message: 'Product not found' });
      const product = await prisma.loanProduct.update({
        where: { id: req.params.id as string },
        data: { isActive: !existing.isActive },
      });
      res.json({ success: true, data: product });
    } catch (error) { next(error); }
  }
);

export default router;
