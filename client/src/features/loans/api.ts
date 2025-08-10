import api from "@utils/api";
import type { CreateLoanData, Loan, ReloanEligibility } from "./types";

export const LoansAPI = {
  getAll: async (): Promise<Loan[]> => {
    const res = await api.get("/loans");
    return res.data;
  },

  getByMember: async (memberId: string): Promise<Loan[]> => {
    const res = await api.get(`/loans/member/${memberId}`);
    return res.data;
  },

  getOne: async (id: string): Promise<Loan> => {
    const res = await api.get(`/loans/${id}`);
    return res.data;
  },

  create: async (data: CreateLoanData): Promise<Loan> => {
    const res = await api.post("/loans", data);
    return res.data;
  },

  update: async (id: string, data: Partial<CreateLoanData>): Promise<Loan> => {
    const res = await api.patch(`/loans/${id}`, data);
    return res.data;
  },

  remove: async (id: string): Promise<void> => {
    await api.delete(`/loans/${id}`);
  },

  checkEligibility: async (memberId: string): Promise<ReloanEligibility> => {
    const res = await api.get(`/loans/member/${memberId}/eligibility`);
    return res.data;
  },
};
