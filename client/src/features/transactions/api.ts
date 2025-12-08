import api from "@utils/api";
import type {
  TransactionHistoryResponse,
  TransactionFilterType,
} from "./types";

export type TransactionHistoryQuery = {
  page?: number;
  limit?: number;
  type?: TransactionFilterType | "all";
  memberId?: string;
  centerId?: string;
  loanId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
};

export const TransactionsAPI = {
  async getHistory(
    params: TransactionHistoryQuery = {}
  ): Promise<TransactionHistoryResponse> {
    const response = await api.get("/transactions", { params });
    return response.data;
  },
};
