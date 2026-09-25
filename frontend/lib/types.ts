export type Severity = "critical" | "high" | "medium" | "low";

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

export interface Issue {
  id: string;
  title: string;
  category: string;
  description: string;
  ward: string;
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
