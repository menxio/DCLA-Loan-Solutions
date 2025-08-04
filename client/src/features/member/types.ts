// import type { Loan, Savings } from "@features/loans/types";

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  middleName: string;
  contactNumber: string;
  address: string;
  birthDate: Date;
}

export interface MemberFormData {
  firstName: string;
  lastName: string;
  middleName: string;
  contactNumber: string;
  address: string;
  birthDate: Date | null;
}

export interface MemberFormProps {
  member?: Member;
  onSubmit: (data: MemberFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
}

export interface MemberTableProps {
  members: Member[];
  onEdit: (member: Member) => void;
  onDelete: (id: string) => Promise<void>;
  loading?: boolean;
}
