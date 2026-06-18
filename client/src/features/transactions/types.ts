export type TransactionType =
  | "repayment"
  | "waiver"
  | "savings_deposit"
  | "savings_withdrawal";

export interface TransactionHistoryItem {
  id: string;
  type: TransactionType;
  amount: number;
  direction: "credit" | "debit";
  member: {
    id: string | null;
    name: string;
    center?: {
      id: string | null;
      name: string | null;
    };
  };
  loan?: {
    id: string | null;
    status?: string | null;
  };
  notes?: string | null;
  createdAt: string;
  source: "repayment" | "savings" | "loan_accounting";
  repaymentOperationType?: "payment" | "reversal" | null;
}

export interface TransactionHistoryResponse {
  items: TransactionHistoryItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export type TransactionFilterType =
  | "all"
  | "repayment"
  | "waiver"
  | "savings"
  | "savings_deposit"
  | "savings_withdrawal";
