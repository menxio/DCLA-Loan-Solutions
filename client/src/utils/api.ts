import axios from "axios";
import type { InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@features/auth/authStore";

// ⚠️ Use environment variable instead of hardcoding localhost
// Netlify will let you inject VITE_API_URL in settings
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000/api",
});

// Use InternalAxiosRequestConfig instead of AxiosRequestConfig
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default api;
