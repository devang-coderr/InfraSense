import { apiFetch } from "./client";

export interface WorkOrder {
  id: number;
  issue_id: number;
  issue_title?: string | null;
  issue_category?: string | null;
  issue_severity?: string | null;
  issue_priority?: number | null;
  issue_state?: string | null;
  issue_district?: string | null;
  department_id: number;
  department_name: string;
  assigned_to: number | null;
  assigned_to_name?: string | null;
  title?: string | null;
  description?: string | null;
  completion_notes?: string | null;
  priority: number;
  deadline: string | null;
  status: "pending" | "assigned" | "in_progress" | "completed" | "verified" | "verification" | "resolved" | string;
  started_at: string | null;
  completed_at: string | null;
  verified_at?: string | null;
  verified_by?: number | null;
  created_at: string;
  updated_at?: string | null;
}

export async function createWorkOrder(payload: {
  issue_id: number;
  department_id?: number;
  assigned_to?: number;
  title?: string;
  description?: string;
  deadline?: string;
}): Promise<WorkOrder> {
  return apiFetch<WorkOrder>("/work-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getWorkOrders(params?: { issue_id?: number; status?: string }): Promise<WorkOrder[]> {
  const queryParts: string[] = [];
  if (params?.issue_id) queryParts.push(`issue_id=${encodeURIComponent(params.issue_id)}`);
  if (params?.status) queryParts.push(`status=${encodeURIComponent(params.status)}`);
  const qs = queryParts.length > 0 ? `?${queryParts.join("&")}` : "";
  return apiFetch<WorkOrder[]>(`/work-orders${qs}`);
}

export async function getWorkOrder(id: number): Promise<WorkOrder> {
  return apiFetch<WorkOrder>(`/work-orders/${id}`);
}

export async function updateWorkOrder(
  id: number,
  payload: {
    status?: string;
    assigned_to?: number;
    title?: string;
    description?: string;
    completion_notes?: string;
    deadline?: string;
  }
): Promise<WorkOrder> {
  return apiFetch<WorkOrder>(`/work-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
