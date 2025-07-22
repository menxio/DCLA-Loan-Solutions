import axios, { AxiosRequestConfig } from "axios";
import type {
  LoginCredentials,
  RegisterCredentials,
  AuthResponse,
  ProfileUpdateData,
  PasswordChangeData,
} from "./types";

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Create axios instance
const authApi = axios.create({
  baseURL: `${API_BASE_URL}/auth`,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests if available
authApi.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = localStorage.getItem("token");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const authService = {
  // Register new user
  register: async (credentials: RegisterCredentials): Promise<AuthResponse> => {
    const response = await authApi.post("/register", credentials);
    return response.data;
  },

  // Login user
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await authApi.post("/login", credentials);
    return response.data;
  },

  // Get user profile
  getProfile: async () => {
    const response = await authApi.get("/profile");
    return response.data;
  },

  // Update user profile
  updateProfile: async (data: ProfileUpdateData) => {
    const response = await authApi.put("/profile", data);
    return response.data;
  },

  // Change password
  changePassword: async (data: PasswordChangeData) => {
    const response = await authApi.put("/change-password", data);
    return response.data;
  },

  // Logout (client-side only)
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  },
};

export default authService;
