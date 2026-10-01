export type Severity = "critical" | "high" | "medium" | "low";

export const INFRASTRUCTURE_CATEGORIES = [
  "Pothole",
  "Road Crack",
  "Streetlight",
  "Traffic Signal",
  "Garbage",
  "Water Leakage",
  "Drainage",
  "Open Manhole",
] as const;

export type InfrastructureCategory = (typeof INFRASTRUCTURE_CATEGORIES)[number];

export type IssueStatus =
  | "reported"
  | "ai_verified"
  | "assigned"
  | "in_progress"
  | "resolved";

export type Department =
  | "Roads"
  | "Electrical"
  | "Sanitation"
  | "Water"
  | "Traffic";

export interface SeverityFactor {
  label: string;
  score: number;
  max: number;
}

export interface PriorityFactor {
  label: string;
  score: number;
  max: number;
}

export interface GPSVerification {
  device_available: boolean;
  exif_available: boolean;
  distance_meters?: number | null;
  status: "match" | "mismatch" | "unavailable" | string;
}

export interface TimeVerification {
  device_available: boolean;
  exif_available: boolean;
  difference_seconds?: number | null;
  status: "match" | "mismatch" | "unavailable" | string;
}

export interface EvidenceVerification {
  gps: GPSVerification;
  capture_time: TimeVerification;
}

export interface IssueMediaItem {
  id: number;
  file_url: string;
  media_type?: string;
  device_latitude?: number | null;
  device_longitude?: number | null;
  device_captured_at?: string | null;
  exif_latitude?: number | null;
  exif_longitude?: number | null;
  exif_captured_at?: string | null;
  camera_make?: string | null;
  camera_model?: string | null;
  evidence_verification?: EvidenceVerification | null;
}

export interface DuplicateSignalMatch {
  issue_id: string;
  category_match: boolean;
  category: string;
  distance_meters?: number | null;
  location_nearby: boolean;
  time_difference_seconds?: number | null;
  time_recent: boolean;
  image_similarity?: number | null;
  image_strong_match: boolean;
  similarity_score: number;
  reasons: string[];
}

export interface DuplicateAssessment {
  status: "possible_duplicate" | "no_clear_match" | "insufficient_evidence" | string;
  matched_issue_id?: string | null;
  matches: DuplicateSignalMatch[];
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "officer" | "department_admin" | "super_admin";
  department?: string | null;
  organization?: string | null;
  state?: string | null;
  district?: string | null;
}

export interface CitizenWorkOrderSummary {
  id: number;
  department_name?: string | null;
  status: string;
  title?: string | null;
  created_at?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  verified_at?: string | null;
  completion_notes?: string | null;
}

export interface Issue {
  id: string;
  title: string;
  category: string;
  description: string;
  ward: string;
  state?: string | null;
  district?: string | null;
  lat: number;
  lng: number;
  x: number; // 0-100 map position for stylised GIS view
  y: number;
  severity: Severity;
  severityScore: number;
  severityFactors: SeverityFactor[];
  priorityScore: number;
  priorityFactors: PriorityFactor[];
  confidence: number;
  status: IssueStatus;
  department: Department;
  duplicateCount: number;
  reportedAt: string;
  imageDescription: string;
  media_id?: number;
  media_url?: string;
  image_url?: string;
  file_url?: string;
  imageUrl?: string;
  mediaUrl?: string;
  media_ids?: number[];
  media_urls?: string[];
  evidence_images?: IssueMediaItem[];
  duplicate_assessment?: DuplicateAssessment | null;
  work_order?: CitizenWorkOrderSummary | null;
  work_orders?: CitizenWorkOrderSummary[];
}

export interface WardRisk {
  ward: string;
  category: string;
  risk: number;
  window: string;
  reasons: string[];
  recommendedActions: string[];
}

export interface HealthCategory {
  label: string;
  score: number;
}

export const severityColor: Record<Severity, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
};

export const severityLabel: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

export interface NotificationItem {
  id: number;
  user_id?: number;
  issue_id?: number | null;
  type: string;
  severity?: Severity | "info" | string | null;
  title: string;
  message: string;
  reason?: string | null;
  status: "unread" | "read" | "acknowledged" | "resolved" | string;
  is_read: boolean;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  category?: string | null;
  state?: string | null;
  district?: string | null;
}

