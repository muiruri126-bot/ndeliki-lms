import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../utils/errors';
import { parsePagination, paginatedMeta, parseSort, generatePaymentNumber } from '../../utils/helpers';
import logger from '../../config/logger';
import type { CreatePaymentInput, PaymentQuery } from './payment.schemas';

export class PaymentService {
  private readonly paymentSelect = {
    id: true,
    paymentNumber: true,
    amount: true,
    paymentDate: true,
    paymentMethod: true,
    reference: true,
    status: true,
    notes: true,
    reversalReason: true,
    reversedAt: true,
    createdAt: true,
    loan: {
      select: {
        id: true,
        loanNumber: true,
        borrower: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
      },
    },
    processedBy: {
      select: { id: true, firstName: true, lastName: true },
    },
  };

  async list(query: PaymentQuery) {
    const { page, perPage, skip } = parsePagination(query);
    const orderBy = parseSort(query.sort, ['paymentDate', 'amount', 'createdAt']);

    const where: any = {};

    if (query.loanId) where.loanId = query.loanId;
    if (query.borrowerId) where.loan = { borrowerId: query.borrowerId };
    if (query.status) where.status = query.status;
    if (query.paymentMethod) where.paymentMethod = query.paymentMethod;
    if (query.dateFrom || query.dateTo) {
      where.paymentDate = {};
      if (query.dateFrom) where.paymentDate.gte = new Date(query.dateFrom);
      if (query.dateTo) where.paymentDate.lte = new Date(query.dateTo);
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        select: this.paymentSelect,
        orderBy,
        skip,
        take: perPage,
      }),
      prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: paginatedMeta(total, page, perPage),
    };
  }

  async getById(id: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      select: this.paymentSelect,
    });

    if (!payment) throw new NotFoundError('Payment not found');
    return payment;
  }

  async create(input: CreatePaymentInput, processedById: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: input.loanId },
      include: {
        schedules: {
          where: { status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
          orderBy: { installmentNumber: 'asc' },
        },
      },
    });

    if (!loan) throw new NotFoundError('Loan not found');
    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) {
      throw new BadRequestError(`Cannot accept payment for a loan with status "${loan.status}"`);
    }

    if (input.amount > Number(loan.outstandingBalance)) {
      throw new BadRequestError(
        `Payment amount (${input.amount}) exceeds outstanding balance (${Number(loan.outstandingBalance)})`
      );
    }

    const paymentNumber = await generatePaymentNumber(prisma);

    // Allocate payment to schedule installments (FIFO)
    let remainingAmount = input.amount;
    const scheduleUpdates: { id: string; paidAmount: number; status: string; paidAt: Date | null }[] = [];

    for (const schedule of loan.schedules) {
      if (remainingAmount <= 0) break;

      const due = Number(schedule.totalAmount) + Number(schedule.penaltyAmount) - Number(schedule.paidAmount);
      if (due <= 0) continue;

      const alloc = Math.min(remainingAmount, due);
      const newPaid = Number(schedule.paidAmount) + alloc;
      const newStatus = newPaid >= Number(schedule.totalAmount) + Number(schedule.penaltyAmount) ? 'PAID' : 'PARTIALLY_PAID';

      scheduleUpdates.push({
        id: schedule.id,
        paidAmount: newPaid,
        status: newStatus,
        paidAt: newStatus === 'PAID' ? input.paymentDate : null,
      });

      remainingAmount = roundTo2(remainingAmount - alloc);
    }

    // Execute everything in a transaction
    const payment = await prisma.$transaction(async (tx) => {
      // Create payment record
      const newPayment = await tx.payment.create({
        data: {
          paymentNumber,
          loanId: input.loanId,
          amount: input.amount,
          paymentDate: input.paymentDate,
          paymentMethod: input.paymentMethod,
          reference: input.reference,
          notes: input.notes,
          status: 'COMPLETED',
          processedById,
        },
      });

      // Update schedule entries
      for (const update of scheduleUpdates) {
        await tx.loanSchedule.update({
          where: { id: update.id },
          data: {
            paidAmount: update.paidAmount,
            status: update.status,
            paidAt: update.paidAt,
          },
        });
      }

      // Update loan totals
      const newTotalPaid = roundTo2(Number(loan.totalPaid) + input.amount);
      const newOutstanding = roundTo2(Number(loan.totalDue) + Number(loan.totalPenalty) - newTotalPaid);
      const isFullyPaid = newOutstanding <= 0;

      await tx.loan.update({
        where: { id: input.loanId },
        data: {
          totalPaid: newTotalPaid,
          outstandingBalance: Math.max(0, newOutstanding),
          status: isFullyPaid ? 'CLOSED' : loan.status,
          closedAt: isFullyPaid ? new Date() : null,
        },
      });

      return newPayment;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_RECEIVED',
        entityType: 'Payment',
        entityId: payment.id,
        userId: processedById,
        changes: JSON.stringify({
          paymentNumber,
          loanId: input.loanId,
          amount: input.amount,
          method: input.paymentMethod,
          reference: input.reference,
        }),
      },
    });

    logger.info(`Payment ${paymentNumber} of KES ${input.amount} recorded for loan ${loan.loanNumber}`);

    return this.getById(payment.id);
  }

  async reverse(id: string, reason: string, reversedBy: string) {
    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { loan: true },
    });

    if (!payment) throw new NotFoundError('Payment not found');
    if (payment.status === 'REVERSED') {
      throw new BadRequestError('Payment is already reversed');
    }

    await prisma.$transaction(async (tx) => {
      // Mark payment as reversed
      await tx.payment.update({
        where: { id },
        data: {
          status: 'REVERSED',
          reversalReason: reason,
          reversedAt: new Date(),
          reversedById: reversedBy,
        },
      });

      // Revert loan totals
      const newTotalPaid = Math.max(0, roundTo2(Number(payment.loan.totalPaid) - Number(payment.amount)));
      const newOutstanding = roundTo2(Number(payment.loan.totalDue) + Number(payment.loan.totalPenalty) - newTotalPaid);

      await tx.loan.update({
        where: { id: payment.loanId },
        data: {
          totalPaid: newTotalPaid,
          outstandingBalance: newOutstanding,
          status: payment.loan.status === 'CLOSED' ? 'ACTIVE' : payment.loan.status,
          closedAt: payment.loan.status === 'CLOSED' ? null : payment.loan.closedAt,
        },
      });

      // Recalculate schedule paid amounts
      // Simplistic approach: re-allocate all non-reversed payments
      const validPayments = await tx.payment.findMany({
        where: { loanId: payment.loanId, status: 'COMPLETED' },
        orderBy: { paymentDate: 'asc' },
      });

      // Reset all schedule entries
      await tx.loanSchedule.updateMany({
        where: { loanId: payment.loanId },
        data: { paidAmount: 0, status: 'PENDING', paidAt: null },
      });

      // Re-allocate
      const schedules = await tx.loanSchedule.findMany({
        where: { loanId: payment.loanId },
        orderBy: { installmentNumber: 'asc' },
      });

      let scheduleMap = schedules.map((s) => ({
        id: s.id,
        total: Number(s.totalAmount) + Number(s.penaltyAmount),
        paid: 0,
      }));

      for (const p of validPayments) {
        let remaining = Number(p.amount);
        for (const s of scheduleMap) {
          if (remaining <= 0) break;
          const due = s.total - s.paid;
          if (due <= 0) continue;
          const alloc = Math.min(remaining, due);
          s.paid = roundTo2(s.paid + alloc);
          remaining = roundTo2(remaining - alloc);
        }
      }

      for (const s of scheduleMap) {
        const status = s.paid >= s.total ? 'PAID' : s.paid > 0 ? 'PARTIALLY_PAID' : 'PENDING';
        await tx.loanSchedule.update({
          where: { id: s.id },
          data: {
            paidAmount: s.paid,
            status,
            paidAt: status === 'PAID' ? new Date() : null,
          },
        });
      }
    });

    await prisma.auditLog.create({
      data: {
        action: 'PAYMENT_REVERSED',
        entityType: 'Payment',
        entityId: id,
        userId: reversedBy,
        changes: JSON.stringify({ reason, amount: payment.amount, loanNumber: payment.loan.loanNumber }),
      },
    });

    logger.info(`Payment ${payment.paymentNumber} reversed. Reason: ${reason}`);
  }
}

function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export const paymentService = new PaymentService();
