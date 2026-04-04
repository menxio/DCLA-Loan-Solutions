import api from "@utils/api";
import type { Repayment } from "./types";

export const repaymentsService = {
  getPending: async (): Promise<Repayment[]> => {
    const response = await api.get("/repayments/pending");
    return response.data;
  },
  requestReversal: async (
    repaymentId: string,
    reason?: string
  ): Promise<Repayment> => {
    const response = await api.post(`/repayments/${repaymentId}/reversal-request`, {
      reason,
    });
    return response.data;
  },
  approve: async (id: string): Promise<Repayment> => {
    const response = await api.post(`/repayments/${id}/approve`);
    return response.data;
  },
  reject: async (id: string, reason?: string): Promise<Repayment> => {
    const response = await api.post(`/repayments/${id}/reject`, {
      reason,
    });
    return response.data;
  },
};
