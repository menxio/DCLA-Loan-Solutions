export interface PortfolioData {
  no: number;
  centerName: string;
  amountDisbursed: number;
  outstandingCollection: number;
}

export interface PortfolioSummary {
  totalAmountDisbursed: number;
  totalOutstandingCollection: number;
  centers: PortfolioData[];
}

export interface ProjectedIncomeData {
  no: number;
  centerName: string;
  outstandingBalance: number;
  interestIncome: number;
}

export interface ProjectedIncomeSummary {
  totalOutstandingBalance: number;
  totalInterestIncome: number;
  centers: ProjectedIncomeData[];
}