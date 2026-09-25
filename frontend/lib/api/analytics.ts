import { apiFetch } from "./client";
import type { HealthCategory } from "@/lib/types";

export interface CategoryCount {
  name: string;
  value: number;
}

export interface TrendPoint {
  week: string;
  reports: number;
}

export interface ResolutionStats {
  total_issues: number;
  resolved_issues: number;
  resolution_rate: number;
  average_resolution_days: number;
}

export interface HealthResponse {
  city_health_score: number;
  categories: HealthCategory[];
  methodology: string;
}

export async function getCategoryBreakdown(): Promise<CategoryCount[]> {
  return apiFetch<CategoryCount[]>("/analytics/categories");
}

export async function getTrends(): Promise<TrendPoint[]> {
  return apiFetch<TrendPoint[]>("/analytics/trends");
}

export async function getResolutionStats(): Promise<ResolutionStats> {
  return apiFetch<ResolutionStats>("/analytics/resolution");
}

export async function getHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/analytics/health");
}
