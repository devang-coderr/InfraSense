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
import type { CategoryCount, TrendPoint, ResolutionStats } from "@/lib/api/analytics";

interface AnalyticsChartsProps {
  categories: CategoryCount[];
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

const CATEGORY_COLORS = ["#B23A2C", "#C88A2A", "#F4B52C", "#4C7A5E", "#6FA8B5", "#9B8F73", "#8D918F"];

export function AnalyticsCharts({ categories, trends, resolutionStats }: AnalyticsChartsProps) {
  // Category chart data with assigned theme colors
  const categoryData = useMemo(() => {
    return categories.map((c, idx) => ({
      ...c,
      color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
    }));
  }, [categories]);

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

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Category Breakdown Bar Chart */}
      <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
          <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
            Issues by Category
          </h3>
          <span className="text-[11px] font-mono text-[#8D918F]">
            {categories.length} Categories
          </span>
        </div>

        {categoryData.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-center p-4">
            <p className="text-[13px] text-[#8D918F]">
              No category distribution data available from the current API.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={categoryData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
              <CartesianGrid vertical={false} stroke="#2C2A25" strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "#8D918F" }}
                axisLine={{ stroke: "#2C2A25" }}
                tickLine={false}
                interval={0}
                angle={-20}
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
            <p className="text-[13px] text-[#8D918F]">
              Resolution statistics unavailable from current API response.
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
      <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl md:col-span-2">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
          <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
            Reporting Volume Trend (Weekly)
          </h3>
          <span className="text-[11px] font-mono text-[#8D918F]">
            {trends.length} Time Intervals
          </span>
        </div>

        {trends.length === 0 ? (
          <div className="h-52 flex flex-col items-center justify-center text-center p-4">
            <p className="text-[13px] text-[#8D918F]">
              Historical reporting trend data is currently unavailable.
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
  );
}
