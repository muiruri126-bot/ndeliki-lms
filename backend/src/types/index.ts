import { Request } from 'express';

export interface JwtPayload {
  id: string;
  email: string;
  roles: string[];
  permissions: string[];
  borrowerId?: string | null;
  iat?: number;
  exp?: number;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  dataFilter?: {
    borrowerId?: string;
    officerId?: string;
  };
}

export interface PaginationQuery {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  success: true;
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface LoanCalculation {
  principal: number;
  totalInterest: number;
  totalDue: number;
  installmentAmount: number;
  numberOfInstallments: number;
  schedule: ScheduleItem[];
}

export interface ScheduleItem {
  installmentNumber: number;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  balanceAfter?: number;
}
