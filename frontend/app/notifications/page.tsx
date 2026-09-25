"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuth } from "@/lib/useAuth";
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
} from "lucide-react";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  category: "alert" | "status" | "ai" | "system";
  read: boolean;
  actionUrl?: string;
  actionLabel?: string;
}

export default function NotificationsPage() {
  const { user, loading } = useAuth();
  const [filter, setFilter] = useState<"all" | "unread" | "critical">("all");
  const isAuthority = Boolean(user?.role && user.role !== "citizen");

  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: "n-1",
      title: "AI Verification Complete",
      message: "Infrastructure report has been analyzed and classified with severity score 88/100.",
      timestamp: "10m ago",
      category: "ai",
      read: false,
      actionUrl: isAuthority ? "/authority/priority" : "/citizen/reports",
      actionLabel: "View Report",
    },
    {
      id: "n-2",
      title: "System Status: Online",
      message: "All civic intelligence telemetry streams and dispatch pipelines are operational.",
      timestamp: "1h ago",
      category: "system",
      read: true,
    },
  ]);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "critical") return n.category === "alert" || n.category === "ai";
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const innerContent = (
    <div>
      {/* Back Link for Citizen / Mobile View */}
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
          eyebrow="Civic Alerts"
          title="Notifications & Updates"
          description="Real-time notifications regarding report dispatches, AI verification assessments, and civic updates."
        />

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={markAllAsRead}
            className="focus-ring self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-mono bg-[#1C1F21] border border-[#2C2A25] text-[#8D918F] hover:text-[#F3F0E8] transition-colors cursor-pointer"
          >
            <CheckCheck size={14} className="text-[#F4B52C]" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#2C2A25] pb-3">
        <button
          type="button"
          onClick={() => setFilter("all")}
          className={`focus-ring px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
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
          className={`focus-ring px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
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
          className={`focus-ring px-3 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            filter === "critical"
              ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
              : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
          }`}
        >
          <AlertTriangle size={13} className="text-[#F4B52C]" />
          <span>Critical & AI Updates</span>
        </button>
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[#2C2A25] bg-[#151718] shadow-lg">
          <Inbox size={36} className="mx-auto mb-3 text-[#8D918F]" />
          <h3 className="text-[16px] font-medium text-[#F3F0E8] mb-1">
            You are all caught up
          </h3>
          <p className="text-[13px] text-[#8D918F] max-w-sm mx-auto">
            No new alerts or status changes at this time. Submitted civic reports will trigger updates here.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                item.read
                  ? "bg-[#151718]/60 border-[#2C2A25] text-[#8D918F]"
                  : "bg-[#151718] border-[#F4B52C]/30 text-[#F3F0E8] shadow-md"
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-[#1C1F21] border border-[#2C2A25] shrink-0 mt-0.5">
                  {item.category === "ai" ? (
                    <Sparkles size={16} className="text-[#F4B52C]" />
                  ) : item.category === "alert" ? (
                    <AlertTriangle size={16} className="text-[var(--critical)]" />
                  ) : item.category === "status" ? (
                    <ShieldAlert size={16} className="text-[#4C7A5E]" />
                  ) : (
                    <Bell size={16} className="text-[#8D918F]" />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-[14px] font-medium text-[#F3F0E8] truncate">
                      {item.title}
                    </h4>
                    {!item.read && (
                      <span className="h-2 w-2 rounded-full bg-[#F4B52C] shrink-0" />
                    )}
                  </div>
                  <p className="text-[13px] text-[#8D918F] leading-relaxed">
                    {item.message}
                  </p>
                  <div className="flex items-center gap-2 mt-2 text-[11px] font-mono text-[#6F6B63]">
                    <Clock size={11} />
                    <span>{item.timestamp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                {item.actionUrl && (
                  <Link
                    href={item.actionUrl}
                    onClick={() => markAsRead(item.id)}
                    className="focus-ring flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-medium bg-[#1C1F21] border border-[#2C2A25] text-[#F3F0E8] hover:bg-[#25282A] transition-colors"
                  >
                    <span>{item.actionLabel || "View"}</span>
                    <ExternalLink size={12} className="text-[#F4B52C]" />
                  </Link>
                )}
                {!item.read && (
                  <button
                    type="button"
                    onClick={() => markAsRead(item.id)}
                    className="focus-ring p-1.5 rounded-lg text-[#8D918F] hover:text-[#F3F0E8] hover:bg-[#1C1F21] transition-colors cursor-pointer"
                    title="Mark as read"
                  >
                    <CheckCheck size={14} />
                  </button>
                )}
              </div>
            </div>
          ))}
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
