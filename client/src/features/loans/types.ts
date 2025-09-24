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
  status: 'active' | 'paid' | 'defaulted' | 'netoff' | 'payoff';
  netCashReleased?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Savings {
  id: string;
  borrowerId: string;
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
}

export interface LoanFormData {
  principalAmount: number;
  termWeeks: 4 | 8 | 12;
  savings?: number;
  serviceCharge?: number;
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

export interface LoanStatsResponse {
  stats: LoanStats;
}
