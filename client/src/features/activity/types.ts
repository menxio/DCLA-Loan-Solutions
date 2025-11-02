export interface ActivityLog {
  id: string;
  entityType: string;
  entityId: string | null;
  memberId: string | null;
  centerId: string | null;
  loanId: string | null;
  action: string;
  description: string | null;
  amount: number | null;
  payload: Record<string, unknown> | null;
  performedByUserId: string | null;
  createdAt: string;
}

export interface ActivityLogResponse {
  items: ActivityLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityLogQuery {
  memberId?: string;
  centerId?: string;
  loanId?: string;
  entityType?: string;
  action?: string;
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}
