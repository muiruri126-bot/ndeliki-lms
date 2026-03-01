export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  roles: string[];
  permissions: string[];
}

export interface Borrower {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  alternativePhone?: string;
  nationalId: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  county?: string;
  subCounty?: string;
  ward?: string;
  occupation?: string;
  employer?: string;
  monthlyIncome?: number;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
  nextOfKinRelationship?: string;
  riskRating: string;
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  assignedOfficer?: { id: string; firstName: string; lastName: string };
  _count?: { loans: number };
}

export interface LoanProduct {
  id: string;
  name: string;
  description?: string;
  interestRate: number;
  interestMethod: string;
  durationUnit: string;
  repaymentFrequency: string;
  minAmount: number;
  maxAmount: number;
  minDuration: number;
  maxDuration: number;
  penaltyRate?: number;
  penaltyGraceDays?: number;
  isActive: boolean;
}

export interface Loan {
  id: string;
  loanNumber: string;
  principalAmount: number;
  interestRate: number;
  interestMethod: string;
  durationValue: number;
  durationUnit: string;
  repaymentFrequency: string;
  numberOfInstallments: number;
  installmentAmount: number;
  totalInterest: number;
  totalDue: number;
  totalPaid: number;
  outstandingBalance: number;
  totalPenalty: number;
  status: string;
  purpose?: string;
  notes?: string;
  disbursedAt?: string;
  maturityDate?: string;
  approvedAt?: string;
  closedAt?: string;
  createdAt: string;
  updatedAt: string;
  borrower: { id: string; firstName: string; lastName: string; phone: string; nationalId: string };
  loanProduct: { id: string; name: string };
  officer: { id: string; firstName: string; lastName: string };
  approvedBy?: { id: string; firstName: string; lastName: string };
  schedules?: LoanSchedule[];
  payments?: Payment[];
}

export interface LoanSchedule {
  id: string;
  installmentNumber: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  totalAmount: number;
  paidAmount: number;
  penaltyAmount: number;
  status: string;
  paidAt?: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  amount: number;
  paymentDate: string;
  paymentMethod: string;
  reference?: string;
  status: string;
  notes?: string;
  loan?: {
    id: string;
    loanNumber: string;
    borrower: { id: string; firstName: string; lastName: string; phone: string };
  };
  processedBy?: { id: string; firstName: string; lastName: string };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  meta: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardData {
  cards: {
    totalBorrowers: number;
    activeBorrowers: number;
    totalLoans: number;
    activeLoans: number;
    pendingLoans: number;
    overdueLoans: number;
    totalDisbursed: number;
    totalOutstanding: number;
    totalCollected: number;
  };
  thisMonth: {
    disbursedAmount: number;
    disbursedCount: number;
    collectedAmount: number;
    collectedCount: number;
  };
  recentLoans: any[];
  recentPayments: any[];
}
