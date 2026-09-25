import { apiFetch } from "./client";
import type { WardRisk } from "@/lib/types";

export async function getWardRisks(): Promise<WardRisk[]> {
  return apiFetch<WardRisk[]>("/predictions/risks");
}

export async function getHotspots(): Promise<WardRisk[]> {
  return apiFetch<WardRisk[]>("/predictions/hotspots");
}
