import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError, ConflictError } from '../../utils/errors';
import { parsePagination, paginatedMeta, parseSort, generateLoanNumber } from '../../utils/helpers';
import { calculateLoan } from './loan.calculator';
import logger from '../../config/logger';
import type { CreateLoanInput, ApproveLoanInput, DisburseLoanInput, LoanQuery, PreviewLoanInput } from './loan.schemas';

export class LoanService {
  private readonly loanSelect = {
    id: true,
    loanNumber: true,
    principalAmount: true,
    interestRate: true,
    interestMethod: true,
    durationValue: true,
    durationUnit: true,
    repaymentFrequency: true,
    numberOfInstallments: true,
    installmentAmount: true,
    totalInterest: true,
    totalDue: true,
    totalPaid: true,
    outstandingBalance: true,
    totalPenalty: true,
    status: true,
    purpose: true,
    notes: true,
    disbursedAt: true,
    maturityDate: true,
    approvedAt: true,
    closedAt: true,
    createdAt: true,
    updatedAt: true,
    borrower: {
      select: { id: true, firstName: true, lastName: true, phone: true, nationalId: true },
    },
    loanProduct: {
      select: { id: true, name: true },
    },
    officer: {
      select: { id: true, firstName: true, lastName: true },
    },
    approvedBy: {
      select: { id: true, firstName: true, lastName: true },
    },
  };

  async list(query: LoanQuery) {
    const { page, perPage, skip } = parsePagination(query);
    const orderBy = parseSort(query.sort, ['loanNumber', 'principalAmount', 'createdAt', 'status']);

    const where: any = {};

    if (query.search) {
      where.OR = [
        { loanNumber: { contains: query.search } },
        { borrower: { firstName: { contains: query.search } } },
        { borrower: { lastName: { contains: query.search } } },
        { borrower: { phone: { contains: query.search } } },
      ];
    }

    if (query.status) {
      where.status = query.status;
    }
    if (query.borrowerId) {
      where.borrowerId = query.borrowerId;
    }
    if (query.loanProductId) {
      where.loanProductId = query.loanProductId;
    }
    if (query.officerId) {
      where.officerId = query.officerId;
    }
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [loans, total] = await Promise.all([
      prisma.loan.findMany({
        where,
        select: this.loanSelect,
        orderBy,
        skip,
        take: perPage,
      }),
      prisma.loan.count({ where }),
    ]);

    return {
      data: loans,
      meta: paginatedMeta(total, page, perPage),
    };
  }

  async getById(id: string) {
    const loan = await prisma.loan.findUnique({
      where: { id },
      select: {
        ...this.loanSelect,
        schedules: {
          orderBy: { installmentNumber: 'asc' },
          select: {
            id: true,
            installmentNumber: true,
            dueDate: true,
            principalAmount: true,
            interestAmount: true,
            totalAmount: true,
            paidAmount: true,
            penaltyAmount: true,
            status: true,
            paidAt: true,
          },
        },
        payments: {
          orderBy: { paymentDate: 'desc' },
          select: {
            id: true,
            paymentNumber: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            reference: true,
            status: true,
          },
        },
      },
    });

    if (!loan) throw new NotFoundError('Loan not found');

    return loan;
  }

  async create(input: CreateLoanInput, officerId: string) {
    // Validate borrower
    const borrower = await prisma.borrower.findUnique({
      where: { id: input.borrowerId },
    });
    if (!borrower || !borrower.isActive) {
      throw new NotFoundError('Borrower not found or inactive');
    }

    // Validate loan product
    const product = await prisma.loanProduct.findUnique({
      where: { id: input.loanProductId },
    });
    if (!product || !product.isActive) {
      throw new NotFoundError('Loan product not found or inactive');
    }

    // Apply product defaults if not overridden
    const interestRate = Number(input.interestRate ?? product.interestRate);
    const durationUnit = (input.durationUnit ?? product.durationUnit) as 'DAYS' | 'WEEKS' | 'MONTHS';
    const repaymentFrequency = (input.repaymentFrequency ?? product.repaymentFrequency) as 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY';
    const interestMethod = (input.interestMethod ?? product.interestMethod) as 'FLAT' | 'REDUCING_BALANCE';

    // Validate principal within product limits
    if (input.principalAmount < Number(product.minAmount) || input.principalAmount > Number(product.maxAmount)) {
      throw new BadRequestError(
        `Principal must be between KES ${Number(product.minAmount).toLocaleString()} and KES ${Number(product.maxAmount).toLocaleString()}`
      );
    }

    // Calculate loan schedule
    const startDate = input.disbursementDate || new Date();
    const calculation = calculateLoan({
      principal: input.principalAmount,
      annualRate: interestRate,
      durationValue: input.durationValue,
      durationUnit,
      interestMethod,
      repaymentFrequency,
      startDate,
    });

    // Generate loan number
    const loanNumber = await generateLoanNumber(prisma);

    // Compute maturity date (last schedule item date)
    const maturityDate = calculation.schedule[calculation.schedule.length - 1].dueDate;

    // Create loan with schedule in a transaction
    const loan = await prisma.$transaction(async (tx) => {
      const newLoan = await tx.loan.create({
        data: {
          loanNumber,
          borrowerId: input.borrowerId,
          loanProductId: input.loanProductId,
          officerId,
          principalAmount: input.principalAmount,
          interestRate,
          interestMethod,
          durationValue: input.durationValue,
          durationUnit,
          repaymentFrequency,
          numberOfInstallments: calculation.numberOfInstallments,
          installmentAmount: calculation.installmentAmount,
          totalInterest: calculation.totalInterest,
          totalDue: calculation.totalDue,
          totalPaid: 0,
          outstandingBalance: calculation.totalDue,
          totalPenalty: 0,
          status: 'PENDING',
          purpose: input.purpose,
          notes: input.notes,
          maturityDate,
        },
      });

      // Create schedule entries
      await tx.loanSchedule.createMany({
        data: calculation.schedule.map((item) => ({
          loanId: newLoan.id,
          installmentNumber: item.installmentNumber,
          dueDate: item.dueDate,
          principalAmount: item.principalAmount,
          interestAmount: item.interestAmount,
          totalAmount: item.totalAmount,
          paidAmount: 0,
          penaltyAmount: 0,
          status: 'PENDING',
        })),
      });

      return newLoan;
    });

    // Audit log
    await prisma.auditLog.create({
      data: {
        action: 'LOAN_CREATED',
        entityType: 'Loan',
        entityId: loan.id,
        userId: officerId,
        changes: JSON.stringify({
          loanNumber,
          borrower: `${borrower.firstName} ${borrower.lastName}`,
          principal: input.principalAmount,
          interestRate,
          interestMethod,
        }),
      },
    });

    logger.info(`Loan ${loanNumber} created for borrower ${borrower.firstName} ${borrower.lastName}`);

    return this.getById(loan.id);
  }

  async approve(id: string, input: ApproveLoanInput, approvedById: string) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.status !== 'PENDING') {
      throw new BadRequestError(`Cannot approve a loan with status "${loan.status}"`);
    }

    const updated = await prisma.loan.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById,
        approvedAt: new Date(),
        notes: input.notes ? `${loan.notes || ''}\nApproval: ${input.notes}` : loan.notes,
      },
      select: this.loanSelect,
    });

    await prisma.auditLog.create({
      data: {
        action: 'LOAN_APPROVED',
        entityType: 'Loan',
        entityId: id,
        userId: approvedById,
        changes: JSON.stringify({ notes: input.notes }),
      },
    });

    logger.info(`Loan ${loan.loanNumber} approved by ${approvedById}`);

    return updated;
  }

  async reject(id: string, reason: string, rejectedBy: string) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.status !== 'PENDING') {
      throw new BadRequestError(`Cannot reject a loan with status "${loan.status}"`);
    }

    const updated = await prisma.loan.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: `${loan.notes || ''}\nRejection reason: ${reason}`,
      },
      select: this.loanSelect,
    });

    await prisma.auditLog.create({
      data: {
        action: 'LOAN_REJECTED',
        entityType: 'Loan',
        entityId: id,
        userId: rejectedBy,
        changes: JSON.stringify({ reason }),
      },
    });

    return updated;
  }

  async disburse(id: string, input: DisburseLoanInput, disbursedBy: string) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundError('Loan not found');
    if (loan.status !== 'APPROVED') {
      throw new BadRequestError(`Cannot disburse a loan with status "${loan.status}". Must be approved first.`);
    }

    // Recalculate schedule based on actual disbursement date
    const product = await prisma.loanProduct.findUnique({
      where: { id: loan.loanProductId },
    });

    const calculation = calculateLoan({
      principal: Number(loan.principalAmount),
      annualRate: Number(loan.interestRate),
      durationValue: loan.durationValue,
      durationUnit: loan.durationUnit as any,
      interestMethod: loan.interestMethod as any,
      repaymentFrequency: loan.repaymentFrequency as any,
      startDate: input.disbursementDate,
    });

    const maturityDate = calculation.schedule[calculation.schedule.length - 1].dueDate;

    await prisma.$transaction(async (tx) => {
      // Update loan
      await tx.loan.update({
        where: { id },
        data: {
          status: 'ACTIVE',
          disbursedAt: input.disbursementDate,
          disbursementMethod: input.disbursementMethod,
          disbursementReference: input.disbursementReference,
          maturityDate,
          totalInterest: calculation.totalInterest,
          totalDue: calculation.totalDue,
          outstandingBalance: calculation.totalDue,
          installmentAmount: calculation.installmentAmount,
          numberOfInstallments: calculation.numberOfInstallments,
          notes: input.notes ? `${loan.notes || ''}\nDisbursement: ${input.notes}` : loan.notes,
        },
      });

      // Replace schedule
      await tx.loanSchedule.deleteMany({ where: { loanId: id } });
      await tx.loanSchedule.createMany({
        data: calculation.schedule.map((item) => ({
          loanId: id,
          installmentNumber: item.installmentNumber,
          dueDate: item.dueDate,
          principalAmount: item.principalAmount,
          interestAmount: item.interestAmount,
          totalAmount: item.totalAmount,
          paidAmount: 0,
          penaltyAmount: 0,
          status: 'PENDING',
        })),
      });
    });

    await prisma.auditLog.create({
      data: {
        action: 'LOAN_DISBURSED',
        entityType: 'Loan',
        entityId: id,
        userId: disbursedBy,
        changes: JSON.stringify({
          disbursementDate: input.disbursementDate,
          method: input.disbursementMethod,
          reference: input.disbursementReference,
        }),
      },
    });

    logger.info(`Loan ${loan.loanNumber} disbursed on ${input.disbursementDate}`);

    return this.getById(id);
  }

  /**
   * Preview loan calculation without creating it
   */
  async preview(input: PreviewLoanInput) {
    const calculation = calculateLoan({
      principal: input.principalAmount,
      annualRate: input.interestRate,
      durationValue: input.durationValue,
      durationUnit: input.durationUnit,
      interestMethod: input.interestMethod,
      repaymentFrequency: input.repaymentFrequency,
      startDate: input.startDate,
    });

    return calculation;
  }

  /**
   * Write off a loan
   */
  async writeOff(id: string, reason: string, writtenOffBy: string) {
    const loan = await prisma.loan.findUnique({ where: { id } });
    if (!loan) throw new NotFoundError('Loan not found');
    if (!['ACTIVE', 'OVERDUE', 'DEFAULTED'].includes(loan.status)) {
      throw new BadRequestError('Only active, overdue, or defaulted loans can be written off');
    }

    await prisma.loan.update({
      where: { id },
      data: {
        status: 'WRITTEN_OFF',
        writtenOffAt: new Date(),
        writtenOffBy,
        writtenOffReason: reason,
      },
    });

    await prisma.auditLog.create({
      data: {
        action: 'LOAN_WRITTEN_OFF',
        entityType: 'Loan',
        entityId: id,
        userId: writtenOffBy,
        changes: JSON.stringify({ reason, outstandingBalance: loan.outstandingBalance }),
      },
    });

    logger.info(`Loan ${loan.loanNumber} written off. Reason: ${reason}`);
  }

  /**
   * Get loan products
   */
  async getProducts() {
    return prisma.loanProduct.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }
}

export const loanService = new LoanService();
