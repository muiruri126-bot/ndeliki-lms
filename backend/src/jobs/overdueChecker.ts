import { prisma } from '../config/database';
import logger from '../config/logger';

/**
 * Checks for overdue loan installments and updates loan statuses.
 * Should be run periodically (e.g., daily).
 */
export async function checkOverdueLoans() {
  const now = new Date();
  logger.info('[OverdueChecker] Starting overdue loan check...');

  try {
    // 1. Find all PENDING or PARTIALLY_PAID installments that are past due
    const overdueSchedules = await prisma.loanSchedule.findMany({
      where: {
        status: { in: ['PENDING', 'PARTIALLY_PAID'] },
        dueDate: { lt: now },
        loan: { status: { in: ['ACTIVE'] } },
      },
      include: {
        loan: {
          select: { id: true, loanNumber: true, status: true },
        },
      },
    });

    if (overdueSchedules.length === 0) {
      logger.info('[OverdueChecker] No overdue installments found.');
      return { overdueSchedules: 0, loansMarkedOverdue: 0 };
    }

    // 2. Mark overdue installments
    const scheduleIds = overdueSchedules.map((s) => s.id);
    await prisma.loanSchedule.updateMany({
      where: { id: { in: scheduleIds }, status: { in: ['PENDING', 'PARTIALLY_PAID'] } },
      data: { status: 'OVERDUE' },
    });

    // 3. Mark parent loans as OVERDUE
    const loanIds = [...new Set(overdueSchedules.map((s) => s.loan.id))];
    await prisma.loan.updateMany({
      where: { id: { in: loanIds }, status: 'ACTIVE' },
      data: { status: 'OVERDUE' },
    });

    // 4. Apply penalties where grace period has passed
    let penaltiesApplied = 0;
    for (const schedule of overdueSchedules) {
      const loan = await prisma.loan.findUnique({
        where: { id: schedule.loan.id },
        include: { loanProduct: true },
      });
      if (!loan || !loan.loanProduct) continue;

      const graceDays = loan.loanProduct.penaltyGraceDays || 0;
      const penaltyRate = Number(loan.loanProduct.penaltyRate) || 0;
      if (penaltyRate <= 0) continue;

      const dueDate = new Date(schedule.dueDate);
      const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysPastDue <= graceDays) continue;

      // Calculate penalty: penaltyRate% of the unpaid amount
      const unpaid = Number(schedule.totalAmount) - Number(schedule.paidAmount);
      if (unpaid <= 0) continue;

      const penalty = Math.round((unpaid * penaltyRate / 100) * 100) / 100;
      const currentPenalty = Number(schedule.penaltyAmount) || 0;

      // Only apply if penalty hasn't been applied yet (or is different)
      if (currentPenalty < penalty) {
        await prisma.loanSchedule.update({
          where: { id: schedule.id },
          data: { penaltyAmount: penalty },
        });

        // Update loan total penalty
        await prisma.loan.update({
          where: { id: loan.id },
          data: {
            totalPenalty: { increment: penalty - currentPenalty },
            totalDue: { increment: penalty - currentPenalty },
            outstandingBalance: { increment: penalty - currentPenalty },
          },
        });
        penaltiesApplied++;
      }
    }

    logger.info(
      `[OverdueChecker] Processed: ${overdueSchedules.length} overdue installments, ` +
      `${loanIds.length} loans marked overdue, ${penaltiesApplied} penalties applied.`
    );

    return {
      overdueSchedules: overdueSchedules.length,
      loansMarkedOverdue: loanIds.length,
      penaltiesApplied,
    };
  } catch (error) {
    logger.error('[OverdueChecker] Error:', error);
    throw error;
  }
}

/**
 * Starts the overdue checker on a timer interval.
 * Default: runs every 6 hours.
 */
export function startOverdueChecker(intervalMs = 6 * 60 * 60 * 1000) {
  logger.info(`[OverdueChecker] Scheduled to run every ${intervalMs / 1000 / 60} minutes`);

  // Run once immediately after a short delay (let DB connect first)
  setTimeout(() => {
    checkOverdueLoans().catch((e) => logger.error('[OverdueChecker] Initial run failed:', e));
  }, 30000); // 30 second delay

  // Then schedule recurring runs
  setInterval(() => {
    checkOverdueLoans().catch((e) => logger.error('[OverdueChecker] Scheduled run failed:', e));
  }, intervalMs);
}
