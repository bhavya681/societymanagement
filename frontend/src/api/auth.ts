import { api } from "./client";
import type { AuthUser } from "../types";

export function login(email: string, password: string) {
  return api<{ token: string; user: AuthUser }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export function register(payload: Record<string, unknown>) {
  return api<{ token: string; user: AuthUser }>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function registerSociety(payload: Record<string, unknown>) {
  return api<{ token: string; user: AuthUser; society: { inviteCode?: string; name?: string } }>("/auth/register-society", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function logout() {
  return api<null>("/auth/logout", { method: "POST" });
}

export function me() {
  return api<AuthUser>("/auth/me");
}
