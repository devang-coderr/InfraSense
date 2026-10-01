"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/useAuth";
import {
  getNotifications,
  markNotificationRead,
  acknowledgeNotification,
  resolveNotification,
  markAllNotificationsRead,
} from "@/lib/api/notifications";
import type { NotificationItem } from "@/lib/types";
import {
  Bell,
  CheckCheck,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  Sparkles,
  Inbox,
  ArrowLeft,
  CheckCircle2,
  MapPin,
  RefreshCw,
} from "lucide-react";

function formatTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - d.getTime()) / 1000);
    if (diffSec < 60) return "Just now";
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return dateStr;
  }
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread" | "critical" | "acknowledged" | "resolved">("all");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<number | null>(null);

  const isAuthority = Boolean(user?.role && user.role !== "citizen");

  const loadNotifications = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error("Failed to load notifications:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      const interval = setInterval(() => {
        loadNotifications(true);
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [user, loadNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, status: n.status === "unread" ? "read" : n.status }))
      );
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleMarkRead = async (id: number) => {
    setActionInProgress(id);
    try {
      const updated = await markNotificationRead(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
    } catch (err) {
      console.error("Failed to mark read:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleAcknowledge = async (id: number) => {
    setActionInProgress(id);
    try {
      const updated = await acknowledgeNotification(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
    } catch (err) {
      console.error("Failed to acknowledge alert:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const handleResolve = async (id: number) => {
    setActionInProgress(id);
    try {
      const updated = await resolveNotification(id);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, ...updated } : n)));
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    } finally {
      setActionInProgress(null);
    }
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "critical") return n.severity?.toLowerCase() === "critical" || n.type === "CRITICAL_ISSUE_REPORTED";
    if (filter === "acknowledged") return n.status === "acknowledged";
    if (filter === "resolved") return n.status === "resolved";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const criticalCount = notifications.filter(
    (n) => n.severity?.toLowerCase() === "critical" || n.type === "CRITICAL_ISSUE_REPORTED"
  ).length;
  const ackCount = notifications.filter((n) => n.status === "acknowledged").length;
  const resCount = notifications.filter((n) => n.status === "resolved").length;

  const innerContent = (
    <div>
      {/* Back Link for Citizen View */}
      {!isAuthority && (
        <div className="mb-4">
          <Link
            href="/citizen"
            className="focus-ring inline-flex items-center gap-1.5 text-[12.5px] font-mono text-[#8D918F] hover:text-[#F3F0E8] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to Citizen Dashboard</span>
          </Link>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <PageHeader
          eyebrow={isAuthority ? "Jurisdiction Alerts" : "Civic Notifications"}
          title={isAuthority ? "Alerts & Incident Feed" : "Notifications & Updates"}
          description={
            isAuthority
              ? "Real-time jurisdiction-scoped infrastructure alerts, critical incident dispatches, and life-cycle triage."
              : "Updates regarding your submitted infrastructure reports and resolution status."
          }
        />

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => loadNotifications()}
            disabled={loading || refreshing}
            className="focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-mono bg-[#1C1F21] border border-[#2C2A25] text-[#8D918F] hover:text-[#F3F0E8] transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh alerts"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin text-[#F4B52C]" : ""} />
            <span className="hidden sm:inline">Refresh</span>
          </button>

          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-mono bg-[#1C1F21] border border-[#2C2A25] text-[#8D918F] hover:text-[#F3F0E8] transition-colors cursor-pointer"
            >
              <CheckCheck size={14} className="text-[#F4B52C]" />
              <span>Mark all read</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#2C2A25] pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`focus-ring px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            filter === "all"
              ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
              : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
          }`}
        >
          <Bell size={13} />
          <span>All</span>
          <span className="text-[10px] font-mono bg-[#1C1F21] px-1.5 py-0.5 rounded text-[#8D918F]">
            {notifications.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setFilter("unread")}
          className={`focus-ring px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            filter === "unread"
              ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
              : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
          }`}
        >
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="text-[10px] font-mono bg-[#F4B52C]/20 text-[#F4B52C] px-1.5 py-0.5 rounded font-bold">
              {unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setFilter("critical")}
          className={`focus-ring px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
            filter === "critical"
              ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
              : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
          }`}
        >
          <AlertTriangle size={13} className="text-[var(--critical)]" />
          <span>Critical</span>
          {criticalCount > 0 && (
            <span className="text-[10px] font-mono bg-[var(--critical)]/20 text-[var(--critical)] px-1.5 py-0.5 rounded font-bold">
              {criticalCount}
            </span>
          )}
        </button>

        {isAuthority && (
          <>
            <button
              type="button"
              onClick={() => setFilter("acknowledged")}
              className={`focus-ring px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                filter === "acknowledged"
                  ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
                  : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
              }`}
            >
              <CheckCircle2 size={13} className="text-[#F4B52C]" />
              <span>Acknowledged</span>
              {ackCount > 0 && (
                <span className="text-[10px] font-mono bg-[#1C1F21] px-1.5 py-0.5 rounded text-[#8D918F]">
                  {ackCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setFilter("resolved")}
              className={`focus-ring px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                filter === "resolved"
                  ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
                  : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
              }`}
            >
              <CheckCheck size={13} className="text-[#4C7A5E]" />
              <span>Resolved</span>
              {resCount > 0 && (
                <span className="text-[10px] font-mono bg-[#1C1F21] px-1.5 py-0.5 rounded text-[#8D918F]">
                  {resCount}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 rounded-2xl border border-[#2C2A25] bg-[#151718] animate-pulse h-28" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[#2C2A25] bg-[#151718] shadow-lg">
          <Inbox size={36} className="mx-auto mb-3 text-[#8D918F]" />
          <h3 className="text-[16px] font-medium text-[#F3F0E8] mb-1">
            No notifications in this view
          </h3>
          <p className="text-[13px] text-[#8D918F] max-w-sm mx-auto">
            {filter === "unread"
              ? "You have marked all notifications in your jurisdiction as read."
              : "No incident alerts match the selected filter at this time."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => {
            const isCritical = item.severity?.toLowerCase() === "critical";
            const isHigh = item.severity?.toLowerCase() === "high";
            const isAcknowledged = item.status === "acknowledged";
            const isResolved = item.status === "resolved";

            const issueTargetUrl = item.issue_id
              ? isAuthority
                ? `/authority/issues/${item.issue_id}`
                : `/citizen/issue/${item.issue_id}`
              : undefined;

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  !item.is_read
                    ? isCritical
                      ? "bg-[#181212] border-[var(--critical)]/40 text-[#F3F0E8] shadow-lg"
                      : "bg-[#151718] border-[#F4B52C]/35 text-[#F3F0E8] shadow-md"
                    : isResolved
                    ? "bg-[#151718]/40 border-[#2C2A25]/60 text-[#8D918F]"
                    : "bg-[#151718]/70 border-[#2C2A25] text-[#8D918F]"
                }`}
              >
                <div className="flex items-start gap-3.5 min-w-0 flex-1">
                  <div
                    className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                      isCritical
                        ? "bg-[var(--critical)]/15 border-[var(--critical)]/30 text-[var(--critical)]"
                        : isHigh
                        ? "bg-[#F4B52C]/15 border-[#F4B52C]/30 text-[#F4B52C]"
                        : isResolved
                        ? "bg-[#4C7A5E]/15 border-[#4C7A5E]/30 text-[#4C7A5E]"
                        : "bg-[#1C1F21] border-[#2C2A25] text-[#8D918F]"
                    }`}
                  >
                    {isCritical ? (
                      <AlertTriangle size={18} />
                    ) : isHigh ? (
                      <Sparkles size={18} />
                    ) : isResolved ? (
                      <CheckCheck size={18} />
                    ) : (
                      <Bell size={18} />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {item.severity && (
                        <span
                          className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded tracking-wide ${
                            isCritical
                              ? "bg-[var(--critical)] text-white"
                              : isHigh
                              ? "bg-[#F4B52C] text-black"
                              : "bg-[#25282A] text-[#8D918F]"
                          }`}
                        >
                          {item.severity}
                        </span>
                      )}

                      <h4 className="text-[14.5px] font-semibold text-[#F3F0E8] truncate">
                        {item.title}
                      </h4>

                      {!item.is_read && (
                        <span className="h-2 w-2 rounded-full bg-[#F4B52C] shrink-0" title="Unread" />
                      )}

                      {isAcknowledged && (
                        <span className="text-[10.5px] font-mono bg-[#F4B52C]/15 text-[#F4B52C] border border-[#F4B52C]/30 px-2 py-0.5 rounded">
                          Acknowledged
                        </span>
                      )}

                      {isResolved && (
                        <span className="text-[10.5px] font-mono bg-[#4C7A5E]/20 text-[#4C7A5E] border border-[#4C7A5E]/30 px-2 py-0.5 rounded">
                          Resolved
                        </span>
                      )}
                    </div>

                    <p className="text-[13px] text-[#A6A29A] leading-relaxed mb-2">
                      {item.message}
                    </p>

                    {item.reason && (
                      <div className="text-[11.5px] font-mono text-[#8D918F] bg-[#1C1F21] border border-[#2C2A25] rounded-lg px-2.5 py-1 mb-2 inline-block">
                        <span className="text-[#6F6B63]">Reason:</span> {item.reason}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono text-[#6F6B63]">
                      <div className="flex items-center gap-1.5">
                        <Clock size={11} />
                        <span>{formatTimestamp(item.created_at)}</span>
                      </div>

                      {(item.district || item.state) && (
                        <div className="flex items-center gap-1 text-[#8D918F]">
                          <MapPin size={11} className="text-[#F4B52C]" />
                          <span>
                            {item.district ? `${item.district}, ${item.state || ""}` : item.state}
                          </span>
                        </div>
                      )}

                      {item.category && (
                        <span className="text-[#8D918F]">
                          • {item.category}
                        </span>
                      )}

                      {item.issue_id && (
                        <span className="text-[#6F6B63]">
                          • Issue #{item.issue_id}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                  {issueTargetUrl && (
                    <Link
                      href={issueTargetUrl}
                      onClick={() => {
                        if (!item.is_read) handleMarkRead(item.id);
                      }}
                      className="focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-[#1C1F21] border border-[#2C2A25] text-[#F3F0E8] hover:bg-[#25282A] transition-colors"
                    >
                      <span>View Issue</span>
                      <ExternalLink size={12} className="text-[#F4B52C]" />
                    </Link>
                  )}

                  {isAuthority && !isAcknowledged && !isResolved && (
                    <button
                      type="button"
                      onClick={() => handleAcknowledge(item.id)}
                      disabled={actionInProgress === item.id}
                      className="focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-[#F4B52C]/10 border border-[#F4B52C]/30 text-[#F4B52C] hover:bg-[#F4B52C]/20 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 size={13} />
                      <span>Acknowledge</span>
                    </button>
                  )}

                  {!item.is_read && (
                    <button
                      type="button"
                      onClick={() => handleMarkRead(item.id)}
                      disabled={actionInProgress === item.id}
                      className="focus-ring p-1.5 rounded-lg text-[#8D918F] hover:text-[#F3F0E8] hover:bg-[#1C1F21] transition-colors cursor-pointer"
                      title="Mark as read"
                    >
                      <CheckCheck size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  if (isAuthority) {
    return <AuthorityShell>{innerContent}</AuthorityShell>;
  }

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 pt-28 pb-20 text-[var(--text)]">
      {innerContent}
    </main>
  );
}
