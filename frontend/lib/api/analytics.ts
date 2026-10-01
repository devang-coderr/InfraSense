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

export interface SeverityCount {
  severity: string;
  label: string;
  count: number;
  color: string;
}

export interface WorkOrderAnalytics {
  total: number;
  pending: number;
  assigned: number;
  in_progress: number;
  completed: number;
  verified: number;
  completion_rate: number;
}

export interface WardAnalyticsItem {
  ward: string;
  total_issues: number;
  open_issues: number;
  resolved_issues: number;
}

export interface AnalyticsSummary {
  total_reports: number;
  open_issues: number;
  resolved_issues: number;
  critical_issues: number;
  high_priority_issues: number;
  resolution_rate: number;
  average_resolution_days: number;
}

export interface HealthResponse {
  city_health_score: number;
  categories: HealthCategory[];
  methodology: string;
}

export interface AnalyticsOverview {
  summary: AnalyticsSummary;
  severity_distribution: SeverityCount[];
  category_breakdown: CategoryCount[];
  work_order_stats: WorkOrderAnalytics;
  ward_breakdown: WardAnalyticsItem[];
  trends: TrendPoint[];
  health: HealthResponse;
}

export async function getAnalyticsOverview(): Promise<AnalyticsOverview> {
  return apiFetch<AnalyticsOverview>("/analytics/overview");
}

export async function getCategoryBreakdown(): Promise<CategoryCount[]> {
  return apiFetch<CategoryCount[]>("/analytics/categories");
}

export async function getSeverityDistribution(): Promise<SeverityCount[]> {
  return apiFetch<SeverityCount[]>("/analytics/severity");
}

export async function getWorkOrderAnalytics(): Promise<WorkOrderAnalytics> {
  return apiFetch<WorkOrderAnalytics>("/analytics/work-orders");
}

export async function getWardAnalytics(): Promise<WardAnalyticsItem[]> {
  return apiFetch<WardAnalyticsItem[]>("/analytics/wards");
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
