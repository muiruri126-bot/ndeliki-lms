import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware';
import { prisma } from '../../config/database';
import { AuthenticatedRequest } from '../../types';
import { Response, NextFunction } from 'express';

const router = Router();

router.use(authenticate);

/**
 * Dashboard stats: overview cards + recent activity
 */
router.get(
  '/',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

      const [
        totalBorrowers,
        activeBorrowers,
        loanCounts,
        loanTotals,
        thisMonthDisbursed,
        thisMonthCollected,
        recentLoans,
        recentPayments,
        overdueCount,
      ] = await Promise.all([
        prisma.borrower.count({ where: { isActive: true } }),
        prisma.borrower.count({
          where: { isActive: true, loans: { some: { status: 'ACTIVE' } } },
        }),
        prisma.loan.groupBy({
          by: ['status'],
          _count: true,
        }),
        prisma.loan.aggregate({
          _sum: {
            principalAmount: true,
            totalDue: true,
            totalPaid: true,
            outstandingBalance: true,
          },
        }),
        prisma.loan.aggregate({
          where: { disbursedAt: { gte: monthStart }, status: { not: 'REJECTED' } },
          _sum: { principalAmount: true },
          _count: true,
        }),
        prisma.payment.aggregate({
          where: { paymentDate: { gte: monthStart }, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
        prisma.loan.findMany({
          take: 5,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            loanNumber: true,
            principalAmount: true,
            status: true,
            createdAt: true,
            borrower: {
              select: { firstName: true, lastName: true },
            },
          },
        }),
        prisma.payment.findMany({
          where: { status: 'COMPLETED' },
          take: 5,
          orderBy: { paymentDate: 'desc' },
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            loan: {
              select: {
                loanNumber: true,
                borrower: { select: { firstName: true, lastName: true } },
              },
            },
          },
        }),
        prisma.loan.count({
          where: {
            status: { in: ['ACTIVE', 'OVERDUE'] },
            schedules: {
              some: {
                dueDate: { lt: now },
                status: { in: ['PENDING', 'PARTIALLY_PAID'] },
              },
            },
          },
        }),
      ]);

      const statusMap = Object.fromEntries(
        loanCounts.map((s) => [s.status, s._count])
      );

      res.json({
        success: true,
        data: {
          cards: {
            totalBorrowers,
            activeBorrowers,
            totalLoans: Object.values(statusMap).reduce((a: any, b: any) => a + b, 0),
            activeLoans: statusMap['ACTIVE'] || 0,
            pendingLoans: statusMap['PENDING'] || 0,
            overdueLoans: overdueCount,
            totalDisbursed: loanTotals._sum.principalAmount || 0,
            totalOutstanding: loanTotals._sum.outstandingBalance || 0,
            totalCollected: loanTotals._sum.totalPaid || 0,
          },
          thisMonth: {
            disbursedAmount: thisMonthDisbursed._sum.principalAmount || 0,
            disbursedCount: thisMonthDisbursed._count,
            collectedAmount: thisMonthCollected._sum.amount || 0,
            collectedCount: thisMonthCollected._count,
          },
          recentLoans,
          recentPayments,
        },
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * Chart data: monthly disbursements and collections for the last 12 months
 */
router.get(
  '/charts',
  requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'),
  async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const months: { month: string; disbursed: number; collected: number }[] = [];

      for (let i = 11; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59);

        const [disbursed, collected] = await Promise.all([
          prisma.loan.aggregate({
            where: {
              disbursedAt: { gte: start, lte: end },
              status: { not: 'REJECTED' },
            },
            _sum: { principalAmount: true },
          }),
          prisma.payment.aggregate({
            where: {
              paymentDate: { gte: start, lte: end },
              status: 'COMPLETED',
            },
            _sum: { amount: true },
          }),
        ]);

        months.push({
          month: start.toISOString().slice(0, 7), // YYYY-MM
          disbursed: Number(disbursed._sum.principalAmount || 0),
          collected: Number(collected._sum.amount || 0),
        });
      }

      res.json({ success: true, data: { monthlyTrend: months } });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
