import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import * as authApi from "@/api/auth";
import { ApiError, setToken } from "@/api/client";
import type { AuthUser } from "@/types";

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: Record<string, unknown>) => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const me = await authApi.me();
      setUser(me);
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void refreshUser();
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login: async (email, password) => {
        const result = await authApi.login(email, password);
        setToken(result.token);
        setUser(result.user);
        return result.user;
      },
      register: async (payload) => {
        const result = await authApi.register(payload);
        setToken(result.token);
        setUser(result.user);
        return result.user;
      },
      logout: async () => {
        try {
          await authApi.logout();
        } catch (error) {
          if (!(error instanceof ApiError)) throw error;
        }
        setToken(null);
        setUser(null);
      },
      refreshUser,
    }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function isAdminRole(role?: string) {
  return ["ADMIN", "SECRETARY", "CHAIRMAN", "ACCOUNTANT", "COMMITTEE"].includes(role || "");
}
