import { Router, Response, NextFunction } from 'express';
import { reportController } from './report.controller';
import { authenticate, requireRole } from '../../middleware';
import { prisma } from '../../config/database';
import { AuthenticatedRequest } from '../../types';

const router = Router();

router.use(authenticate);
router.use(requireRole('SYSTEM_ADMIN', 'LOAN_OFFICER', 'ACCOUNTANT'));

router.get('/portfolio', reportController.portfolioSummary.bind(reportController));
router.get('/collections', reportController.collectionReport.bind(reportController));
router.get('/overdue', reportController.overdueReport.bind(reportController));
router.get('/officer-performance', reportController.officerPerformance.bind(reportController));

// ── CSV Export Endpoints ───────────────────────────────

function toCsv(headers: string[], rows: any[][]): string {
  const escape = (v: any) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
}

function sendCsv(res: Response, filename: string, csv: string) {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csv);
}

// Export borrowers
router.get('/export/borrowers', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const borrowers = await prisma.borrower.findMany({
      orderBy: { createdAt: 'desc' },
      include: { assignedOfficer: { select: { firstName: true, lastName: true } } },
    });
    const headers = ['Name', 'Phone', 'National ID', 'Email', 'Gender', 'County', 'Occupation', 'Risk Rating', 'Status', 'Officer', 'Created'];
    const rows = borrowers.map((b) => [
      `${b.firstName} ${b.lastName}`, b.phone, b.nationalId, b.email || '',
      b.gender || '', b.county || '', b.occupation || '', b.riskRating,
      b.isActive ? 'Active' : 'Inactive',
      b.assignedOfficer ? `${b.assignedOfficer.firstName} ${b.assignedOfficer.lastName}` : '',
      b.createdAt.toISOString().split('T')[0],
    ]);
    sendCsv(res, `borrowers_${new Date().toISOString().split('T')[0]}.csv`, toCsv(headers, rows));
  } catch (error) { next(error); }
});

// Export loans
router.get('/export/loans', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const loans = await prisma.loan.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        borrower: { select: { firstName: true, lastName: true, phone: true } },
        loanProduct: { select: { name: true } },
        officer: { select: { firstName: true, lastName: true } },
      },
    });
    const headers = ['Loan #', 'Borrower', 'Phone', 'Product', 'Principal', 'Interest Rate', 'Total Due', 'Total Paid', 'Outstanding', 'Status', 'Officer', 'Disbursed', 'Maturity'];
    const rows = loans.map((l) => [
      l.loanNumber,
      `${l.borrower.firstName} ${l.borrower.lastName}`, l.borrower.phone,
      l.loanProduct?.name || '', Number(l.principalAmount), Number(l.interestRate),
      Number(l.totalDue), Number(l.totalPaid), Number(l.outstandingBalance),
      l.status, `${l.officer.firstName} ${l.officer.lastName}`,
      l.disbursedAt ? l.disbursedAt.toISOString().split('T')[0] : '',
      l.maturityDate ? l.maturityDate.toISOString().split('T')[0] : '',
    ]);
    sendCsv(res, `loans_${new Date().toISOString().split('T')[0]}.csv`, toCsv(headers, rows));
  } catch (error) { next(error); }
});

// Export payments
router.get('/export/payments', async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { paymentDate: 'desc' },
      include: {
        loan: {
          select: {
            loanNumber: true,
            borrower: { select: { firstName: true, lastName: true } },
          },
        },
        processedBy: { select: { firstName: true, lastName: true } },
      },
    });
    const headers = ['Payment #', 'Loan #', 'Borrower', 'Amount', 'Date', 'Method', 'Reference', 'Status', 'Processed By'];
    const rows = payments.map((p) => [
      p.paymentNumber, p.loan.loanNumber,
      `${p.loan.borrower.firstName} ${p.loan.borrower.lastName}`,
      Number(p.amount), p.paymentDate.toISOString().split('T')[0],
      p.paymentMethod, p.reference || '', p.status,
      p.processedBy ? `${p.processedBy.firstName} ${p.processedBy.lastName}` : '',
    ]);
    sendCsv(res, `payments_${new Date().toISOString().split('T')[0]}.csv`, toCsv(headers, rows));
  } catch (error) { next(error); }
});

export default router;
