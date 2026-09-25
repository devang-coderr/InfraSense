import { apiFetch } from "./client";
import type { Issue } from "@/lib/types";

/**
 * Converts the backend's ISO `reportedAt` timestamp into the relative
 * strings the existing UI already expects ("2 days ago"). This keeps
 * every page component unchanged — they just read `issue.reportedAt`.
 */
export function toRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
}

function withRelativeTime(issue: Issue): Issue {
  return { ...issue, reportedAt: toRelativeTime(issue.reportedAt) };
}

interface IssueListResponse {
  items: Issue[];
  total: number;
}

export async function getIssues(filters?: {
  status?: string;
  category?: string;
  severity?: string;
  department?: string;
  ward?: string;
  mine?: boolean;
}): Promise<Issue[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    });
  }
  const query = params.toString() ? `?${params.toString()}` : "";
  const data = await apiFetch<IssueListResponse>(`/issues${query}`);
  return data.items.map(withRelativeTime);
}

export async function getIssue(id: string): Promise<Issue> {
  const issue = await apiFetch<Issue>(`/issues/${id}`);
  return withRelativeTime(issue);
}

export async function getIssuesForMap(): Promise<Issue[]> {
  const issues = await apiFetch<Issue[]>("/issues/map");
  return issues.map(withRelativeTime);
}

export interface CreateIssuePayload {
  description: string;
  latitude: number;
  longitude: number;
  media_id?: number;
  ai_category?: string;
  ai_confidence?: number;
}

export async function createIssue(payload: CreateIssuePayload): Promise<Issue> {
  const issue = await apiFetch<Issue>("/issues", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return withRelativeTime(issue);
}

export async function updateIssue(
  id: string,
  payload: { status?: string; department_id?: number }
): Promise<Issue> {
  const issue = await apiFetch<Issue>(`/issues/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  return withRelativeTime(issue);
}
