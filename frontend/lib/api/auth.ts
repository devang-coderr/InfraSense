import { apiFetch, setToken, clearToken } from "./client";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "officer" | "department_admin" | "super_admin";
  department: string | null;
  organization?: string | null;
  state?: string | null;
  district?: string | null;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  user: AuthUser;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const data = await apiFetch<TokenResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
  setToken(data.access_token);
  return data.user;
}

export async function register(
  name: string,
  email: string,
  password: string,
  role: AuthUser["role"] = "citizen",
  departmentName?: string,
  organization?: string,
  state?: string,
  district?: string
): Promise<AuthUser> {
  const data = await apiFetch<TokenResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      name,
      email,
      password,
      role,
      department_name: departmentName || undefined,
      organization: organization || undefined,
      state: state || undefined,
      district: district || undefined,
    }),
  });
  setToken(data.access_token);
  return data.user;
}

export async function me(): Promise<AuthUser> {
  return apiFetch<AuthUser>("/auth/me");
}

export function logout() {
  clearToken();
}
