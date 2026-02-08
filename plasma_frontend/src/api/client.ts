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
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...init.headers,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    const isConnectionError =
      msg === "Failed to fetch" ||
      e instanceof TypeError ||
      /connection refused|network error|load failed/i.test(String(e));
    if (isConnectionError) {
      // Return a graceful error instead of throwing to prevent app crash
      // The app should work even if backend is unavailable
      console.warn("[API] Backend unreachable. App will continue without backend features.");
      throw new Error(
        "Backend unreachable. Start it with: cd plasma_backend && npm run dev",
      );
    }
    throw e;
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as ApiError).error ?? res.statusText ?? "Erreur API");
  }
  return data as T;
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number>) =>
    request<T>(path, { method: "GET", params }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined }),
};
