"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  Camera,
  Search,
  RefreshCw,
  Clock,
  MapPin,
  ChevronRight,
  ArrowLeft,
  AlertCircle,
  FileText,
  CheckCircle2,
  SlidersHorizontal,
  Layers,
} from "lucide-react";
import { getIssues } from "@/lib/api/issues";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { SeverityBadge, StatusPill } from "@/components/ui/Primitives";
import type { Issue, IssueStatus } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";
import { CitizenUserMenu } from "@/components/citizen/CitizenUserMenu";

const tabs = [
  { key: "all", label: "All Reports" },
  { key: "active", label: "In Progress" },
  { key: "resolved", label: "Resolved" },
] as const;

const statusTone: Record<IssueStatus, "neutral" | "accent" | "high" | "low"> = {
  reported: "neutral",
  ai_verified: "accent",
  assigned: "high",
  in_progress: "high",
  resolved: "low",
};

const statusOrder: IssueStatus[] = [
  "reported",
  "ai_verified",
  "assigned",
  "in_progress",
  "resolved",
];

export default function MyReportsPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIssues({ mine: true });
      setIssues(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to retrieve your infrastructure reports. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Tab counts
  const activeCount = useMemo(
    () => issues.filter((i) => i.status !== "resolved").length,
    [issues]
  );
  const resolvedCount = useMemo(
    () => issues.filter((i) => i.status === "resolved").length,
    [issues]
  );

  // Client-side filtering
  const filtered = useMemo(() => {
    return issues.filter((i) => {
      // Tab filter
      if (tab === "active" && i.status === "resolved") return false;
      if (tab === "resolved" && i.status !== "resolved") return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = i.title?.toLowerCase().includes(q);
        const matchesWard = i.ward?.toLowerCase().includes(q);
        const matchesCategory = i.category?.toLowerCase().includes(q);
        const matchesId = i.id?.toLowerCase().includes(q);
        const matchesDesc = i.description?.toLowerCase().includes(q);
        return matchesTitle || matchesWard || matchesCategory || matchesId || matchesDesc;
      }
      return true;
    });
  }, [issues, tab, searchQuery]);

  return (
    <div className="min-h-screen bg-[#0D0F10] text-[#F3F0E8] pt-24 sm:pt-28 pb-24">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/citizen"
            className="focus-ring inline-flex items-center gap-1.5 text-[12.5px] font-mono text-[#8D918F] hover:text-[#F4B52C] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Citizen Dashboard</span>
          </Link>

          <CitizenUserMenu
            user={user}
            loading={authLoading}
            onLogout={() => logout("citizen")}
          />
        </div>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-[#2C2A25]">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F4B52C]/10 border border-[#F4B52C]/30 text-[#F4B52C] font-mono text-[10.5px] uppercase tracking-wider font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C]" />
                Citizen Tracking Queue
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F0E8]">
              My Infrastructure Reports
            </h1>
            <p className="text-[14px] text-[#8D918F] mt-1">
              Track live progress, AI classification, and municipal repair dispatch for all your submissions.
            </p>
          </div>

          <div className="shrink-0">
            <Button href="/citizen/report" variant="primary" size="md" className="gap-2">
              <Camera size={16} />
              <span>Report New Issue</span>
            </Button>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-6">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#151718] border border-[#2C2A25]">
            {tabs.map((t) => {
              const count =
                t.key === "all"
                  ? issues.length
                  : t.key === "active"
                  ? activeCount
                  : resolvedCount;

              const isSelected = tab === t.key;

              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`focus-ring text-[12px] font-mono uppercase tracking-wider rounded-lg px-3 py-1.5 transition-all flex items-center gap-1.5 cursor-pointer ${
                    isSelected
                      ? "bg-[#1C1F21] text-[#F4B52C] border border-[#F4B52C]/30 shadow-sm font-semibold"
                      : "text-[#8D918F] hover:text-[#F3F0E8] border border-transparent"
                  }`}
                >
                  <span>{t.label}</span>
                  {!loading && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        isSelected
                          ? "bg-[#F4B52C]/20 text-[#F4B52C]"
                          : "bg-[#1C1F21] text-[#8D918F]"
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Search Input */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D918F]"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, ward, ID..."
              className="focus-ring w-full rounded-xl bg-[#151718] border border-[#2C2A25] pl-9 pr-3 py-1.5 text-[13px] text-[#F3F0E8] placeholder-[#8D918F]/70"
            />
          </div>
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="space-y-3.5">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="rounded-xl border border-[#2C2A25] bg-[#151718] p-5 animate-pulse"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="h-4 w-16 bg-[#2C2A25] rounded" />
                  <div className="h-5 w-24 bg-[#2C2A25] rounded-full" />
                </div>
                <div className="h-5 w-64 bg-[#2C2A25] rounded mb-2" />
                <div className="h-3 w-40 bg-[#2C2A25] rounded mb-4" />
                <div className="h-1.5 w-full bg-[#2C2A25] rounded" />
              </div>
            ))}
          </div>
        )}

        {/* API Error State */}
        {!loading && error && (
          <div className="rounded-2xl border border-[#B23A2C]/30 bg-[#151718] p-8 sm:p-10 text-center">
            <div className="h-12 w-12 rounded-2xl bg-[#B23A2C]/10 text-[#B23A2C] mx-auto flex items-center justify-center mb-3">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-lg font-semibold text-[#F3F0E8] mb-1">
              Unable to Load Reports
            </h3>
            <p className="text-[13.5px] text-[#8D918F] max-w-md mx-auto mb-6" role="alert">
              {error}
            </p>
            <Button
              onClick={fetchReports}
              variant="secondary"
              size="sm"
              className="gap-2"
            >
              <RefreshCw size={14} />
              <span>Try Again</span>
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && filtered.length === 0 && (
          <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-8 sm:p-12 text-center">
            {issues.length === 0 ? (
              <>
                <div className="h-14 w-14 rounded-2xl bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] mx-auto flex items-center justify-center mb-4">
                  <FileText size={28} />
                </div>
                <h3 className="text-[18px] font-semibold text-[#F3F0E8] mb-2">
                  No Reports Submitted Yet
                </h3>
                <p className="text-[13.5px] text-[#8D918F] max-w-md mx-auto mb-6 leading-relaxed">
                  You haven&apos;t filed any infrastructure reports. Use the citizen portal to report road damage, broken streetlights, or drainage hazards in your area.
                </p>
                <Button href="/citizen/report" variant="primary" size="md" className="gap-2">
                  <Camera size={16} />
                  <span>Report an Issue</span>
                </Button>
              </>
            ) : (
              <>
                <div className="h-12 w-12 rounded-xl bg-[#1C1F21] text-[#8D918F] mx-auto flex items-center justify-center mb-3">
                  <Search size={22} />
                </div>
                <h3 className="text-[16px] font-semibold text-[#F3F0E8] mb-1">
                  No Matching Reports
                </h3>
                <p className="text-[13px] text-[#8D918F] mb-4">
                  No reports matched your current tab filter or search query.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTab("all");
                    setSearchQuery("");
                  }}
                  className="text-[12.5px] font-mono text-[#F4B52C] hover:underline"
                >
                  Clear Filters
                </button>
              </>
            )}
          </div>
        )}

        {/* Report Cards List */}
        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3.5">
            {filtered.map((issue) => {
              const currentIdx = statusOrder.indexOf(issue.status);

              return (
                <Link
                  key={issue.id}
                  href={`/citizen/issue/${issue.id}`}
                  className="focus-ring block rounded-xl border border-[#2C2A25] bg-[#151718] p-5 hover:border-[#F4B52C]/50 hover:bg-[#1C1F21] transition-all group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[11px] text-[#8D918F] bg-[#121415] px-2 py-0.5 rounded border border-[#2C2A25]">
                        #{issue.id}
                      </span>
                      <StatusPill tone={statusTone[issue.status] || "neutral"} size="sm">
                        {issue.status.replace("_", " ")}
                      </StatusPill>
                      {issue.severity && (
                        <SeverityBadge severity={issue.severity} />
                      )}
                      {typeof issue.duplicateCount === "number" && issue.duplicateCount > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] text-[#8D918F] bg-[#1C1F21] px-2 py-0.5 rounded border border-[#2C2A25]">
                          <Layers size={11} />
                          <span>+{issue.duplicateCount} merged</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[11.5px] font-mono text-[#8D918F]">
                      <Clock size={12} />
                      <span>{issue.reportedAt}</span>
                    </div>
                  </div>

                  <div className="mb-3.5">
                    <h3 className="text-[15px] font-semibold text-[#F3F0E8] group-hover:text-[#F4B52C] transition-colors mb-1">
                      {issue.title}
                    </h3>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-[#8D918F]">
                      {issue.ward && (
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-[#F4B52C]" />
                          <span>{issue.ward}</span>
                        </span>
                      )}
                      {issue.category && <span>• {issue.category}</span>}
                      {issue.department && (
                        <span className="text-[11.5px] font-mono text-[#8D918F]">
                          Dept: {issue.department}
                        </span>
                      )}
                    </div>
                  </div>

                  {issue.description && (
                    <p className="text-[13px] text-[#8D918F] line-clamp-2 mb-3.5 leading-relaxed">
                      {issue.description}
                    </p>
                  )}

                  {/* 5-Step Progress Track */}
                  <div className="pt-3 border-t border-[#2C2A25] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-1 flex-1 max-w-sm">
                      {statusOrder.map((step, idx) => {
                        const isDone = idx <= currentIdx;
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div
                              className={`h-1.5 w-full rounded-full transition-all ${
                                isDone
                                  ? issue.status === "resolved"
                                    ? "bg-[#4C7A5E]"
                                    : "bg-[#F4B52C]"
                                  : "bg-[#2C2A25]"
                              }`}
                              title={step.replace("_", " ")}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="inline-flex items-center gap-1 text-[12px] font-mono text-[#F4B52C] group-hover:translate-x-0.5 transition-transform">
                      <span>Details</span>
                      <ChevronRight size={14} />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
