"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type {
  CategoryCount,
  TrendPoint,
  ResolutionStats,
  SeverityCount,
  WorkOrderAnalytics,
  WardAnalyticsItem,
  AnalyticsSummary,
} from "@/lib/api/analytics";
import {
  FileText,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Clock,
  Briefcase,
  Layers,
  MapPin,
} from "lucide-react";

interface AnalyticsChartsProps {
  summary?: AnalyticsSummary | null;
  categories: CategoryCount[];
  severityDistribution?: SeverityCount[];
  workOrderStats?: WorkOrderAnalytics | null;
  wardBreakdown?: WardAnalyticsItem[];
  trends: TrendPoint[];
  resolutionStats: ResolutionStats | null;
}

const tooltipStyle = {
  backgroundColor: "#151718",
  border: "1px solid #2C2A25",
  borderRadius: "10px",
  fontSize: "12px",
  color: "#F3F0E8",
  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
};

const CATEGORY_COLORS = [
  "#B23A2C", // Critical / Red
  "#C88A2A", // Amber / Warm Orange
  "#F4B52C", // Gold / Yellow
  "#4C7A5E", // Green / Low
  "#6FA8B5", // Slate Blue
  "#8B5CF6", // Purple
  "#D97706", // Ochre
  "#0EA5E9", // Sky Blue
];

const SEVERITY_COLORS: Record<string, string> = {
  critical: "var(--critical)",
  high: "var(--high)",
  medium: "var(--medium)",
  low: "var(--low)",
};

export function AnalyticsCharts({
  summary,
  categories,
  severityDistribution = [],
  workOrderStats,
  wardBreakdown = [],
  trends,
  resolutionStats,
}: AnalyticsChartsProps) {
  // Category chart data with assigned theme colors
  const categoryData = useMemo(() => {
    return categories.map((c, idx) => ({
      ...c,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [categories]);

  // Severity chart data
  const severityData = useMemo(() => {
    if (!severityDistribution || severityDistribution.length === 0) return [];
    return severityDistribution.map((s) => ({
      ...s,
      fill: SEVERITY_COLORS[s.severity] || "var(--medium)",
    }));
  }, [severityDistribution]);

  // Resolution pie chart data computed from real stats
  const resolutionData = useMemo(() => {
    if (!resolutionStats) return [];
    const total = resolutionStats.total_issues || 0;
    const resolved = resolutionStats.resolved_issues || 0;
    const pending = Math.max(0, total - resolved);

    if (total === 0) return [];

    return [
      { name: "Resolved Issues", value: resolved, color: "#4C7A5E" },
      { name: "Pending / In Progress", value: pending, color: "#F4B52C" },
    ];
  }, [resolutionStats]);

  const hasCategoryData = categoryData.some((c) => c.value > 0);
  const hasSeverityData = severityData.some((s) => s.count > 0);
  const hasTrendData = trends.some((t) => t.reports > 0);

  return (
    <div className="space-y-6">
      {/* KPI Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-[#151718] border border-[#2C2A25] shadow-md">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8D918F] uppercase tracking-wider mb-2">
              <FileText size={13} className="text-[#F4B52C]" />
              <span>Total Reports</span>
            </div>
            <div className="text-[24px] font-bold font-mono text-[#F3F0E8] leading-none">
              {summary.total_reports}
            </div>
            <div className="text-[11px] text-[#8D918F] mt-1.5 font-mono">
              In your jurisdiction
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#151718] border border-[#2C2A25] shadow-md">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8D918F] uppercase tracking-wider mb-2">
              <AlertCircle size={13} className="text-[#F4B52C]" />
              <span>Open Issues</span>
            </div>
            <div className="text-[24px] font-bold font-mono text-[#F4B52C] leading-none">
              {summary.open_issues}
            </div>
            <div className="text-[11px] text-[#8D918F] mt-1.5 font-mono">
              Unresolved load
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#151718] border border-[#2C2A25] shadow-md">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8D918F] uppercase tracking-wider mb-2">
              <CheckCircle2 size={13} className="text-[#4C7A5E]" />
              <span>Resolved</span>
            </div>
            <div className="text-[24px] font-bold font-mono text-[#4C7A5E] leading-none">
              {summary.resolved_issues}
            </div>
            <div className="text-[11px] text-[#8D918F] mt-1.5 font-mono">
              {summary.resolution_rate}% closeout rate
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#151718] border border-[#2C2A25] shadow-md">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8D918F] uppercase tracking-wider mb-2">
              <AlertTriangle size={13} className="text-[var(--critical)]" />
              <span>Critical</span>
            </div>
            <div className="text-[24px] font-bold font-mono text-[var(--critical)] leading-none">
              {summary.critical_issues}
            </div>
            <div className="text-[11px] text-[#8D918F] mt-1.5 font-mono">
              Highest severity
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#151718] border border-[#2C2A25] shadow-md">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8D918F] uppercase tracking-wider mb-2">
              <Flame size={13} className="text-[var(--high)]" />
              <span>High Priority</span>
            </div>
            <div className="text-[24px] font-bold font-mono text-[var(--high)] leading-none">
              {summary.high_priority_issues}
            </div>
            <div className="text-[11px] text-[#8D918F] mt-1.5 font-mono">
              Priority Score ≥ 70
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#151718] border border-[#2C2A25] shadow-md">
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8D918F] uppercase tracking-wider mb-2">
              <Clock size={13} className="text-[#8D918F]" />
              <span>Avg Closeout</span>
            </div>
            <div className="text-[24px] font-bold font-mono text-[#F3F0E8] leading-none">
              {summary.average_resolution_days}d
            </div>
            <div className="text-[11px] text-[#8D918F] mt-1.5 font-mono">
              Report to resolution
            </div>
          </div>
        </div>
      )}

      {/* Work Order Field Operations Workload */}
      {workOrderStats && (
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-3 border-b border-[#2C2A25]">
            <div className="flex items-center gap-2">
              <Briefcase size={18} className="text-[#F4B52C]" />
              <div>
                <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                  Field Action & Work Order Lifecycle
                </h3>
                <p className="text-[12px] text-[#8D918F] mt-0.5">
                  Trackable field maintenance workload across active lifecycle states
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-[#1C1F21] px-3.5 py-1.5 rounded-xl border border-[#2C2A25] self-start sm:self-auto font-mono text-[12px]">
              <span className="text-[#8D918F]">Completion Rate:</span>
              <strong className="text-[#4C7A5E]">{workOrderStats.completion_rate}%</strong>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
              <div className="text-[10.5px] font-mono uppercase text-[#8D918F] mb-1">
                Total Orders
              </div>
              <div className="text-[20px] font-mono font-bold text-[#F3F0E8]">
                {workOrderStats.total}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
              <div className="text-[10.5px] font-mono uppercase text-[#8D918F] mb-1">
                Pending
              </div>
              <div className="text-[20px] font-mono font-bold text-[#8D918F]">
                {workOrderStats.pending}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
              <div className="text-[10.5px] font-mono uppercase text-[#F4B52C] mb-1">
                Assigned
              </div>
              <div className="text-[20px] font-mono font-bold text-[#F4B52C]">
                {workOrderStats.assigned}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
              <div className="text-[10.5px] font-mono uppercase text-[var(--high)] mb-1">
                In Progress
              </div>
              <div className="text-[20px] font-mono font-bold text-[var(--high)]">
                {workOrderStats.in_progress}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
              <div className="text-[10.5px] font-mono uppercase text-[#4C7A5E] mb-1">
                Completed
              </div>
              <div className="text-[20px] font-mono font-bold text-[#4C7A5E]">
                {workOrderStats.completed}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
              <div className="text-[10.5px] font-mono uppercase text-[#4C7A5E] mb-1">
                Verified Closed
              </div>
              <div className="text-[20px] font-mono font-bold text-[#4C7A5E]">
                {workOrderStats.verified}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Category Breakdown & Severity Distribution */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Category Breakdown Bar Chart */}
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
            <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
              Issues by Category (Official 8 Classes)
            </h3>
            <span className="text-[11px] font-mono text-[#8D918F]">
              {categories.length} Categories
            </span>
          </div>

          {!hasCategoryData ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4">
              <Layers size={28} className="text-[#8D918F] mb-2" />
              <p className="text-[13px] text-[#8D918F]">
                No category distribution data available for this jurisdiction.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                <CartesianGrid vertical={false} stroke="#2C2A25" strokeDasharray="3 3" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10.5, fill: "#8D918F" }}
                  axisLine={{ stroke: "#2C2A25" }}
                  tickLine={false}
                  interval={0}
                  angle={-25}
                  textAnchor="end"
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8D918F" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1C1F21" }} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {categoryData.map((c, i) => (
                    <Cell key={i} fill={c.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Severity Distribution Chart */}
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
            <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
              Severity Distribution
            </h3>
            <span className="text-[11px] font-mono text-[#8D918F]">
              Impact Levels
            </span>
          </div>

          {!hasSeverityData ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4">
              <AlertTriangle size={28} className="text-[#8D918F] mb-2" />
              <p className="text-[13px] text-[#8D918F]">
                No severity distribution records available for this jurisdiction.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={severityData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                <CartesianGrid vertical={false} stroke="#2C2A25" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: "#8D918F" }}
                  axisLine={{ stroke: "#2C2A25" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8D918F" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#1C1F21" }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {severityData.map((s, i) => (
                    <Cell key={i} fill={s.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 2: Resolution Rate & Historical Volume Trend */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Resolution Rate Chart */}
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
            <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
              Resolution Performance
            </h3>
            {resolutionStats && (
              <span className="text-[11px] font-mono text-[#4C7A5E] bg-[#4C7A5E]/15 border border-[#4C7A5E]/30 px-2 py-0.5 rounded">
                {resolutionStats.resolution_rate}% Rate
              </span>
            )}
          </div>

          {!resolutionStats || resolutionData.length === 0 ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4">
              <CheckCircle2 size={28} className="text-[#8D918F] mb-2" />
              <p className="text-[13px] text-[#8D918F]">
                Resolution statistics unavailable for this jurisdiction.
              </p>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-56">
              <ResponsiveContainer width={150} height={150}>
                <PieChart>
                  <Pie
                    data={resolutionData}
                    dataKey="value"
                    innerRadius={45}
                    outerRadius={65}
                    stroke="none"
                    paddingAngle={3}
                  >
                    {resolutionData.map((c, i) => (
                      <Cell key={i} fill={c.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>

              <div className="space-y-3 text-[12.5px] font-mono">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-[#4C7A5E]" />
                  <span className="text-[#F3F0E8]">
                    Resolved: <strong>{resolutionStats.resolved_issues}</strong> (
                    {resolutionStats.resolution_rate}%)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-[#F4B52C]" />
                  <span className="text-[#F3F0E8]">
                    Pending:{" "}
                    <strong>
                      {Math.max(0, resolutionStats.total_issues - resolutionStats.resolved_issues)}
                    </strong>
                  </span>
                </div>
                <div className="text-[11.5px] text-[#8D918F] pt-2 border-t border-[#2C2A25]">
                  Avg. Closeout Time:{" "}
                  <strong className="text-[#F3F0E8]">{resolutionStats.average_resolution_days} days</strong>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time-Based Complaint Volume Trend */}
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
            <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
              Historical Incident Volume Trend (Weekly)
            </h3>
            <span className="text-[11px] font-mono text-[#8D918F]">
              12-Week Rolling
            </span>
          </div>

          {!hasTrendData ? (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4">
              <Clock size={28} className="text-[#8D918F] mb-2" />
              <p className="text-[13px] text-[#8D918F]">
                No historical incident trend data recorded in this period.
              </p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trends} margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
                <CartesianGrid vertical={false} stroke="#2C2A25" strokeDasharray="3 3" />
                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 11, fill: "#8D918F" }}
                  axisLine={{ stroke: "#2C2A25" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#8D918F" }}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="reports"
                  stroke="#F4B52C"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#F4B52C", stroke: "#0D0F10", strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: "#F4B52C", stroke: "#F3F0E8", strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Row 3: Geographic Ward Workload Table */}
      {wardBreakdown && wardBreakdown.length > 0 && (
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[#F4B52C]" />
              <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                Geographic Ward Incident Workload
              </h3>
            </div>
            <span className="text-[11px] font-mono text-[#8D918F]">
              {wardBreakdown.length} Wards with Incidents
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[12.5px] font-mono">
              <thead>
                <tr className="border-b border-[#2C2A25] text-[#8D918F] text-[11px] uppercase tracking-wider">
                  <th className="pb-3 font-medium">Ward Name</th>
                  <th className="pb-3 font-medium text-right">Total Reports</th>
                  <th className="pb-3 font-medium text-right">Open Issues</th>
                  <th className="pb-3 font-medium text-right">Resolved</th>
                  <th className="pb-3 font-medium text-right">Resolution %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2C2A25]/50">
                {wardBreakdown.map((w) => {
                  const rate = w.total_issues > 0 ? Math.round((w.resolved_issues / w.total_issues) * 100) : 0;
                  return (
                    <tr key={w.ward} className="hover:bg-[#1C1F21]/60 transition-colors">
                      <td className="py-3 font-medium text-[#F3F0E8]">{w.ward}</td>
                      <td className="py-3 text-right text-[#F3F0E8]">{w.total_issues}</td>
                      <td className="py-3 text-right text-[#F4B52C]">{w.open_issues}</td>
                      <td className="py-3 text-right text-[#4C7A5E]">{w.resolved_issues}</td>
                      <td className="py-3 text-right">
                        <span className="px-2 py-0.5 rounded bg-[#1C1F21] border border-[#2C2A25] text-[#8D918F]">
                          {rate}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
