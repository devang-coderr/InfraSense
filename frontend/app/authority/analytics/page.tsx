"use client";

import { useEffect, useState } from "react";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnalyticsCharts } from "@/components/authority/AnalyticsCharts";
import {
  getAnalyticsOverview,
  type AnalyticsOverview,
} from "@/lib/api/analytics";
import { RefreshCw, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAnalyticsOverview();
      setOverview(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load real-time analytics data from the platform.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  return (
    <AuthorityShell>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <PageHeader
          eyebrow="City Analytics & Intelligence"
          title="Infrastructure Intelligence & Impact Analytics"
          description="Real-time aggregation of citizen incident volume, category distribution, severity metrics, field work orders, and resolution performance."
        />
        <button
          type="button"
          onClick={fetchAnalyticsData}
          disabled={loading}
          className="focus-ring self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-mono bg-[#1C1F21] border border-[#2C2A25] text-[#F3F0E8] hover:bg-[#25282A] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-[#F4B52C]" : "text-[#8D918F]"} />
          <span>Refresh Data</span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-[var(--critical)]/30 bg-[var(--critical)]/10 text-[var(--critical)] text-[13px] flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="space-y-6 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
            ))}
          </div>
          <div className="h-40 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-72 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
            <div className="h-72 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
            <div className="h-64 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
            <div className="h-64 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
          </div>
          <div className="h-44 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
        </div>
      ) : (
        <>
          <AnalyticsCharts
            summary={overview?.summary}
            categories={overview?.category_breakdown || []}
            severityDistribution={overview?.severity_distribution || []}
            workOrderStats={overview?.work_order_stats}
            wardBreakdown={overview?.ward_breakdown || []}
            trends={overview?.trends || []}
            resolutionStats={overview ? {
              total_issues: overview.summary.total_reports,
              resolved_issues: overview.summary.resolved_issues,
              resolution_rate: overview.summary.resolution_rate,
              average_resolution_days: overview.summary.average_resolution_days,
            } : null}
          />

          {/* Infrastructure Health Card */}
          <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#2C2A25]">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-[#F4B52C]" />
                <div>
                  <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                    Infrastructure Health Index
                  </h3>
                  <p className="text-[12px] text-[#8D918F] mt-0.5">
                    {overview?.health?.methodology || "Multi-category municipal asset health assessment score"}
                  </p>
                </div>
              </div>

              {overview?.health?.city_health_score !== undefined ? (
                <div className="flex items-baseline gap-1.5 self-start sm:self-auto bg-[#1C1F21] px-3.5 py-1.5 rounded-xl border border-[#2C2A25]">
                  <span className="text-[10px] font-mono text-[#8D918F] uppercase tracking-wider">Score:</span>
                  <span className="font-mono text-[22px] font-bold text-[#F4B52C]">
                    {overview.health.city_health_score}
                  </span>
                  <span className="font-mono text-[12px] text-[#8D918F]">/ 100</span>
                </div>
              ) : (
                <span className="text-[12px] font-mono text-[#8D918F]">Pending Assessment</span>
              )}
            </div>

            {overview?.health?.categories && overview.health.categories.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {overview.health.categories.map((h) => {
                  const scoreColor =
                    h.score >= 80
                      ? "#4C7A5E"
                      : h.score >= 60
                      ? "#F4B52C"
                      : "#B23A2C";

                  return (
                    <div key={h.label} className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                      <div className="flex justify-between items-center text-[12px] mb-2">
                        <span className="text-[#F3F0E8] font-medium truncate" title={h.label}>
                          {h.label}
                        </span>
                        <span className="font-mono font-bold" style={{ color: scoreColor }}>
                          {h.score}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#151718] overflow-hidden border border-[#2C2A25]/50">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, h.score))}%`,
                            backgroundColor: scoreColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-[#8D918F] text-[13px] bg-[#1C1F21] rounded-xl border border-[#2C2A25]">
                <ShieldCheck size={24} className="mx-auto mb-2 text-[#8D918F]" />
                <p>Category-level breakdown is calculated dynamically once field assessments are processed.</p>
              </div>
            )}
          </div>
        </>
      )}
    </AuthorityShell>
  );
}
