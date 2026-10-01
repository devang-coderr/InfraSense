import { apiFetch } from "./client";
import type { EvidenceVerification } from "@/lib/types";

export interface AIAnalyzeResult {
  category: string;
  confidence: number;
  severity: string;
  severity_score: number;
  is_baseline: boolean;
  note: string;
}

/**
 * Runs computer vision classification against the FastAPI backend.
 */
export async function analyzeImage(
  file: File,
  description: string
): Promise<AIAnalyzeResult> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("description", description);
  return apiFetch<AIAnalyzeResult>("/ai/analyze-image", {
    method: "POST",
    body: formData,
  });
}

export interface UploadResult {
  media_id: number;
  file_url: string;
  camera_make?: string | null;
  camera_model?: string | null;
  evidence_verification?: EvidenceVerification;
}

export interface UploadMediaOptions {
  device_latitude?: number | null;
  device_longitude?: number | null;
  device_captured_at?: string | null;
}

export async function uploadMedia(
  file: File,
  options?: UploadMediaOptions
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.device_latitude !== undefined && options?.device_latitude !== null) {
    formData.append("device_latitude", String(options.device_latitude));
  }
  if (options?.device_longitude !== undefined && options?.device_longitude !== null) {
    formData.append("device_longitude", String(options.device_longitude));
  }
  if (options?.device_captured_at) {
    formData.append("device_captured_at", options.device_captured_at);
  }
  return apiFetch<UploadResult>("/media/upload", {
    method: "POST",
    body: formData,
  });
}

