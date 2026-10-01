import { apiFetch } from "./client";
import type { NotificationItem } from "@/lib/types";

export interface UnreadCountResponse {
  unread_count: number;
}

export async function getNotifications(filter?: string): Promise<NotificationItem[]> {
  const query = filter && filter !== "all" ? `?filter=${encodeURIComponent(filter)}` : "";
  return apiFetch<NotificationItem[]>(`/notifications${query}`);
}

export async function getUnreadCount(): Promise<number> {
  const res = await apiFetch<UnreadCountResponse>("/notifications/unread-count");
  return res.unread_count;
}

export async function markNotificationRead(id: number): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/notifications/${id}/read`, {
    method: "PATCH",
  });
}

export async function acknowledgeNotification(id: number): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/notifications/${id}/acknowledge`, {
    method: "PATCH",
  });
}

export async function resolveNotification(id: number): Promise<NotificationItem> {
  return apiFetch<NotificationItem>(`/notifications/${id}/resolve`, {
    method: "PATCH",
  });
}

export async function markAllNotificationsRead(): Promise<{ updated_count: number }> {
  return apiFetch<{ updated_count: number }>("/notifications/mark-all-read", {
    method: "POST",
  });
}
