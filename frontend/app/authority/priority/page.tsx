"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  ListOrdered,
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Layers,
  MapPin,
  Building2,
  Clock,
  SlidersHorizontal,
} from "lucide-react";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { SeverityBadge, StatusPill } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { getPriorityQueue } from "@/lib/api/authority";
import { ApiError } from "@/lib/api/client";
import { type Issue, type IssueStatus, INFRASTRUCTURE_CATEGORIES } from "@/lib/types";

const statusTone: Record<IssueStatus, "neutral" | "accent" | "high" | "low"> = {
  reported: "neutral",
  ai_verified: "accent",
  assigned: "high",
  in_progress: "high",
  resolved: "low",
};

const CATEGORIES = INFRASTRUCTURE_CATEGORIES;

export default function PriorityQueuePage() {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [wardFilter, setWardFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchPriorityQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getPriorityQueue();
      setIssues(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load priority queue. Please check network connection."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPriorityQueue();
  }, [fetchPriorityQueue]);

  // Unique wards for filter
  const wards = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i) => {
      if (i.ward && i.ward.trim() && i.ward !== "Unassigned") set.add(i.ward.trim());
    });
    return Array.from(set).sort();
  }, [issues]);

  // Metrics summary
  const metrics = useMemo(() => {
    const total = issues.length;
    const critical = issues.filter((i) => i.severity === "critical").length;
    const high = issues.filter((i) => i.severity === "high").length;
    const avgScore =
      total > 0
        ? Math.round(issues.reduce((acc, i) => acc + (i.priorityScore || 0), 0) / total)
        : 0;
    return { total, critical, high, avgScore };
  }, [issues]);

  // Combined client-side filtering
  const filtered = useMemo(() => {
    return issues.filter((i) => {
      if (categoryFilter !== "all" && i.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (deptFilter !== "all" && i.department !== deptFilter) return false;
      if (wardFilter !== "all" && i.ward !== wardFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = i.title?.toLowerCase().includes(q);
        const matchesWard = i.ward?.toLowerCase().includes(q);
        const matchesDept = i.department?.toLowerCase().includes(q);
        const matchesCategory = i.category?.toLowerCase().includes(q);
        const matchesId = i.id?.toLowerCase().includes(q);
        return matchesTitle || matchesWard || matchesDept || matchesCategory || matchesId;
      }
      return true;
    });
  }, [issues, categoryFilter, severityFilter, deptFilter, wardFilter, statusFilter, searchQuery]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => (b.priorityScore ?? 0) - (a.priorityScore ?? 0));
  }, [filtered]);

  const hasActiveFilters =
    categoryFilter !== "all" ||
    severityFilter !== "all" ||
    deptFilter !== "all" ||
    wardFilter !== "all" ||
    statusFilter !== "all" ||
    searchQuery.trim() !== "";

  return (
    <AuthorityShell>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-6 border-b border-[#2C2A25]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F4B52C]/10 border border-[#F4B52C]/30 text-[#F4B52C] font-mono text-[10.5px] uppercase tracking-wider font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] animate-pulse" />
              Triage & Dispatch Index
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F0E8]">
            Infrastructure Priority Queue
          </h1>
          <p className="text-[14px] text-[#8D918F] mt-1">
            Calculated priority scores (0–100) combining structural defect severity, duplicate citizen volume, and municipal urgency index.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button onClick={fetchPriorityQueue} variant="secondary" size="md" className="gap-2">
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            <span>Refresh Queue</span>
          </Button>
        </div>
      </div>

      {/* Priority Metrics Summary Bar */}
      {!loading && !error && issues.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-6">
          <div className="p-4 rounded-xl bg-[#151718] border border-[#2C2A25]">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1">
              Active Queue
            </div>
            <div className="text-2xl font-bold font-mono text-[#F3F0E8]">{metrics.total}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#151718] border border-[#2C2A25]">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#B23A2C] mb-1">
              Critical Severity
            </div>
            <div className="text-2xl font-bold font-mono text-[#B23A2C]">{metrics.critical}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#151718] border border-[#2C2A25]">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#F4B52C] mb-1">
              High Severity
            </div>
            <div className="text-2xl font-bold font-mono text-[#F4B52C]">{metrics.high}</div>
          </div>
          <div className="p-4 rounded-xl bg-[#151718] border border-[#2C2A25]">
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1">
              Average Priority
            </div>
            <div className="text-2xl font-bold font-mono text-[#F4B52C]">P-{metrics.avgScore}</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 mb-6">
        {/* Search Field */}
        <div className="relative flex-1 lg:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#8D918F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search title, ward, dept, ID..."
            className="focus-ring w-full rounded-xl bg-[#151718] border border-[#2C2A25] pl-9 pr-3 py-2 text-[13px] text-[#F3F0E8] placeholder-[#8D918F]/70"
          />
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by category"
            className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-xl px-3 py-2 text-[12px] font-mono text-[#F3F0E8] cursor-pointer"
          >
            <option value="all">Category: All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Severity Filter */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            aria-label="Filter by severity"
            className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-xl px-3 py-2 text-[12px] font-mono text-[#F3F0E8] uppercase tracking-wider cursor-pointer"
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            aria-label="Filter by department"
            className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-xl px-3 py-2 text-[12px] font-mono text-[#F3F0E8] uppercase tracking-wider cursor-pointer"
          >
            <option value="all">Dept: All</option>
            <option value="Roads">Roads</option>
            <option value="Electrical">Electrical</option>
            <option value="Sanitation">Sanitation</option>
            <option value="Water">Water</option>
            <option value="Traffic">Traffic</option>
          </select>

          {/* Ward Filter */}
          {wards.length > 0 && (
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              aria-label="Filter by municipal ward"
              className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-xl px-3 py-2 text-[12px] font-mono text-[#F3F0E8] cursor-pointer"
            >
              <option value="all">Ward: All</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          )}

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-xl px-3 py-2 text-[12px] font-mono text-[#F3F0E8] uppercase tracking-wider cursor-pointer"
          >
            <option value="all">Status: All</option>
            <option value="reported">Reported</option>
            <option value="ai_verified">AI Verified</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="resolved">Resolved</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setCategoryFilter("all");
                setSeverityFilter("all");
                setDeptFilter("all");
                setWardFilter("all");
                setStatusFilter("all");
              }}
              className="text-[12px] font-mono text-[#F4B52C] hover:underline px-2 py-1 cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] overflow-hidden">
          <div className="hidden md:grid grid-cols-[80px_2.4fr_1.1fr_1.1fr_1.1fr_1.1fr_110px] gap-4 px-6 py-3.5 border-b border-[#2C2A25] text-[11px] font-mono uppercase tracking-wider text-[#8D918F]">
            <div>Score</div>
            <div>Defect & Location</div>
            <div>Severity</div>
            <div>Department</div>
            <div>Duplicates</div>
            <div>Status</div>
            <div>Action</div>
          </div>
          <div className="p-6 space-y-3.5 animate-pulse">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-14 bg-[#1C1F21] rounded-xl" />
            ))}
          </div>
        </div>
      )}

      {/* Error State */}
      {!loading && error && (
        <div className="rounded-2xl border border-[#B23A2C]/30 bg-[#151718] p-8 sm:p-10 text-center my-6">
          <div className="h-12 w-12 rounded-2xl bg-[#B23A2C]/10 text-[#B23A2C] mx-auto flex items-center justify-center mb-3">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-semibold text-[#F3F0E8] mb-1">
            Unable to Load Priority Queue
          </h3>
          <p className="text-[13.5px] text-[#8D918F] max-w-md mx-auto mb-6" role="alert">
            {error}
          </p>
          <Button onClick={fetchPriorityQueue} variant="secondary" size="sm" className="gap-2">
            <RefreshCw size={14} />
            <span>Try Again</span>
          </Button>
        </div>
      )}

      {/* Empty Queue */}
      {!loading && !error && issues.length === 0 && (
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-12 text-center my-6">
          <ListOrdered size={36} className="text-[#8D918F] mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-semibold text-[#F3F0E8] mb-1">Queue Clear</h3>
          <p className="text-[13.5px] text-[#8D918F] max-w-md mx-auto">
            No infrastructure issues are currently logged in the priority queue.
          </p>
        </div>
      )}

      {/* Empty Filter Match */}
      {!loading && !error && issues.length > 0 && sorted.length === 0 && (
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-10 text-center my-6">
          <Search size={30} className="text-[#8D918F] mx-auto mb-2 opacity-60" />
          <h3 className="text-base font-semibold text-[#F3F0E8] mb-1">No Matching Issues</h3>
          <p className="text-[13px] text-[#8D918F] mb-4">
            No priority issues match your active filter criteria or search query.
          </p>
          <Button
            onClick={() => {
              setSearchQuery("");
              setCategoryFilter("all");
              setSeverityFilter("all");
              setDeptFilter("all");
              setWardFilter("all");
              setStatusFilter("all");
            }}
            variant="secondary"
            size="sm"
          >
            Clear Active Filters
          </Button>
        </div>
      )}

      {/* Queue Table */}
      {!loading && !error && sorted.length > 0 && (
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] overflow-hidden shadow-xl">
          {/* Table Header (Desktop) */}
          <div className="hidden md:grid grid-cols-[85px_2.3fr_1.1fr_1.1fr_1.1fr_1.1fr_110px] gap-4 px-6 py-3.5 border-b border-[#2C2A25] bg-[#121415] text-[11px] font-mono uppercase tracking-wider text-[#8D918F]">
            <div>Priority</div>
            <div>Defect & Location</div>
            <div>Severity</div>
            <div>Department</div>
            <div>Duplicates</div>
            <div>Status</div>
            <div>Action</div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-[#2C2A25]">
            {sorted.map((issue) => {
              const priorityColor =
                issue.priorityScore >= 80
                  ? "#B23A2C"
                  : issue.priorityScore >= 50
                  ? "#F4B52C"
                  : "#4C7A5E";

              return (
                <div
                  key={issue.id}
                  className="grid grid-cols-1 md:grid-cols-[85px_2.3fr_1.1fr_1.1fr_1.1fr_1.1fr_110px] gap-3 md:gap-4 px-5 sm:px-6 py-4 items-center hover:bg-[#1C1F21] transition-colors group"
                >
                  {/* Priority Score Badge */}
                  <div className="flex items-center gap-2 md:block">
                    <span
                      className="font-mono text-[13px] font-bold px-2.5 py-1 rounded-md border inline-block"
                      style={{
                        color: priorityColor,
                        borderColor: `${priorityColor}40`,
                        backgroundColor: `${priorityColor}15`,
                      }}
                    >
                      P-{issue.priorityScore}
                    </span>
                    <span className="md:hidden font-mono text-[11px] text-[#8D918F]">
                      #{issue.id}
                    </span>
                  </div>

                  {/* Defect Title, Category & Ward */}
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-[11px] text-[#F4B52C] font-semibold">
                        #{issue.id}
                      </span>
                      <h4 className="text-[14px] font-semibold text-[#F3F0E8] group-hover:text-[#F4B52C] transition-colors leading-snug">
                        {issue.category || issue.title}
                      </h4>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[12px] text-[#8D918F] font-mono">
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-[#F4B52C]" />
                        <span>{issue.ward || "Unassigned Zone"}</span>
                      </span>
                      {issue.title && issue.title !== issue.category && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px] text-[#8D918F]/90">
                            {issue.title}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Severity Badge */}
                  <div>
                    {issue.severity && <SeverityBadge severity={issue.severity} />}
                  </div>

                  {/* Department */}
                  <div className="text-[12.5px] text-[#8D918F]">
                    {issue.department ? (
                      <span className="text-[#F3F0E8] font-medium">{issue.department}</span>
                    ) : (
                      <span>—</span>
                    )}
                  </div>

                  {/* Duplicate Citizen Volume */}
                  <div className="text-[12px] text-[#8D918F]">
                    {typeof issue.duplicateCount === "number" && issue.duplicateCount > 0 ? (
                      <span className="inline-flex items-center gap-1 font-mono text-[11px] text-[#F4B52C] bg-[#F4B52C]/10 px-2 py-0.5 rounded border border-[#F4B52C]/30">
                        <Layers size={11} />
                        <span>+{issue.duplicateCount} merged</span>
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-[#8D918F]">1 Report</span>
                    )}
                  </div>

                  {/* Status Pill */}
                  <div>
                    <StatusPill tone={statusTone[issue.status] || "neutral"} size="sm">
                      {issue.status.replace("_", " ")}
                    </StatusPill>
                  </div>

                  {/* Action Link */}
                  <div>
                    <Link
                      href={`/authority/issues/${issue.id}`}
                      className="focus-ring inline-flex items-center gap-1 text-[12px] font-mono text-[#F4B52C] hover:text-[#F4B52C]/80 border border-[#2C2A25] hover:border-[#F4B52C]/40 bg-[#121415] px-3 py-1.5 rounded-lg transition-all"
                    >
                      <span>Inspect</span>
                      <ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </AuthorityShell>
  );
}
