"use client";

import { useEffect, useState } from "react";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { AnalyticsCharts } from "@/components/authority/AnalyticsCharts";
import {
  getCategoryBreakdown,
  getTrends,
  getResolutionStats,
  getHealth,
  type CategoryCount,
  type TrendPoint,
  type ResolutionStats,
  type HealthResponse,
} from "@/lib/api/analytics";
import { RefreshCw, Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export default function AnalyticsPage() {
  const [categories, setCategories] = useState<CategoryCount[]>([]);
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [resolutionStats, setResolutionStats] = useState<ResolutionStats | null>(null);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalyticsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [catData, trendData, resData, healthData] = await Promise.all([
        getCategoryBreakdown().catch(() => []),
        getTrends().catch(() => []),
        getResolutionStats().catch(() => null),
        getHealth().catch(() => null),
      ]);

      setCategories(catData || []);
      setTrends(trendData || []);
      setResolutionStats(resData);
      setHealth(healthData);
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
          eyebrow="City Analytics"
          title="Infrastructure Intelligence & Metrics"
          description="Real-time aggregation of municipal problem categories, resolution performance, and temporal patterns."
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
          <div className="grid md:grid-cols-2 gap-6">
            <div className="h-72 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
            <div className="h-72 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
            <div className="h-64 rounded-2xl bg-[#151718] border border-[#2C2A25] md:col-span-2" />
          </div>
          <div className="h-44 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
        </div>
      ) : (
        <>
          <AnalyticsCharts
            categories={categories}
            trends={trends}
            resolutionStats={resolutionStats}
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
                    {health?.methodology || "Multi-category municipal asset health assessment score"}
                  </p>
                </div>
              </div>

              {health?.city_health_score !== undefined ? (
                <div className="flex items-baseline gap-1.5 self-start sm:self-auto bg-[#1C1F21] px-3.5 py-1.5 rounded-xl border border-[#2C2A25]">
                  <span className="text-[10px] font-mono text-[#8D918F] uppercase tracking-wider">Score:</span>
                  <span className="font-mono text-[22px] font-bold text-[#F4B52C]">
                    {health.city_health_score}
                  </span>
                  <span className="font-mono text-[12px] text-[#8D918F]">/ 100</span>
                </div>
              ) : (
                <span className="text-[12px] font-mono text-[#8D918F]">Pending Assessment</span>
              )}
            </div>

            {health?.categories && health.categories.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {health.categories.map((h) => {
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
