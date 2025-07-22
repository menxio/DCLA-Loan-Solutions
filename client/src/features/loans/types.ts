export interface Loan {
  id: string;
  applicantId: string;
  loanType: "personal" | "business" | "mortgage" | "auto";
  amount: number;
  term: number;
  interestRate: number;
  status: "pending" | "approved" | "rejected";
  purpose: string;
  monthlyIncome: number;
  employmentStatus: "employed" | "self-employed" | "unemployed" | "retired";
  creditScore: number;
  collateral?: string;
  notes?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  // Computed fields
  monthlyPayment?: number;
  totalInterest?: number;
  // User info from join
  firstName?: string;
  lastName?: string;
  email?: string;
}

export interface CreateLoanData {
  loanType: "personal" | "business" | "mortgage" | "auto";
  amount: number;
  term: number;
  purpose: string;
  monthlyIncome: number;
  employmentStatus: "employed" | "self-employed" | "unemployed" | "retired";
  creditScore: number;
  collateral?: string;
}

export interface UpdateLoanData {
  loanType?: "personal" | "business" | "mortgage" | "auto";
  amount?: number;
  term?: number;
  purpose?: string;
  monthlyIncome?: number;
  employmentStatus?: "employed" | "self-employed" | "unemployed" | "retired";
  creditScore?: number;
  collateral?: string;
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
