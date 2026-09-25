/**
 * Base API client.
 *
 * WHAT: one place that knows the backend's base URL and how to attach the
 * login token to every request.
 * WHY: every other file in lib/api/ calls `apiFetch(...)` instead of
 * repeating fetch/headers/error-handling logic everywhere.
 *
 * NEXT_PUBLIC_API_URL is read from frontend/.env.local (see
 * .env.local.example in this same lib/api folder... actually at the repo
 * root — see backend/README.md "Frontend API integration").
 */

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export function getBackendOrigin(): string {
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "").replace(/\/$/, "");
}

export function getMediaUrl(path?: string | null): string | null {
  if (!path) return null;
  const trimmed = path.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  const origin = getBackendOrigin();
  const cleanPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${origin}${cleanPath}`;
}

const TOKEN_STORAGE_KEY = "infrasense_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  window.dispatchEvent(new Event("infrasense_auth_changed"));
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  window.dispatchEvent(new Event("infrasense_auth_changed"));
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;
  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ApiEnvelope<T> =
  | { success: true; data: T; message?: string }
  | { success: false; error: { code: string; message: string; details?: unknown } };

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.body && !(options.body instanceof FormData)
      ? { "Content-Type": "application/json" }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });
  } catch (netErr) {
    const detail = netErr instanceof Error ? netErr.message : "Network error";
    throw new ApiError(
      "NETWORK_ERROR",
      `Unable to connect to server at ${API_BASE_URL}. Please ensure the backend server is running. (${detail})`,
      0
    );
  }

  let body: (ApiEnvelope<T> & { detail?: unknown }) | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T> & { detail?: unknown };
  } catch {
    throw new ApiError(
      "INVALID_RESPONSE",
      `Server returned an invalid response (HTTP ${response.status} ${response.statusText || ""}).`.trim(),
      response.status
    );
  }

  if (!response.ok || (body && body.success === false)) {
    let code = "UNKNOWN";
    let message = "Request failed";
    let details: unknown = undefined;

    if (body && "error" in body && body.error) {
      code = body.error.code || "API_ERROR";
      message = body.error.message || message;
      details = body.error.details;

      if (Array.isArray(details) && details.length > 0) {
        const detailStrings = details
          .map((d: { loc?: string[]; msg?: string }) => {
            const loc = Array.isArray(d.loc) ? d.loc.slice(1).join(".") : "";
            return loc && d.msg ? `${loc}: ${d.msg}` : d.msg || JSON.stringify(d);
          })
          .filter(Boolean);
        if (detailStrings.length > 0) {
          message = `${message} (${detailStrings.join("; ")})`;
        }
      }
    } else if (body && "detail" in body && body.detail) {
      code = `HTTP_${response.status}`;
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((d: { msg?: string }) => d.msg || JSON.stringify(d))
          .join("; ");
      }
    }

    throw new ApiError(code, message, response.status, details);
  }

  return body.data;
}
