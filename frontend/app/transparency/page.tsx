"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  Building2,
  Filter,
  RefreshCw,
  Info,
  ArrowRight,
  Layers,
  BarChart3,
  Percent,
} from "lucide-react";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/landing/Footer";
import { Button } from "@/components/ui/Button";
import {
  getTransparencyStats,
  type TransparencyOverview,
  type DistrictTransparencyStats,
} from "@/lib/api/transparency";
import { INFRASTRUCTURE_CATEGORIES } from "@/lib/types";

const tooltipStyle = {
  backgroundColor: "#151718",
  border: "1px solid #2C2A25",
  borderRadius: "10px",
  fontSize: "12.5px",
  color: "#F3F0E8",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
};

export default function TransparencyPage() {
  const [data, setData] = useState<TransparencyOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  async function fetchStats(category: string | null = selectedCategory) {
    setLoading(true);
    setError(null);
    try {
      const res = await getTransparencyStats({
        category: category || undefined,
      });
      setData(res);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load public transparency statistics. Please retry."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchStats(selectedCategory);
  }, [selectedCategory]);

  const chartData = useMemo(() => {
    if (!data || !data.districts) return [];
    return data.districts.map((d) => ({
      name: d.district_name,
      Resolved: d.resolved,
      "In Progress": d.in_progress,
      Pending: d.pending,
      rate: d.resolution_rate,
      total: d.total_reports,
    }));
  }, [data]);

  const formattedLastUpdated = useMemo(() => {
    if (!data?.last_updated) return null;
    try {
      const dt = new Date(data.last_updated);
      return dt.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return data.last_updated;
    }
  }, [data?.last_updated]);

  return (
    <div className="min-h-screen bg-[#0D0F10] text-[#F3F0E8] flex flex-col selection:bg-[#F4B52C]/30 selection:text-[#F4B52C]">
      <Navbar />

      <main className="flex-1 container-px pt-28 pb-20 max-w-7xl mx-auto w-full space-y-10">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#2C2A25]">
          <div className="space-y-2.5 max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] text-[11px] font-mono uppercase tracking-wider font-semibold">
              <ShieldCheck size={13} className="text-[#F4B52C]" />
              <span>Public Civic Accountability</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#F3F0E8]">
              Infrastructure Transparency Dashboard
            </h1>
            <p className="text-[14px] sm:text-[15px] text-[#8D918F] leading-relaxed">
              Real-time, aggregate infrastructure reports and resolution metrics across municipal jurisdictions. Factual data powered directly by live citizen report tracking.
            </p>
          </div>

          {/* Right Action / Refresh */}
          <div className="flex items-center gap-3 self-start md:self-auto">
            {formattedLastUpdated && (
              <div className="flex items-center gap-1.5 text-[11.5px] font-mono text-[#8D918F] bg-[#151718] px-3 py-1.5 rounded-xl border border-[#2C2A25]">
                <Clock size={12} className="text-[#F4B52C]" />
                <span>Updated: {formattedLastUpdated}</span>
              </div>
            )}
            <button
              onClick={() => fetchStats(selectedCategory)}
              disabled={loading}
              className="p-2 rounded-xl bg-[#1C1F21] hover:bg-[#25282A] text-[#8D918F] hover:text-[#F3F0E8] border border-[#2C2A25] transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Data"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-[#F4B52C]" : ""} />
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-[12px] font-mono uppercase tracking-wider text-[#8D918F]">
            <span className="flex items-center gap-1.5">
              <Filter size={12} className="text-[#F4B52C]" />
              <span>Filter by Infrastructure Category</span>
            </span>
            {selectedCategory && (
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-[#F4B52C] hover:underline cursor-pointer lowercase"
              >
                clear filter
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all cursor-pointer ${
                selectedCategory === null
                  ? "bg-[#F4B52C] text-[#0D0F10] font-semibold shadow-md"
                  : "bg-[#151718] text-[#8D918F] border border-[#2C2A25] hover:text-[#F3F0E8] hover:border-[#3E3C35]"
              }`}
            >
              All Categories
            </button>
            {INFRASTRUCTURE_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-[12px] font-medium transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#F4B52C] text-[#0D0F10] font-semibold shadow-md"
                    : "bg-[#151718] text-[#8D918F] border border-[#2C2A25] hover:text-[#F3F0E8] hover:border-[#3E3C35]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="p-4 rounded-xl bg-[#B23A2C]/15 border border-[#B23A2C]/40 text-[#F4F1E8] flex items-center justify-between">
            <div className="flex items-center gap-2.5 text-[13px]">
              <AlertCircle size={16} className="text-[#B23A2C]" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchStats(selectedCategory)}
              className="text-[12px] font-semibold px-3 py-1 rounded bg-[#B23A2C] text-white hover:bg-[#C84A3C]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Loading State */}
        {loading && !data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 rounded-2xl bg-[#151718] border border-[#2C2A25] animate-pulse" />
            ))}
          </div>
        )}

        {/* Section 1: Overall Summary Cards */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {/* Total Reports */}
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-5 relative overflow-hidden group">
              <div className="flex items-center justify-between text-[#8D918F] text-[12px] mb-2 font-mono uppercase tracking-wider">
                <span>Total Reports</span>
                <Layers size={14} className="text-[#F4B52C]" />
              </div>
              <div className="text-3xl font-extrabold text-[#F3F0E8] tracking-tight">
                {data.total_reports.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#8D918F] mt-1.5">
                {selectedCategory ? `In category '${selectedCategory}'` : "All recorded issues"}
              </p>
            </div>

            {/* Resolved */}
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-5 relative overflow-hidden group">
              <div className="flex items-center justify-between text-[#8D918F] text-[12px] mb-2 font-mono uppercase tracking-wider">
                <span>Resolved</span>
                <CheckCircle2 size={14} className="text-[#4C7A5E]" />
              </div>
              <div className="text-3xl font-extrabold text-[#4C7A5E] tracking-tight">
                {data.resolved.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#8D918F] mt-1.5">
                Work completed & closed
              </p>
            </div>

            {/* In Progress */}
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-5 relative overflow-hidden group">
              <div className="flex items-center justify-between text-[#8D918F] text-[12px] mb-2 font-mono uppercase tracking-wider">
                <span>In Progress</span>
                <Clock size={14} className="text-[#0EA5E9]" />
              </div>
              <div className="text-3xl font-extrabold text-[#0EA5E9] tracking-tight">
                {data.in_progress.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#8D918F] mt-1.5">
                Active municipal work
              </p>
            </div>

            {/* Pending */}
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-5 relative overflow-hidden group">
              <div className="flex items-center justify-between text-[#8D918F] text-[12px] mb-2 font-mono uppercase tracking-wider">
                <span>Pending</span>
                <AlertCircle size={14} className="text-[#F4B52C]" />
              </div>
              <div className="text-3xl font-extrabold text-[#F4B52C] tracking-tight">
                {data.pending.toLocaleString()}
              </div>
              <p className="text-[11px] text-[#8D918F] mt-1.5">
                Awaiting field assignment
              </p>
            </div>

            {/* Resolution Rate */}
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-5 relative overflow-hidden group col-span-2 sm:col-span-1">
              <div className="flex items-center justify-between text-[#8D918F] text-[12px] mb-2 font-mono uppercase tracking-wider">
                <span>Resolution Rate</span>
                <Percent size={14} className="text-[#4C7A5E]" />
              </div>
              <div className="text-3xl font-extrabold text-[#F3F0E8] tracking-tight flex items-baseline gap-1">
                <span>{data.resolution_rate}%</span>
              </div>
              <div className="w-full bg-[#1C1F21] h-1.5 rounded-full mt-2 overflow-hidden">
                <div
                  className="bg-[#4C7A5E] h-full rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, data.resolution_rate))}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Visual Comparison Bar Chart */}
        {data && chartData.length > 0 && (
          <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BarChart3 size={16} className="text-[#F4B52C]" />
                  <h2 className="text-lg font-bold text-[#F3F0E8]">
                    District Status Distribution
                  </h2>
                </div>
                <p className="text-[12.5px] text-[#8D918F]">
                  Comparative breakdown of resolved, active, and pending infrastructure issues by district.
                </p>
              </div>
              <div className="flex items-center gap-4 text-[12px] text-[#8D918F] font-mono">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#4C7A5E]" />
                  Resolved
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#0EA5E9]" />
                  In Progress
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-sm bg-[#F4B52C]" />
                  Pending
                </span>
              </div>
            </div>

            <div className="h-72 w-full pt-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2C2A25" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#8D918F"
                    fontSize={11.5}
                    tickLine={false}
                    axisLine={{ stroke: "#2C2A25" }}
                  />
                  <YAxis
                    stroke="#8D918F"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "#2C2A25" }}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: "rgba(244, 181, 44, 0.05)" }}
                    formatter={(value: any, name: any) => [value, name]}
                  />
                  <Bar dataKey="Resolved" fill="#4C7A5E" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="In Progress" fill="#0EA5E9" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="Pending" fill="#F4B52C" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Section 3: District Comparison Table */}
        {data && (
          <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] overflow-hidden shadow-xl">
            <div className="p-6 border-b border-[#2C2A25] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Building2 size={16} className="text-[#F4B52C]" />
                  <h2 className="text-lg font-bold text-[#F3F0E8]">
                    District Performance & Resolution Statistics
                  </h2>
                </div>
                <p className="text-[12.5px] text-[#8D918F]">
                  Factual metrics comparing report volume and resolution rates across administrative districts.
                </p>
              </div>
              <span className="text-[11.5px] font-mono text-[#8D918F]">
                {data.districts.length} {data.districts.length === 1 ? "District" : "Districts"} Listed
              </span>
            </div>

            {data.districts.length === 0 ? (
              <div className="p-12 text-center text-[#8D918F] space-y-2">
                <Building2 size={32} className="mx-auto text-[#2C2A25]" />
                <p className="text-[14px]">No reports recorded for the selected filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#2C2A25] bg-[#121415] text-[11px] font-mono uppercase tracking-wider text-[#8D918F]">
                      <th className="py-3.5 px-6">District</th>
                      <th className="py-3.5 px-4 text-right">Total Reports</th>
                      <th className="py-3.5 px-4 text-right">Resolved</th>
                      <th className="py-3.5 px-4 text-right">In Progress</th>
                      <th className="py-3.5 px-4 text-right">Pending</th>
                      <th className="py-3.5 px-6 text-right">Resolution Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2C2A25]/60 text-[13px]">
                    {data.districts.map((district, idx) => (
                      <tr
                        key={idx}
                        className="hover:bg-[#1C1F21]/60 transition-colors group"
                      >
                        <td className="py-4 px-6">
                          <div className="font-semibold text-[#F3F0E8] flex items-center gap-2">
                            <span>{district.district_name}</span>
                            {district.state && (
                              <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-[#1C1F21] border border-[#2C2A25] text-[#8D918F]">
                                {district.state}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono font-medium text-[#F3F0E8]">
                          {district.total_reports.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-[#4C7A5E] font-semibold">
                          {district.resolved.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-[#0EA5E9]">
                          {district.in_progress.toLocaleString()}
                        </td>
                        <td className="py-4 px-4 text-right font-mono text-[#F4B52C]">
                          {district.pending.toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="inline-flex flex-col items-end gap-1">
                            <span className="font-mono font-bold text-[13.5px] text-[#F3F0E8]">
                              {district.resolution_rate}%
                            </span>
                            <div className="w-24 bg-[#1C1F21] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#4C7A5E] h-full rounded-full"
                                style={{ width: `${Math.min(100, Math.max(0, district.resolution_rate))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Section 4: Category Breakdown Grid */}
        {data && data.categories && data.categories.length > 0 && (
          <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8 space-y-5">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Layers size={16} className="text-[#F4B52C]" />
                <h2 className="text-lg font-bold text-[#F3F0E8]">
                  Taxonomy Category Breakdown
                </h2>
              </div>
              <p className="text-[12.5px] text-[#8D918F]">
                Resolution health and volume across the 8 official infrastructure categories.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
              {data.categories.map((cat) => (
                <div
                  key={cat.category}
                  className="p-4 rounded-xl bg-[#121415] border border-[#2C2A25] hover:border-[#F4B52C]/40 transition-colors space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[13.5px] text-[#F3F0E8]">
                      {cat.category}
                    </span>
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-[#1C1F21] text-[#8D918F]">
                      {cat.total_reports} {cat.total_reports === 1 ? "report" : "reports"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                    <div className="p-1.5 rounded bg-[#151718] border border-[#2C2A25]">
                      <div className="text-[#4C7A5E] font-bold">{cat.resolved}</div>
                      <div className="text-[#8D918F] text-[10px]">Resolved</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#151718] border border-[#2C2A25]">
                      <div className="text-[#0EA5E9] font-bold">{cat.in_progress}</div>
                      <div className="text-[#8D918F] text-[10px]">Active</div>
                    </div>
                    <div className="p-1.5 rounded bg-[#151718] border border-[#2C2A25]">
                      <div className="text-[#F4B52C] font-bold">{cat.pending}</div>
                      <div className="text-[#8D918F] text-[10px]">Pending</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-[11.5px]">
                    <span className="text-[#8D918F]">Resolution Rate</span>
                    <span className="font-mono font-bold text-[#4C7A5E]">
                      {cat.resolution_rate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Informational Callout */}
        <div className="p-5 rounded-2xl bg-[#151718] border border-[#2C2A25] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#F4B52C]/10 border border-[#F4B52C]/30 text-[#F4B52C] flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Info size={18} />
            </div>
            <div className="space-y-1">
              <div className="text-[13.5px] font-semibold text-[#F3F0E8]">
                Contribute to Infrastructure Transparency
              </div>
              <p className="text-[12.5px] text-[#8D918F] max-w-xl leading-relaxed">
                Spot a defect in your neighborhood? Submit a geo-verified citizen report with multi-photo evidence to dispatch repair crews directly.
              </p>
            </div>
          </div>
          <Button href="/citizen/report" variant="primary" size="md" className="gap-2 shrink-0">
            <span>Report an Issue</span>
            <ArrowRight size={14} />
          </Button>
        </div>
      </main>

      <Footer />
    </div>
  );
}
