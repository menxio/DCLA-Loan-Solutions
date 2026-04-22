export interface Borrower {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  contactNumber: string;
  address: string;
  birthDate?: Date;
  loans: Loan[];
  savings: Savings[];
  createdAt: string;
  updatedAt: string;
}

export interface Loan {
  id: string;
  borrowerId: string;
  borrower: {
    id: string;
    firstName: string;
    lastName: string;
    middleName: string;
  };
  principalAmount: number;
  termWeeks: number;
  interestRate: number;
  totalAmount: number;
  weeklyPaymentAmount: number;
  amountPaid: number;
  balance: number;
  savings: number;
  weeksPaid: number;
  pastDueInterestAccrued?: number;
  pastDueInterestWaived?: number;
  penaltyAccrued?: number;
  penaltyWaived?: number;
  status: 'active' | 'paid' | 'defaulted' | 'netoff' | 'payoff';
  netCashReleased?: number | null;
  loanCreatedDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface LoanWaiver {
  id: string;
  loanId: string;
  pastDueInterestWaived: number;
  penaltyWaived: number;
  totalWaived: number;
  waivedById?: string | null;
  reason?: string | null;
  beforeBalance: number;
  afterBalance: number;
  createdAt: string;
}

export interface LoanWaiverCandidate {
  id: string;
  borrower: {
    id: string;
    firstName: string;
    middleName?: string;
    lastName: string;
  };
  status: Loan["status"];
  balance: number;
  pastDueInterestAccrued: number;
  pastDueInterestWaived: number;
  penaltyAccrued: number;
  penaltyWaived: number;
  pastDueInterestOutstanding: number;
  penaltyOutstanding: number;
  totalOutstanding: number;
  updatedAt: string;
}

export interface ApplyLoanWaiverPayload {
  pastDueInterestWaiver?: number;
  penaltyWaiver?: number;
  reason?: string;
}

export interface ApplyLoanWaiverResponse {
  loan: Loan;
  waiver: LoanWaiver;
  pastDueInterestOutstanding: number;
  penaltyOutstanding: number;
  totalOutstanding: number;
}

export interface Savings {
  id: string;
  borrowerId?: string | null;
  loanId?: string | null;
  amount: number;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateLoanData {
  borrowerId: string;
  principalAmount: number;
  termWeeks: 4 | 8 | 12;
  savings?: number;
  serviceCharge?: number;
  loanCreatedDate?: Date;
}

export interface LoanFormData {
  principalAmount: number;
  termWeeks: 4 | 8 | 12;
  savings?: number;
  serviceCharge?: number;
  loanCreatedDate?: Date;
}

export interface UpdateLoanTermData {
  termWeeks: 4 | 8 | 12;
}

export interface LoanCalculation {
  principalAmount: number;
  termWeeks: 4 | 8 | 12;
  interestRate: number;
  totalInterest: number;
  totalAmount: number;
  weeklyPaymentAmount: number;
  savings: number;
}

export interface ReloanEligibility {
  eligible: boolean;
  reason?: string;
  activeLoan?: Loan;
}

export interface LoanFilters {
  status?: "pending" | "approved" | "rejected";
  loanType?: "personal" | "business" | "mortgage" | "auto";
}

export interface LoanStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  totalAmount: number;
  averageAmount: number;
}

export interface LoanResponse {
  message: string;
  loan: Loan;
}

export interface LoansResponse {
  loans: Loan[];
}

export type MemberLoanStatusFilter =
  | "all"
  | "active"
  | "paid"
  | "defaulted"
  | "netoff"
  | "payoff";

export interface MemberLoansQuery {
  status?: MemberLoanStatusFilter;
  page?: number;
  limit?: number;
}

export interface MemberLoansResponse {
  items: Loan[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoanStatsResponse {
  stats: LoanStats;
}

export type LoanRepaymentStatus = 'unpaid' | 'partial' | 'paid' | 'advance';

export interface LoanRepaymentScheduleRow {
  id: string;
  loanId: string;
  memberId: string | null;
  centerId: string | null;
  dueDate: string;
  weekNumber: number;
  amountDue: number;
  amountPaid: number;
  status: LoanRepaymentStatus;
  advanceApplied: number;
  createdAt?: string;
  updatedAt?: string;
}
