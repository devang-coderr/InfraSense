"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AuthUser, me, logout as apiLogout } from "@/lib/api/auth";
import { getToken, clearToken } from "@/lib/api/client";

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async (): Promise<AuthUser | null> => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);
    try {
      const u = await me();
      setUser(u);
      return u;
    } catch (err) {
      clearToken();
      setUser(null);
      setError(err instanceof Error ? err.message : "Session expired");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();

    const handleAuthChange = () => {
      fetchUser();
    };

    window.addEventListener("infrasense_auth_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("infrasense_auth_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
    };
  }, [fetchUser]);

  const logout = useCallback(
    (redirectRole: "citizen" | "authority" = "citizen") => {
      apiLogout();
      setUser(null);
      router.push(`/login?role=${redirectRole}`);
    },
    [router]
  );

  return {
    user,
    loading,
    error,
    logout,
    refetch: fetchUser,
    isAuthenticated: !!user,
  };
}
