import { useEffect } from "react";
import type { ReactNode } from "react";
import FullScreenLoader from "@components/common/FullScreenLoader";
import { authService } from "./api";
import { useAuthStore } from "./authStore";

export default function AuthBootstrap({
  children,
}: {
  children: ReactNode;
}) {
  const token = useAuthStore((state) => state.token);
  const refreshToken = useAuthStore((state) => state.refreshToken);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const setInitialized = useAuthStore((state) => state.setInitialized);
  const setSession = useAuthStore((state) => state.setSession);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (!token && !refreshToken) {
        if (isMounted) {
          setInitialized(true);
        }
        return;
      }

      try {
        if (!token && refreshToken) {
          const refreshed = await authService.refresh(refreshToken);
          if (!isMounted) {
            return;
          }

          setSession(
            refreshed.access_token,
            refreshed.refresh_token,
            refreshed.user,
          );
        }

        let user;

        try {
          user = await authService.getProfile();
        } catch {
          if (!refreshToken) {
            throw new Error("No refresh token available");
          }

          const refreshed = await authService.refresh(refreshToken);
          if (!isMounted) {
            return;
          }

          setSession(
            refreshed.access_token,
            refreshed.refresh_token,
            refreshed.user,
          );
          user = await authService.getProfile();
        }

        if (isMounted) {
          setUser(user);
        }
      } catch {
        if (isMounted) {
          logout();
        }
      } finally {
        if (isMounted) {
          setInitialized(true);
        }
      }
    };

    void initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [logout, refreshToken, setInitialized, setSession, setUser, token]);

  if (!isInitialized) {
    return <FullScreenLoader />;
  }

  return <>{children}</>;
}
