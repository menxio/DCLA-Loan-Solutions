export type RepaymentStatus = "pending" | "approved" | "rejected";

export interface RepaymentMember {
  id: string;
  firstName?: string;
  middleName?: string | null;
  lastName?: string;
  contactNumber?: string | null;
}

export interface RepaymentCenter {
  id: string;
  name?: string;
}

export interface RepaymentLoan {
  id: string;
}

export interface Repayment {
  id: string;
  amount: number;
  notes?: string | null;
  collectionDate?: string | null;
  useSavings?: boolean;
  status: RepaymentStatus;
  createdAt: string;
  member?: RepaymentMember;
  center?: RepaymentCenter;
  loan?: RepaymentLoan;
  createdById?: string | null;
}
