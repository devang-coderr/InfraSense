import { apiFetch } from "./client";
import type { Issue } from "@/lib/types";
import { toRelativeTime } from "./issues";

export interface AuthorityDashboard {
  total_issues: number;
  critical_issues: number;
  pending_issues: number;
  resolved_issues: number;
  average_resolution_days: number;
  infrastructure_health: number;
}

export async function getAuthorityDashboard(): Promise<AuthorityDashboard> {
  return apiFetch<AuthorityDashboard>("/authority/dashboard");
}

export async function getPriorityQueue(): Promise<Issue[]> {
  const issues = await apiFetch<Issue[]>("/authority/priority");
  return issues.map((i) => ({ ...i, reportedAt: toRelativeTime(i.reportedAt) }));
}

export async function getAuthorityMap(): Promise<Issue[]> {
  const issues = await apiFetch<Issue[]>("/authority/map");
  return issues.map((i) => ({ ...i, reportedAt: toRelativeTime(i.reportedAt) }));
}
