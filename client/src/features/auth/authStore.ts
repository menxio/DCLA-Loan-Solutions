import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { AuthState, User } from "../../types/auth";
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isInitialized: false,
      setInitialized: (isInitialized: boolean) => {
        set({ isInitialized });
      },
      setSession: (token: string, refreshToken: string, user: User) => {
        set({
          user,
          token,
          refreshToken,
          isAuthenticated: true,
          isInitialized: true,
        });
      },
      setUser: (user: User) => {
        set({
          user,
          isAuthenticated: true,
          isInitialized: true,
        });
      },
      setAccessToken: (token: string) => {
        set({
          token,
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          isInitialized: true,
        });
      },
    }),
    {
      name: "auth-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
