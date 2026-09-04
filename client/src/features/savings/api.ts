import axios from "axios";
import { useAuthStore } from "@features/auth/authStore";
import type { SavingsHistoryParams, SavingsHistoryResponse } from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

const savingsApi = axios.create({
  baseURL: `${API_BASE_URL}/savings`,
  headers: {
    "Content-Type": "application/json",
  },
});

savingsApi.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const savingsService = {
  deposit: async (data: {
    memberId: string;
    amount: number;
    remarks?: string;
    loanId?: string;
  }) => {
    const response = await savingsApi.post("/deposit", data);
    return response.data;
  },
  withdraw: async (data: {
    memberId: string;
    amount: number;
    remarks?: string;
    loanId?: string;
  }) => {
    const response = await savingsApi.post("/withdraw", data);
    return response.data;
  },
  getByMember: async (memberId: string) => {
    const response = await savingsApi.get(`/member/${memberId}`);
    return response.data;
  },
  getHistory: async ({
    memberId,
    scope,
    page = 1,
    limit = 25,
  }: SavingsHistoryParams): Promise<SavingsHistoryResponse> => {
    const response = await savingsApi.get<SavingsHistoryResponse>(
      `/member/${memberId}/history`,
      { params: { scope, page, limit } },
    );
    return response.data;
  },
};

export default savingsService;
