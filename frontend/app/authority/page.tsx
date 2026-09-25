"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  AlertTriangle,
  Clock,
  Calendar,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Layers,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  Map,
  ListOrdered,
} from "lucide-react";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { GISMap } from "@/components/authority/GISMap";
import { SeverityBadge } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import {
  getAuthorityDashboard,
  getPriorityQueue,
  type AuthorityDashboard as DashboardData,
} from "@/lib/api/authority";
import { ApiError } from "@/lib/api/client";
import type { Issue } from "@/lib/types";
import { useAuth } from "@/lib/useAuth";

export default function AuthorityDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [priorityQueue, setPriorityQueue] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashData, queueData] = await Promise.all([
        getAuthorityDashboard(),
        getPriorityQueue().catch(() => []),
      ]);
      setDashboard(dashData);
      setPriorityQueue(queueData);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to retrieve municipal operations data. Please ensure the backend is reachable."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const topQueue = priorityQueue.slice(0, 5);

  const greeting = user?.name
    ? `Command Overview — ${user.name}`
    : "Municipal Command Center";

  return (
    <AuthorityShell>
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 mb-8 border-b border-[#2C2A25]">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F4B52C]/10 border border-[#F4B52C]/30 text-[#F4B52C] font-mono text-[10.5px] uppercase tracking-wider font-semibold">
              <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] animate-pulse" />
              Live Operations Command
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F0E8]">
            {greeting}
          </h1>
          <p className="text-[14px] text-[#8D918F] mt-1">
            Real-time public infrastructure monitoring across municipal wards, dispatch queues, and field work orders.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button href="/authority/map" variant="secondary" size="md" className="gap-2">
            <Map size={16} />
            <span>GIS Map</span>
          </Button>
          <Button href="/authority/priority" variant="primary" size="md" className="gap-2">
            <ListOrdered size={16} />
            <span>Priority Queue</span>
          </Button>
        </div>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div className="space-y-8 mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="rounded-xl border border-[#2C2A25] bg-[#151718] p-5 animate-pulse">
                <div className="h-4 w-20 bg-[#2C2A25] rounded mb-3" />
                <div className="h-8 w-16 bg-[#2C2A25] rounded mb-2" />
                <div className="h-3 w-28 bg-[#2C2A25] rounded" />
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] h-[460px] animate-pulse" />
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 space-y-4 animate-pulse">
              <div className="h-5 w-48 bg-[#2C2A25] rounded mb-4" />
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="h-16 bg-[#2C2A25] rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Error Notice */}
      {!loading && error && (
        <div className="rounded-2xl border border-[#B23A2C]/30 bg-[#151718] p-8 sm:p-10 text-center my-8">
          <div className="h-12 w-12 rounded-2xl bg-[#B23A2C]/10 text-[#B23A2C] mx-auto flex items-center justify-center mb-3">
            <AlertTriangle size={24} />
          </div>
          <h3 className="text-lg font-semibold text-[#F3F0E8] mb-1">
            Unable to Retrieve Command Data
          </h3>
          <p className="text-[13.5px] text-[#8D918F] max-w-md mx-auto mb-6" role="alert">
            {error}
          </p>
          <Button onClick={fetchDashboard} variant="secondary" size="sm" className="gap-2">
            <RefreshCw size={14} />
            <span>Retry Connection</span>
          </Button>
        </div>
      )}

      {/* Main Operational Metrics & Grid */}
      {!loading && !error && dashboard && (
        <>
          {/* Top 5 Metric Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4 mb-8">
            {/* Total Issues */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#F4B52C]/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">Total Logged</span>
                <div className="h-8 w-8 rounded-lg bg-[#1C1F21] border border-[#2C2A25] flex items-center justify-center text-[#F4B52C]">
                  <FileText size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F3F0E8]">
                {dashboard.total_issues.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">Across all municipal wards</div>
            </div>

            {/* Critical Severity */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#B23A2C]/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">Critical Severity</span>
                <div className="h-8 w-8 rounded-lg bg-[#B23A2C]/10 border border-[#B23A2C]/30 flex items-center justify-center text-[#B23A2C]">
                  <AlertTriangle size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#B23A2C]">
                {dashboard.critical_issues.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">Immediate safety hazards</div>
            </div>

            {/* Pending Resolution */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#F4B52C]/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">Pending Action</span>
                <div className="h-8 w-8 rounded-lg bg-[#1C1F21] border border-[#2C2A25] flex items-center justify-center text-[#C88A2A]">
                  <Clock size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F3F0E8]">
                {dashboard.pending_issues.toLocaleString()}
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">Awaiting crew dispatch</div>
            </div>

            {/* Average Resolution Days */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#F4B52C]/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">Avg. Resolution</span>
                <div className="h-8 w-8 rounded-lg bg-[#1C1F21] border border-[#2C2A25] flex items-center justify-center text-[#8D918F]">
                  <Calendar size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F3F0E8]">
                {dashboard.average_resolution_days}d
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">Report to closeout</div>
            </div>

            {/* Infrastructure Health Index */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#4C7A5E]/50 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">Health Index</span>
                <div className="h-8 w-8 rounded-lg bg-[#4C7A5E]/10 border border-[#4C7A5E]/30 flex items-center justify-center text-[#4C7A5E]">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#4C7A5E]">
                {dashboard.infrastructure_health}<span className="text-base text-[#8D918F]">/100</span>
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">City-wide asset condition</div>
            </div>
          </div>

          {/* Two-Column Command Layout: GIS Map & Top Priority Dispatch Queue */}
          <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 items-start">
            {/* Embedded GIS Map */}
            <div>
              <GISMap height={480} />
            </div>

            {/* Priority Dispatch Triage Panel */}
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2C2A25]">
                  <div>
                    <h3 className="text-[16px] font-bold text-[#F3F0E8]">
                      Urgent Priority Dispatch
                    </h3>
                    <p className="text-[12px] text-[#8D918F]">
                      Highest triage scores requiring immediate department action
                    </p>
                  </div>
                  <span className="text-[11px] font-mono text-[#F4B52C] bg-[#F4B52C]/10 border border-[#F4B52C]/30 px-2 py-0.5 rounded">
                    Top {topQueue.length}
                  </span>
                </div>

                {topQueue.length === 0 ? (
                  <div className="py-12 text-center text-[13px] text-[#8D918F]">
                    No urgent issues currently in dispatch queue.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {topQueue.map((issue) => (
                      <Link
                        key={issue.id}
                        href={`/authority/issues/${issue.id}`}
                        className="focus-ring block rounded-xl border border-[#2C2A25] bg-[#1C1F21] p-3.5 hover:border-[#F4B52C]/50 transition-all group"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="font-mono text-[12px] font-bold px-2 py-0.5 rounded border"
                              style={{
                                color:
                                  issue.priorityScore >= 80
                                    ? "#B23A2C"
                                    : issue.priorityScore >= 50
                                    ? "#F4B52C"
                                    : "#4C7A5E",
                                borderColor:
                                  issue.priorityScore >= 80
                                    ? "#B23A2C40"
                                    : issue.priorityScore >= 50
                                    ? "#F4B52C40"
                                    : "#4C7A5E40",
                                backgroundColor:
                                  issue.priorityScore >= 80
                                    ? "#B23A2C15"
                                    : issue.priorityScore >= 50
                                    ? "#F4B52C15"
                                    : "#4C7A5E15",
                              }}
                            >
                              P-{issue.priorityScore}
                            </span>
                            <span className="font-mono text-[11px] text-[#8D918F]">
                              #{issue.id}
                            </span>
                          </div>

                          {issue.severity && <SeverityBadge severity={issue.severity} />}
                        </div>

                        <h4 className="text-[13.5px] font-semibold text-[#F3F0E8] group-hover:text-[#F4B52C] transition-colors truncate">
                          {issue.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11.5px] text-[#8D918F] mt-1.5">
                          <div className="flex items-center gap-1.5">
                            <MapPin size={11} className="text-[#F4B52C]" />
                            <span>{issue.ward || "Unassigned"}</span>
                            {issue.department && <span>• {issue.department}</span>}
                          </div>
                          {typeof issue.duplicateCount === "number" && issue.duplicateCount > 0 && (
                            <span className="font-mono text-[10.5px] text-[#8D918F]">
                              +{issue.duplicateCount} merged
                            </span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-[#2C2A25]">
                <Link
                  href="/authority/priority"
                  className="focus-ring flex items-center justify-center gap-1.5 text-[12.5px] font-mono text-[#F4B52C] hover:text-[#F4B52C]/80 transition-colors"
                >
                  <span>View Complete Priority Queue ({priorityQueue.length})</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          </div>
        </>
      )}
    </AuthorityShell>
  );
}
