import type { Loan, Savings } from "@features/loans/types";

export interface Member {
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
