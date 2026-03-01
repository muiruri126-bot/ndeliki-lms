import { prisma } from '../../config/database';
import { ConflictError, NotFoundError } from '../../utils/errors';
import { parsePagination, paginatedMeta, parseSort } from '../../utils/helpers';
import logger from '../../config/logger';
import type { CreateBorrowerInput, UpdateBorrowerInput, BorrowerQuery } from './borrower.schemas';

export class BorrowerService {
  private readonly select = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
    alternativePhone: true,
    nationalId: true,
    dateOfBirth: true,
    gender: true,
    address: true,
    county: true,
    subCounty: true,
    ward: true,
    occupation: true,
    employer: true,
    monthlyIncome: true,
    nextOfKinName: true,
    nextOfKinPhone: true,
    nextOfKinRelationship: true,
    riskRating: true,
    notes: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
    assignedOfficer: {
      select: { id: true, firstName: true, lastName: true },
    },
    _count: {
      select: { loans: true },
    },
  };

  async list(query: BorrowerQuery) {
    const { page, perPage, skip } = parsePagination(query);
    const orderBy = parseSort(query.sort, ['firstName', 'lastName', 'createdAt', 'county']);

    const where: any = { isActive: true };

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search } },
        { lastName: { contains: query.search } },
        { phone: { contains: query.search } },
        { nationalId: { contains: query.search } },
        { email: { contains: query.search } },
      ];
    }

    if (query.county) {
      where.county = query.county;
    }

    if (query.riskRating) {
      where.riskRating = query.riskRating;
    }

    if (query.assignedOfficerId) {
      where.assignedOfficerId = query.assignedOfficerId;
    }

    const [borrowers, total] = await Promise.all([
      prisma.borrower.findMany({
        where,
        select: this.select,
        orderBy,
        skip,
        take: perPage,
      }),
      prisma.borrower.count({ where }),
    ]);

    return {
      data: borrowers,
      meta: paginatedMeta(total, page, perPage),
    };
  }

  async getById(id: string) {
    const borrower = await prisma.borrower.findUnique({
      where: { id },
      select: {
        ...this.select,
        loans: {
          select: {
            id: true,
            loanNumber: true,
            principalAmount: true,
            status: true,
            disbursedAt: true,
            maturityDate: true,
            totalDue: true,
            totalPaid: true,
            outstandingBalance: true,
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!borrower) throw new NotFoundError('Borrower not found');

    return borrower;
  }

  async create(input: CreateBorrowerInput, createdBy: string) {
    // Check duplicate national ID
    const existing = await prisma.borrower.findUnique({
      where: { nationalId: input.nationalId },
    });
    if (existing) {
      throw new ConflictError('A borrower with this National ID already exists');
    }

    // Check duplicate phone
    const phoneDup = await prisma.borrower.findFirst({
      where: { phone: input.phone },
    });
    if (phoneDup) {
      throw new ConflictError('A borrower with this phone number already exists');
    }

    const borrower = await prisma.borrower.create({
      data: {
        ...input,
        assignedOfficerId: createdBy,
      },
      select: this.select,
    });

    await prisma.auditLog.create({
      data: {
        action: 'BORROWER_CREATED',
        entityType: 'Borrower',
        entityId: borrower.id,
        userId: createdBy,
        changes: JSON.stringify({ firstName: input.firstName, lastName: input.lastName, nationalId: input.nationalId }),
      },
    });

    logger.info(`Borrower created: ${input.firstName} ${input.lastName} by ${createdBy}`);

    return borrower;
  }

  async update(id: string, input: UpdateBorrowerInput, updatedBy: string) {
    const existing = await prisma.borrower.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Borrower not found');

    // Check duplicate national ID if changing
    if (input.nationalId && input.nationalId !== existing.nationalId) {
      const dup = await prisma.borrower.findUnique({
        where: { nationalId: input.nationalId },
      });
      if (dup) throw new ConflictError('A borrower with this National ID already exists');
    }

    const borrower = await prisma.borrower.update({
      where: { id },
      data: input,
      select: this.select,
    });

    await prisma.auditLog.create({
      data: {
        action: 'BORROWER_UPDATED',
        entityType: 'Borrower',
        entityId: id,
        userId: updatedBy,
        changes: JSON.stringify(input),
      },
    });

    return borrower;
  }

  async deactivate(id: string, deactivatedBy: string) {
    const borrower = await prisma.borrower.findUnique({ where: { id } });
    if (!borrower) throw new NotFoundError('Borrower not found');

    // Check for active loans
    const activeLoans = await prisma.loan.count({
      where: {
        borrowerId: id,
        status: { in: ['ACTIVE', 'DISBURSED', 'APPROVED'] },
      },
    });

    if (activeLoans > 0) {
      throw new ConflictError('Cannot deactivate a borrower with active loans');
    }

    await prisma.borrower.update({
      where: { id },
      data: { isActive: false },
    });

    await prisma.auditLog.create({
      data: {
        action: 'BORROWER_DEACTIVATED',
        entityType: 'Borrower',
        entityId: id,
        userId: deactivatedBy,
      },
    });

    logger.info(`Borrower ${id} deactivated by ${deactivatedBy}`);
  }

  /**
   * Get borrower summary statistics
   */
  async getStats(borrowerId: string) {
    const [loans, payments] = await Promise.all([
      prisma.loan.aggregate({
        where: { borrowerId },
        _sum: { principalAmount: true, totalDue: true, totalPaid: true, outstandingBalance: true },
        _count: true,
      }),
      prisma.payment.count({
        where: { loan: { borrowerId }, status: 'COMPLETED' },
      }),
    ]);

    const activeLoans = await prisma.loan.count({
      where: { borrowerId, status: 'ACTIVE' },
    });

    const overdueLoans = await prisma.loan.count({
      where: { borrowerId, status: 'OVERDUE' },
    });

    return {
      totalLoans: loans._count,
      activeLoans,
      overdueLoans,
      totalBorrowed: loans._sum.principalAmount || 0,
      totalDue: loans._sum.totalDue || 0,
      totalPaid: loans._sum.totalPaid || 0,
      outstandingBalance: loans._sum.outstandingBalance || 0,
      totalPayments: payments,
    };
  }
}

export const borrowerService = new BorrowerService();
