/**
 * Client API vers le backend Plasma.
 * En dev Vite proxy redirige /api vers le backend (voir vite.config.ts).
 */
const API_BASE =
  typeof import.meta.env.VITE_API_URL === "string" && import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL
    : "/api";

export type ApiError = { error: string };

async function request<T>(
  path: string,
  options?: RequestInit & { params?: Record<string, string | number> }
): Promise<T> {
  const { params, ...init } = options ?? {};
  const base = API_BASE.replace(/\/$/, "");
  const pathWithParams = params
    ? `${path}?${new URLSearchParams(Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])))}`
    : path;
  const url = path.startsWith("http") ? pathWithParams : `${base}${path.startsWith("/") ? "" : "/"}${pathWithParams}`;
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as ApiError).error ?? res.statusText ?? "API error");
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number>) =>
    request<T>(path, { method: "GET", params }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
};
