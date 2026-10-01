"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MapPin,
  Flame,
  Layers,
  RefreshCw,
  AlertTriangle,
  ArrowRight,
  Crosshair,
  Filter,
  X,
} from "lucide-react";
import { Issue, INFRASTRUCTURE_CATEGORIES } from "@/lib/types";
import { getAuthorityMap } from "@/lib/api/authority";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/Primitives";

// Dynamically import LeafletMap with SSR disabled to ensure pure browser execution
const LeafletMap = dynamic(() => import("./LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full w-full bg-[#0D0F10] text-[#8D918F] font-mono text-[12px] animate-pulse">
      <div className="flex items-center gap-2">
        <RefreshCw size={14} className="animate-spin text-[#F4B52C]" />
        <span>INITIALIZING LEAFLET GEOSPATIAL TILES…</span>
      </div>
    </div>
  ),
});

const severityFilters = ["all", "critical", "high", "medium", "low"] as const;

const CATEGORIES = INFRASTRUCTURE_CATEGORIES;

const STATUS_OPTIONS = [
  { value: "all", label: "Status: All" },
  { value: "reported", label: "Reported" },
  { value: "ai_verified", label: "AI Verified" },
  { value: "assigned", label: "Assigned" },
  { value: "in_progress", label: "In Progress" },
  { value: "resolved", label: "Resolved" },
];

export function GISMap({ height = 480 }: { height?: number }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Filter States
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [severityFilter, setSeverityFilter] = useState<(typeof severityFilters)[number]>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [wardFilter, setWardFilter] = useState<string>("all");
  const [heatmap, setHeatmap] = useState<boolean>(false);
  const [showClusters, setShowClusters] = useState<boolean>(true);
  const [showResolved, setShowResolved] = useState<boolean>(false);

  const [selected, setSelected] = useState<Issue | null>(null);

  const fetchMapData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAuthorityMap();
      setIssues(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to load GIS map data. Please check backend connectivity."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, [fetchMapData]);

  // Unique wards list
  const wards = useMemo(() => {
    const set = new Set<string>();
    issues.forEach((i) => {
      if (i.ward && i.ward.trim() && i.ward !== "Unassigned") set.add(i.ward.trim());
    });
    return Array.from(set).sort();
  }, [issues]);

  // Operational Filtering: Category, Severity, Status, Ward, Resolved
  const visible = useMemo(() => {
    return issues.filter((i) => {
      if (!showResolved && i.status === "resolved") return false;
      if (categoryFilter !== "all" && i.category?.toLowerCase() !== categoryFilter.toLowerCase()) return false;
      if (severityFilter !== "all" && i.severity !== severityFilter) return false;
      if (statusFilter !== "all" && i.status !== statusFilter) return false;
      if (wardFilter !== "all" && i.ward !== wardFilter) return false;
      return true;
    });
  }, [issues, showResolved, categoryFilter, severityFilter, statusFilter, wardFilter]);

  const hasActiveFilters =
    categoryFilter !== "all" ||
    severityFilter !== "all" ||
    statusFilter !== "all" ||
    wardFilter !== "all" ||
    showResolved;

  return (
    <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] overflow-hidden shadow-2xl">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2C2A25] px-5 py-3.5 bg-[#121415]">
        <div className="flex items-center gap-2">
          <Crosshair size={16} className="text-[#F4B52C]" />
          <span className="text-[13px] font-semibold text-[#F3F0E8]">
            GIS Infrastructure Map
          </span>
          {!loading && (
            <span className="text-[11px] font-mono text-[#8D918F] bg-[#1C1F21] px-2 py-0.5 rounded border border-[#2C2A25]">
              {visible.length} Plotted Asset{visible.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            aria-label="Filter by defect category"
            className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#F3F0E8] cursor-pointer"
          >
            <option value="all">Category: All</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Severity Dropdown */}
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as (typeof severityFilters)[number])}
            aria-label="Filter by severity level"
            className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#F3F0E8] uppercase tracking-wider cursor-pointer"
          >
            <option value="all">Severity: All</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          {/* Ward Dropdown */}
          {wards.length > 0 && (
            <select
              value={wardFilter}
              onChange={(e) => setWardFilter(e.target.value)}
              aria-label="Filter by municipal ward"
              className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#F3F0E8] cursor-pointer"
            >
              <option value="all">Ward: All</option>
              {wards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          )}

          {/* Status Dropdown */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            aria-label="Filter by status"
            className="focus-ring bg-[#151718] border border-[#2C2A25] rounded-lg px-2.5 py-1 text-[11px] font-mono text-[#F3F0E8] uppercase tracking-wider cursor-pointer"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Active vs All Scope Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowResolved((prev) => !prev)}
            aria-pressed={showResolved}
            className={`focus-ring inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider rounded-lg px-2.5 py-1 border transition-all cursor-pointer ${
              showResolved
                ? "border-[#4C7A5E]/50 bg-[#4C7A5E]/15 text-[#4C7A5E] font-bold"
                : "border-[#2C2A25] bg-[#151718] text-[#8D918F] hover:text-[#F3F0E8]"
            }`}
          >
            <Filter size={12} className={showResolved ? "text-[#4C7A5E]" : "text-[#8D918F]"} />
            <span>{showResolved ? "Scope: All" : "Scope: Active"}</span>
          </button>

          {/* Clusters Toggle */}
          <button
            type="button"
            onClick={() => setShowClusters((prev) => !prev)}
            aria-pressed={showClusters}
            className={`focus-ring inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider rounded-lg px-2.5 py-1 border transition-all cursor-pointer ${
              showClusters
                ? "border-[#F4B52C]/50 bg-[#F4B52C]/15 text-[#F4B52C] font-semibold"
                : "border-[#2C2A25] bg-[#151718] text-[#8D918F] hover:text-[#F3F0E8]"
            }`}
          >
            <Layers size={12} className={showClusters ? "text-[#F4B52C]" : "text-[#8D918F]"} />
            <span>Clusters: {showClusters ? "ON" : "OFF"}</span>
          </button>

          {/* Heatmap Toggle Button */}
          <button
            type="button"
            onClick={() => setHeatmap((prev) => !prev)}
            aria-pressed={heatmap}
            className={`focus-ring inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider rounded-lg px-2.5 py-1 border transition-all cursor-pointer ${
              heatmap
                ? "border-[#F4B52C]/50 bg-[#F4B52C]/15 text-[#F4B52C] shadow-sm shadow-[#F4B52C]/10 font-bold"
                : "border-[#2C2A25] bg-[#151718] text-[#8D918F] hover:text-[#F3F0E8]"
            }`}
          >
            <Flame size={13} className={heatmap ? "text-[#F4B52C]" : "text-[#8D918F]"} />
            <span>Heatmap: {heatmap ? "ON" : "OFF"}</span>
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setSeverityFilter("all");
                setStatusFilter("all");
                setWardFilter("all");
                setShowResolved(false);
              }}
              className="text-[11px] font-mono text-[#F4B52C] hover:underline px-1.5 py-1 cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Map Interactive Canvas */}
      <div className="relative bg-[#0D0F10] overflow-hidden" style={{ height }}>
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0D0F10]/80 z-30">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#151718] border border-[#F4B52C]/40 text-[#F4B52C] font-mono text-[12px] font-semibold tracking-wider animate-pulse">
              <RefreshCw size={14} className="animate-spin" />
              <span>FETCHING GEOSPATIAL ASSET DATA…</span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0D0F10]/90 z-30 text-center">
            <div className="h-10 w-10 rounded-full bg-[#B23A2C]/15 text-[#B23A2C] flex items-center justify-center mb-3">
              <AlertTriangle size={20} />
            </div>
            <p className="text-[13.5px] text-[#F4F1E8] mb-1 font-medium">GIS Feed Offline</p>
            <p className="text-[12.5px] text-[#8D918F] max-w-sm mb-4" role="alert">
              {error}
            </p>
            <Button onClick={fetchMapData} variant="secondary" size="sm" className="gap-2">
              <RefreshCw size={13} />
              <span>Retry Map Sync</span>
            </Button>
          </div>
        )}

        {/* Empty State when no issues match filter */}
        {!loading && !error && visible.length === 0 && issues.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0D0F10]/90 z-30 text-center">
            <Filter size={30} className="text-[#8D918F] mb-2 opacity-70" />
            <p className="text-[14px] font-semibold text-[#F3F0E8] mb-1">
              No Issues Match Selected GIS Filters
            </p>
            <p className="text-[12.5px] text-[#8D918F] max-w-xs mb-3">
              Try adjusting category, severity, status, or ward filters.
            </p>
            <button
              type="button"
              onClick={() => {
                setCategoryFilter("all");
                setSeverityFilter("all");
                setStatusFilter("all");
                setWardFilter("all");
                setShowResolved(true);
              }}
              className="focus-ring text-[11px] font-mono text-[#F4B52C] hover:underline cursor-pointer"
            >
              Reset Filters & Show All
            </button>
          </div>
        )}

        {/* Empty State when no issues exist at all */}
        {!loading && !error && issues.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0D0F10]/90 z-30 text-center">
            <Crosshair size={28} className="text-[#8D918F] mb-2 opacity-50" />
            <p className="text-[14px] font-semibold text-[#F3F0E8] mb-1">
              No Plotted Infrastructure Assets
            </p>
            <p className="text-[12.5px] text-[#8D918F] max-w-xs">
              No civic issues recorded in the current municipal index.
            </p>
          </div>
        )}

        {/* Real Leaflet Map Component with OpenStreetMap Tiles */}
        {!loading && !error && (
          <LeafletMap
            issues={issues}
            visible={visible}
            heatmap={heatmap}
            showClusters={showClusters}
            selected={selected}
            onSelect={setSelected}
            height={height}
          />
        )}

        {/* Selected Asset Modal Card (Fixed on Map Bottom-Right) */}
        {selected && (
          <div
            className="absolute right-4 bottom-4 z-40 max-w-sm w-full rounded-xl border border-[#F4B52C]/40 bg-[#151718]/95 backdrop-blur-md p-4 shadow-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] font-bold text-[#F4B52C] bg-[#F4B52C]/10 border border-[#F4B52C]/30 px-2 py-0.5 rounded">
                ISSUE #{selected.id}
              </span>
              <div className="flex items-center gap-1.5">
                {selected.severity && <SeverityBadge severity={selected.severity} />}
                <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C]">
                  P-{selected.priorityScore}
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-[#8D918F] hover:text-[#F3F0E8] ml-1 p-0.5 rounded transition-colors"
                  aria-label="Close details"
                >
                  <X size={14} />
                </button>
              </div>
            </div>

            <h4 className="text-[14px] font-bold text-[#F3F0E8] mb-1 leading-snug">
              {selected.category || selected.title}
            </h4>

            <div className="space-y-1 text-[12px] text-[#8D918F] mb-3">
              <div className="flex items-center gap-1.5">
                <MapPin size={12} className="text-[#F4B52C]" />
                <span className="text-[#F3F0E8] font-medium">{selected.ward || "Unassigned"}</span>
                {selected.department && <span>• {selected.department} Dept</span>}
              </div>
              <div className="font-mono text-[11px] text-[#8D918F]">
                Report GPS:{" "}
                {typeof selected.lat === "number" && typeof selected.lng === "number"
                  ? `${selected.lat.toFixed(5)}, ${selected.lng.toFixed(5)}`
                  : "Unavailable"}
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#2C2A25]">
              <div className="text-[11px] font-mono text-[#8D918F] uppercase tracking-wider">
                Status: <strong className="text-[#F3F0E8]">{selected.status.replace("_", " ")}</strong>
              </div>

              <Link
                href={`/authority/issues/${selected.id}`}
                className="focus-ring inline-flex items-center gap-1 text-[12px] font-mono text-[#F4B52C] hover:underline font-semibold"
              >
                <span>View Issue</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}

        {/* Bottom-Left Map Legend */}
        <div className="absolute left-4 bottom-4 rounded-xl border border-[#2C2A25] bg-[#151718]/90 backdrop-blur-md px-3.5 py-2.5 text-[11px] font-mono space-y-1.5 z-20 shadow-xl pointer-events-none">
          <div className="text-[10px] uppercase text-[#8D918F] tracking-wider font-bold mb-1">
            Severity Legend
          </div>
          {(["critical", "high", "medium", "low"] as const).map((s) => {
            const color =
              s === "critical"
                ? "#B23A2C"
                : s === "high"
              ? "#C88A2A"
              : s === "medium"
              ? "#F4B52C"
              : "#4C7A5E";

            return (
              <div key={s} className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
                <span className="capitalize text-[#F3F0E8]">{s}</span>
              </div>
            );
          })}
          {showClusters && (
            <div className="pt-1.5 border-t border-[#2C2A25] flex items-center gap-2 text-[#F4B52C]">
              <span className="h-2 w-2 rounded-full border border-dashed border-[#F4B52C]" />
              <span>Geo Cluster</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
