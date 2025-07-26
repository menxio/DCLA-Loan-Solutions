import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthState, User } from "../../types/auth";

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      login: (token: string, user: User) => {
        set({
          user,
          token,
          isAuthenticated: true,
        });
      },
      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-storage",
    }
  )
);
