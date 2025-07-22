import axios, { AxiosRequestConfig } from "axios";
import type {
  CreateLoanData,
  UpdateLoanData,
  LoanFilters,
  LoanResponse,
  LoansResponse,
  LoanStatsResponse,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance
const loansApi = axios.create({
  baseURL: `${API_BASE_URL}/loans`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
loansApi.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const loansService = {
  // Create new loan application
  createLoan: async (data: CreateLoanData): Promise<LoanResponse> => {
    const response = await loansApi.post("/", data);
    return response.data;
  },

  // Get user's loans
  getMyLoans: async (): Promise<LoansResponse> => {
    const response = await loansApi.get("/my-loans");
    return response.data;
  },

  // Get specific loan by ID
  getLoanById: async (id: string): Promise<LoanResponse> => {
    const response = await loansApi.get(`/${id}`);
    return response.data;
  },

  // Get all loans (admin only)
  getAllLoans: async (filters?: LoanFilters): Promise<LoansResponse> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append("status", filters.status);
    if (filters?.loanType) params.append("loanType", filters.loanType);

    const response = await loansApi.get(`/?${params.toString()}`);
    return response.data;
  },

  // Update loan application
  updateLoan: async (
    id: string,
    data: UpdateLoanData
  ): Promise<LoanResponse> => {
    const response = await loansApi.put(`/${id}`, data);
    return response.data;
  },

  // Approve loan (admin only)
  approveLoan: async (id: string, notes?: string): Promise<LoanResponse> => {
    const response = await loansApi.post(`/${id}/approve`, { notes });
    return response.data;
  },

  // Reject loan (admin only)
  rejectLoan: async (id: string, notes: string): Promise<LoanResponse> => {
    const response = await loansApi.post(`/${id}/reject`, { notes });
    return response.data;
  },

  // Get loan statistics (admin only)
  getLoanStats: async (): Promise<LoanStatsResponse> => {
    const response = await loansApi.get("/stats/overview");
    return response.data;
  },
};

export default loansService;
