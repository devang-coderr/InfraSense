import { apiFetch } from "./client";

export interface WorkOrder {
  id: number;
  issue_id: number;
  department_id: number;
  department_name: string;
  assigned_to: number | null;
  priority: number;
  deadline: string | null;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export async function createWorkOrder(payload: {
  issue_id: number;
  department_id?: number;
  department_name?: string;
  assigned_to?: number;
  deadline?: string;
}): Promise<WorkOrder> {
  return apiFetch<WorkOrder>("/work-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getWorkOrders(): Promise<WorkOrder[]> {
  return apiFetch<WorkOrder[]>("/work-orders");
}

export async function updateWorkOrder(
  id: number,
  payload: { status?: string; assigned_to?: number; deadline?: string }
): Promise<WorkOrder> {
  return apiFetch<WorkOrder>(`/work-orders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}
