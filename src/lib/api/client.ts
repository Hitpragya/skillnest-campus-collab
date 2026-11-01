// Thin HTTP client for the PeerNest Node.js API (which wraps the C++ engine).
// Set VITE_PEERNEST_API_URL to the API base URL, e.g. http://localhost:4000/api

export const API_BASE_URL: string | undefined = import.meta.env["VITE_PEERNEST_API_URL"];

export const isApiConfigured = () => Boolean(API_BASE_URL);

export class ApiNotConfiguredError extends Error {
  constructor() {
    super("PeerNest backend is not connected. Set VITE_PEERNEST_API_URL to enable live data.");
    this.name = "ApiNotConfiguredError";
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const TOKEN_KEY = "peernest.token";
export const getToken = () =>
  typeof window === "undefined" ? null : window.localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => {
  if (typeof window === "undefined") return;
  if (t) window.localStorage.setItem(TOKEN_KEY, t);
  else window.localStorage.removeItem(TOKEN_KEY);
};

export async function apiRequest<T>(
  path: string,
  init: RequestInit & { query?: Record<string, unknown> } = {},
): Promise<T> {
  if (!API_BASE_URL) throw new ApiNotConfiguredError();
  const url = new URL(API_BASE_URL.replace(/\/$/, "") + path);
  if (init.query) {
    for (const [k, v] of Object.entries(init.query)) {
      if (v === undefined || v === "" || v === null) continue;
      url.searchParams.set(k, Array.isArray(v) ? v.join(",") : String(v));
    }
  }
  const token = getToken();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new ApiError(res.status, text || res.statusText);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}
