import { DEFAULT_PAGE, DEFAULT_PER_PAGE, MAX_PER_PAGE } from '../config/constants';

export interface PaginationParams {
  page: number;
  perPage: number;
  skip: number;
}

export function parsePagination(query: { page?: string | number; perPage?: string | number }): PaginationParams {
  let page = Number(query.page) || DEFAULT_PAGE;
  let perPage = Number(query.perPage) || DEFAULT_PER_PAGE;

  if (page < 1) page = 1;
  if (perPage < 1) perPage = DEFAULT_PER_PAGE;
  if (perPage > MAX_PER_PAGE) perPage = MAX_PER_PAGE;

  return {
    page,
    perPage,
    skip: (page - 1) * perPage,
  };
}

export function paginatedMeta(total: number, page: number, perPage: number) {
  return {
    page,
    perPage,
    total,
    totalPages: Math.ceil(total / perPage),
  };
}

/**
 * Build a Prisma-compatible orderBy from a query string like "field:asc" or "field:desc"
 */
export function parseSort(
  sortStr?: string,
  allowedFields: string[] = ['createdAt']
): Record<string, 'asc' | 'desc'> {
  if (!sortStr) return { createdAt: 'desc' };

  const [field, direction] = sortStr.split(':');
  const dir = direction === 'asc' ? 'asc' : 'desc';

  if (allowedFields.includes(field)) {
    return { [field]: dir };
  }
  return { createdAt: 'desc' };
}

/**
 * Format a date to ISO date string (YYYY-MM-DD)
 */
export function toISODate(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Generate a sequential number with prefix: NDL-2026-0001
 */
export async function generateLoanNumber(
  prisma: any,
  prefix: string = 'NDL'
): Promise<string> {
  const year = new Date().getFullYear();
  const yearStr = String(year);

  // Find the latest loan number for this year
  const latest = await prisma.loan.findFirst({
    where: {
      loanNumber: { startsWith: `${prefix}-${yearStr}-` },
    },
    orderBy: { loanNumber: 'desc' },
    select: { loanNumber: true },
  });

  let sequence = 1;
  if (latest) {
    const parts = latest.loanNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}-${yearStr}-${String(sequence).padStart(4, '0')}`;
}

/**
 * Generate payment number: PAY-2026-00001
 */
export async function generatePaymentNumber(prisma: any): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PAY-${year}-`;

  const latest = await prisma.payment.findFirst({
    where: { paymentNumber: { startsWith: prefix } },
    orderBy: { paymentNumber: 'desc' },
    select: { paymentNumber: true },
  });

  let sequence = 1;
  if (latest) {
    const parts = latest.paymentNumber.split('-');
    const lastSeq = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(lastSeq)) sequence = lastSeq + 1;
  }

  return `${prefix}${String(sequence).padStart(5, '0')}`;
}

/**
 * Add days to a date
 */
export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Add weeks to a date
 */
export function addWeeks(date: Date, weeks: number): Date {
  return addDays(date, weeks * 7);
}

/**
 * Add months to a date
 */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

/**
 * Calculate days between two dates
 */
export function daysBetween(from: Date, to: Date): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.floor((to.getTime() - from.getTime()) / msPerDay);
}
