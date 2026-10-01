import { apiFetch } from "./client";

export interface DistrictTransparencyStats {
  district_name: string;
  state?: string | null;
  total_reports: number;
  resolved: number;
  in_progress: number;
  pending: number;
  resolution_rate: number;
}

export interface CategoryTransparencyStats {
  category: string;
  total_reports: number;
  resolved: number;
  in_progress: number;
  pending: number;
  resolution_rate: number;
}

export interface TransparencyOverview {
  total_reports: number;
  resolved: number;
  in_progress: number;
  pending: number;
  resolution_rate: number;
  category_filter?: string | null;
  last_updated?: string | null;
  districts: DistrictTransparencyStats[];
  categories: CategoryTransparencyStats[];
}

export interface GetTransparencyStatsOptions {
  category?: string | null;
  state?: string | null;
}

/**
 * Public API client to retrieve aggregate infrastructure transparency statistics.
 */
export async function getTransparencyStats(
  options?: GetTransparencyStatsOptions
): Promise<TransparencyOverview> {
  const params = new URLSearchParams();
  if (options?.category) {
    params.set("category", options.category);
  }
  if (options?.state) {
    params.set("state", options.state);
  }

  const query = params.toString() ? `?${params.toString()}` : "";
  return apiFetch<TransparencyOverview>(`/transparency/stats${query}`);
}
