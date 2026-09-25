import { apiFetch } from "./client";

export interface AIAnalyzeResult {
  category: string;
  confidence: number;
  severity: string;
  severity_score: number;
  is_baseline: boolean;
  note: string;
}

/**
 * Replaces the ReportForm's `setTimeout(...)` fake AI step. Returns a
 * baseline/placeholder result — see backend/app/ai/vision.py. The
 * `note` field is present specifically so the UI can show something
 * like "Demo AI result" if you want to be upfront with users (spec
 * section 52 requires this to never be presented as a trained model).
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
}

export async function uploadMedia(file: File): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<UploadResult>("/media/upload", {
    method: "POST",
    body: formData,
  });
}
