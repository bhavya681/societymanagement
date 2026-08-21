const TOKEN_KEY = "smh_token";

export class ApiError extends Error {
  errorCode?: string;
  status: number;
  details?: unknown;

  constructor(message: string, status: number, errorCode?: string, details?: unknown) {
    super(message);
    this.status = status;
    this.errorCode = errorCode;
    this.details = details;
  }
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

const BASE = import.meta.env.VITE_API_URL || "/api";

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401 || res.status === 403) {
    setToken(null);
    throw new ApiError("Session expired. Please sign in again.", res.status, "AUTH_EXPIRED");
  }
  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("text/csv")) {
    const blob = await res.blob();
    if (!res.ok) throw new ApiError("Export failed", res.status);
    return blob as T;
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(json.message || "Request failed", res.status, json.errorCode, json.details);
  }
  return json.data as T;
}

export function qs(params: Record<string, string | number | undefined | null>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") search.set(key, String(value));
  });
  const str = search.toString();
  return str ? `?${str}` : "";
}
