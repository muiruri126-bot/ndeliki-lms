import { prisma } from '../../config/database';
import { parsePagination, paginatedMeta } from '../../utils/helpers';

export class ReportService {
  /**
   * Loan portfolio summary
   */
  async portfolioSummary() {
    const [statusCounts, totals, productBreakdown] = await Promise.all([
      prisma.loan.groupBy({
        by: ['status'],
        _count: true,
        _sum: { principalAmount: true, outstandingBalance: true, totalPaid: true },
      }),
      prisma.loan.aggregate({
        _sum: {
          principalAmount: true,
          totalDue: true,
          totalPaid: true,
          outstandingBalance: true,
          totalPenalty: true,
          totalInterest: true,
        },
        _count: true,
      }),
      prisma.loan.groupBy({
        by: ['loanProductId'],
        _count: true,
        _sum: { principalAmount: true, outstandingBalance: true },
      }),
    ]);

    // Enrich product breakdown with names
    const productIds = productBreakdown.map((p) => p.loanProductId);
    const products = await prisma.loanProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });

    const productMap = Object.fromEntries(products.map((p) => [p.id, p.name]));

    return {
      overview: {
        totalLoans: totals._count,
        totalDisbursed: totals._sum.principalAmount || 0,
        totalDue: totals._sum.totalDue || 0,
        totalCollected: totals._sum.totalPaid || 0,
        totalOutstanding: totals._sum.outstandingBalance || 0,
        totalInterestEarned: totals._sum.totalInterest || 0,
        totalPenalties: totals._sum.totalPenalty || 0,
      },
      byStatus: statusCounts.map((s) => ({
        status: s.status,
        count: s._count,
        principalAmount: s._sum.principalAmount || 0,
        outstandingBalance: s._sum.outstandingBalance || 0,
        totalPaid: s._sum.totalPaid || 0,
      })),
      byProduct: productBreakdown.map((p) => ({
        productId: p.loanProductId,
        productName: productMap[p.loanProductId] || 'Unknown',
        count: p._count,
        principalAmount: p._sum.principalAmount || 0,
        outstandingBalance: p._sum.outstandingBalance || 0,
      })),
    };
  }

  /**
   * Collection report for a date range
   */
  async collectionReport(dateFrom?: string, dateTo?: string) {
    const where: any = { status: 'COMPLETED' };
    if (dateFrom || dateTo) {
      where.paymentDate = {};
      if (dateFrom) where.paymentDate.gte = new Date(dateFrom);
      if (dateTo) where.paymentDate.lte = new Date(dateTo);
    }

    const [payments, byMethod, daily] = await Promise.all([
      prisma.payment.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.payment.groupBy({
        by: ['paymentMethod'],
        where,
        _sum: { amount: true },
        _count: true,
      }),
      prisma.$queryRaw`
        SELECT DATE(payment_date) as date,
               COUNT(*)::int as count,
               SUM(amount)::float as total
        FROM payments
        WHERE status = 'COMPLETED'
          ${dateFrom ? prisma.$queryRaw`AND payment_date >= ${new Date(dateFrom)}` : prisma.$queryRaw``}
          ${dateTo ? prisma.$queryRaw`AND payment_date <= ${new Date(dateTo)}` : prisma.$queryRaw``}
        GROUP BY DATE(payment_date)
        ORDER BY date DESC
        LIMIT 30
      `.catch(() => []), // fallback if raw query fails
    ]);

    return {
      totalCollected: payments._sum.amount || 0,
      totalPayments: payments._count,
      byMethod: byMethod.map((m) => ({
        method: m.paymentMethod,
        count: m._count,
        amount: m._sum.amount || 0,
      })),
      daily,
    };
  }

  /**
   * Overdue / at-risk loans report
   */
  async overdueReport() {
    const overdueLoans = await prisma.loan.findMany({
      where: {
        status: { in: ['ACTIVE', 'OVERDUE'] },
        schedules: {
          some: {
            status: { in: ['PENDING', 'PARTIALLY_PAID'] },
            dueDate: { lt: new Date() },
          },
        },
      },
      select: {
        id: true,
        loanNumber: true,
        principalAmount: true,
        outstandingBalance: true,
        status: true,
        disbursedAt: true,
        maturityDate: true,
        borrower: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        officer: {
          select: { id: true, firstName: true, lastName: true },
        },
        schedules: {
          where: {
            status: { in: ['PENDING', 'PARTIALLY_PAID'] },
            dueDate: { lt: new Date() },
          },
          select: {
            dueDate: true,
            totalAmount: true,
            paidAmount: true,
          },
        },
      },
      orderBy: { maturityDate: 'asc' },
    });

    return overdueLoans.map((loan) => {
      const totalOverdue = loan.schedules.reduce(
        (sum, s) => sum + (Number(s.totalAmount) - Number(s.paidAmount)),
        0
      );
      const oldestOverdue = loan.schedules[0]?.dueDate;
      const daysOverdue = oldestOverdue
        ? Math.floor((Date.now() - oldestOverdue.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        ...loan,
        overdueAmount: Math.round(totalOverdue * 100) / 100,
        daysOverdue,
        overdueInstallments: loan.schedules.length,
        schedules: undefined,
      };
    });
  }

  /**
   * Officer performance report
   */
  async officerPerformance() {
    const officers = await prisma.user.findMany({
      where: {
        userRoles: { some: { role: { name: 'LOAN_OFFICER' } } },
        isActive: true,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        _count: {
          select: {
            officerLoans: true,
            officerBorrowers: true,
          },
        },
      },
    });

    const result = [];
    for (const officer of officers) {
      const [loanStats, collections] = await Promise.all([
        prisma.loan.aggregate({
          where: { officerId: officer.id },
          _sum: { principalAmount: true, outstandingBalance: true, totalPaid: true },
        }),
        prisma.payment.aggregate({
          where: { loan: { officerId: officer.id }, status: 'COMPLETED' },
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      result.push({
        officer: { id: officer.id, name: `${officer.firstName} ${officer.lastName}` },
        totalLoans: officer._count.officerLoans,
        totalBorrowers: officer._count.officerBorrowers,
        totalDisbursed: loanStats._sum.principalAmount || 0,
        totalOutstanding: loanStats._sum.outstandingBalance || 0,
        totalCollected: collections._sum.amount || 0,
        totalPayments: collections._count,
      });
    }

    return result;
  }
}

export const reportService = new ReportService();
