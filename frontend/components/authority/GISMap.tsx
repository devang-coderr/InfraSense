"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  CheckCircle2,
} from "lucide-react";
import { Issue, severityColor } from "@/lib/types";
import { getAuthorityMap } from "@/lib/api/authority";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/Primitives";

const severityFilters = ["all", "critical", "high", "medium", "low"] as const;

export function GISMap({ height = 480 }: { height?: number }) {
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<(typeof severityFilters)[number]>("all");
  const [heatmap, setHeatmap] = useState<boolean>(true);
  const [showResolved, setShowResolved] = useState<boolean>(false);
  const [hovered, setHovered] = useState<Issue | null>(null);
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

  // Robust Coordinate Projection: Maps GPS coordinates or explicit x/y to 0-100% viewport
  const mappedIssues = useMemo(() => {
    if (issues.length === 0) return [];

    let minLat = Infinity;
    let maxLat = -Infinity;
    let minLng = Infinity;
    let maxLng = -Infinity;

    for (const i of issues) {
      if (typeof i.lat === "number" && !isNaN(i.lat) && i.lat !== 0) {
        if (i.lat < minLat) minLat = i.lat;
        if (i.lat > maxLat) maxLat = i.lat;
      }
      if (typeof i.lng === "number" && !isNaN(i.lng) && i.lng !== 0) {
        if (i.lng < minLng) minLng = i.lng;
        if (i.lng > maxLng) maxLng = i.lng;
      }
    }

    const hasValidGps =
      minLat !== Infinity && maxLat !== -Infinity && minLng !== Infinity && maxLng !== -Infinity;
    const latSpan = maxLat - minLat;
    const lngSpan = maxLng - minLng;

    return issues.map((i, idx) => {
      // 1. If GPS coordinates exist and have valid spread
      if (
        hasValidGps &&
        typeof i.lat === "number" &&
        typeof i.lng === "number" &&
        (latSpan > 0.00001 || lngSpan > 0.00001)
      ) {
        const normX = lngSpan === 0 ? 0.5 : (i.lng - minLng) / lngSpan;
        const normY = latSpan === 0 ? 0.5 : (maxLat - i.lat) / latSpan;
        return {
          ...i,
          x: Math.min(88, Math.max(12, 12 + normX * 76)),
          y: Math.min(88, Math.max(12, 12 + normY * 76)),
        };
      }

      // 2. If explicit x/y positions are present
      if (typeof i.x === "number" && typeof i.y === "number" && (i.x > 0 || i.y > 0)) {
        return {
          ...i,
          x: Math.min(90, Math.max(10, i.x)),
          y: Math.min(90, Math.max(10, i.y)),
        };
      }

      // 3. Deterministic pseudo-spatial distribution based on ID & index
      const seed = (Number(i.id) || idx + 1) * 37 + idx * 19;
      const pseudoX = 16 + (seed % 68);
      const pseudoY = 16 + ((seed * 7) % 68);

      return {
        ...i,
        x: pseudoX,
        y: pseudoY,
      };
    });
  }, [issues]);

  // Operational Filtering: Exclude resolved issues by default for active grid map & heatmap
  const displayedIssues = useMemo(() => {
    return mappedIssues.filter((i) => {
      if (!showResolved && i.status === "resolved") {
        return false;
      }
      return true;
    });
  }, [mappedIssues, showResolved]);

  const visible = useMemo(
    () => displayedIssues.filter((i) => filter === "all" || i.severity === filter),
    [displayedIssues, filter]
  );

  return (
    <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] overflow-hidden shadow-2xl">
      {/* Top Map Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2C2A25] px-5 py-3.5 bg-[#121415]">
        <div className="flex items-center gap-2">
          <Crosshair size={16} className="text-[#F4B52C]" />
          <span className="text-[13px] font-semibold text-[#F3F0E8]">
            GIS Infrastructure Grid
          </span>
          {!loading && (
            <span className="text-[11px] font-mono text-[#8D918F] bg-[#1C1F21] px-2 py-0.5 rounded border border-[#2C2A25]">
              {visible.length} Plotted Asset{visible.length === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Severity Filter Pills */}
          <div className="flex items-center gap-1 p-0.5 rounded-lg bg-[#151718] border border-[#2C2A25]">
            {severityFilters.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`focus-ring text-[11px] font-mono uppercase tracking-wider rounded px-2.5 py-1 transition-colors cursor-pointer ${
                  filter === f
                    ? "bg-[#1C1F21] text-[#F4B52C] border border-[#F4B52C]/30 font-semibold"
                    : "text-[#8D918F] hover:text-[#F3F0E8] border border-transparent"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {/* Active vs All Scope Filter Toggle */}
          <button
            type="button"
            onClick={() => setShowResolved((prev) => !prev)}
            aria-pressed={showResolved}
            className={`focus-ring inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider rounded-lg px-2.5 py-1.5 border transition-all cursor-pointer ${
              showResolved
                ? "border-[#4C7A5E]/50 bg-[#4C7A5E]/15 text-[#4C7A5E] font-bold"
                : "border-[#2C2A25] bg-[#151718] text-[#8D918F] hover:text-[#F3F0E8]"
            }`}
          >
            <Filter size={13} className={showResolved ? "text-[#4C7A5E]" : "text-[#8D918F]"} />
            <span>Scope: {showResolved ? "All Records" : "Active Only"}</span>
          </button>

          {/* Heatmap Toggle Button */}
          <button
            type="button"
            onClick={() => setHeatmap((prev) => !prev)}
            aria-pressed={heatmap}
            className={`focus-ring inline-flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider rounded-lg px-3 py-1.5 border transition-all cursor-pointer ${
              heatmap
                ? "border-[#F4B52C]/50 bg-[#F4B52C]/15 text-[#F4B52C] shadow-sm shadow-[#F4B52C]/10 font-bold"
                : "border-[#2C2A25] bg-[#151718] text-[#8D918F] hover:text-[#F3F0E8]"
            }`}
          >
            <Flame size={14} className={heatmap ? "text-[#F4B52C]" : "text-[#8D918F]"} />
            <span>Heatmap: {heatmap ? "ON" : "OFF"}</span>
          </button>
        </div>
      </div>

      {/* Map Interactive Canvas */}
      <div
        className="relative bg-[#0D0F10] overflow-hidden select-none"
        style={{ height }}
        onClick={() => setSelected(null)}
      >
        {/* Engineering GIS Grid Background */}
        <div
          className="absolute inset-0 opacity-25 pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(#2C2A25 1px, transparent 1px), linear-gradient(90deg, #2C2A25 1px, transparent 1px)",
            backgroundSize: "44px 44px",
          }}
        />

        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#0D0F10]/80 z-20">
            <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-[#151718] border border-[#F4B52C]/40 text-[#F4B52C] font-mono text-[12px] font-semibold tracking-wider animate-pulse">
              <RefreshCw size={14} className="animate-spin" />
              <span>FETCHING GEOSPATIAL ASSET DATA…</span>
            </div>
          </div>
        )}

        {/* Error Overlay */}
        {!loading && error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0D0F10]/90 z-20 text-center">
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

        {/* Empty State when no active issues remain */}
        {!loading && !error && displayedIssues.length === 0 && issues.length > 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0D0F10]/90 z-20 text-center">
            <CheckCircle2 size={32} className="text-[#4C7A5E] mb-2 opacity-80" />
            <p className="text-[14px] font-semibold text-[#F3F0E8] mb-1">
              All Reported Issues Are Currently Resolved
            </p>
            <p className="text-[12.5px] text-[#8D918F] max-w-xs mb-3">
              No active unresolved infrastructure hazards are currently open on the operational grid.
            </p>
            <button
              type="button"
              onClick={() => setShowResolved(true)}
              className="focus-ring text-[11px] font-mono text-[#F4B52C] hover:underline cursor-pointer"
            >
              Show Resolved History ({issues.length} total)
            </button>
          </div>
        )}

        {/* Empty State when no issues exist at all */}
        {!loading && !error && issues.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-[#0D0F10]/90 z-20 text-center">
            <Crosshair size={28} className="text-[#8D918F] mb-2 opacity-50" />
            <p className="text-[14px] font-semibold text-[#F3F0E8] mb-1">
              No Plotted Infrastructure Assets
            </p>
            <p className="text-[12.5px] text-[#8D918F] max-w-xs">
              No civic issues recorded in the current municipal index.
            </p>
          </div>
        )}

        {/* High-Contrast Multi-Stop Heatmap Density Layer (Active Issues Only) */}
        {!loading && !error && heatmap && visible.length > 0 && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden transition-opacity duration-300">
            {visible.map((i) => {
              const baseColor =
                i.severity === "critical"
                  ? "#B23A2C"
                  : i.severity === "high"
                  ? "#C88A2A"
                  : i.severity === "medium"
                  ? "#F4B52C"
                  : "#4C7A5E";

              const size =
                i.severity === "critical" ? 240 : i.severity === "high" ? 190 : 150;

              return (
                <div
                  key={`heat-${i.id}`}
                  className="absolute rounded-full"
                  style={{
                    left: `${i.x}%`,
                    top: `${i.y}%`,
                    width: `${size}px`,
                    height: `${size}px`,
                    transform: "translate(-50%, -50%)",
                    background: `radial-gradient(circle, ${baseColor}B3 0%, ${baseColor}66 30%, ${baseColor}26 55%, transparent 75%)`,
                    filter: "blur(22px)",
                    mixBlendMode: "screen",
                    opacity: 0.8,
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Interactive Asset Pins (Active Issues Only) */}
        {!loading &&
          !error &&
          visible.map((i) => {
            const isCritical = i.severity === "critical";
            const isHovered = hovered?.id === i.id;
            const isSelected = selected?.id === i.id;

            const pinColor =
              i.severity === "critical"
                ? "#B23A2C"
                : i.severity === "high"
                ? "#C88A2A"
                : i.severity === "medium"
                ? "#F4B52C"
                : "#4C7A5E";

            return (
              <div
                key={i.id}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelected(i);
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10 cursor-pointer group"
                style={{ left: `${i.x}%`, top: `${i.y}%` }}
              >
                {/* Critical Pulse Ring */}
                {isCritical && (
                  <span
                    className="absolute inset-0 rounded-full animate-ping opacity-50 pointer-events-none"
                    style={{ backgroundColor: pinColor }}
                  />
                )}

                <div
                  className={`h-4 w-4 rounded-full border-2 transition-all flex items-center justify-center ${
                    isSelected
                      ? "ring-4 ring-[#F4B52C]/60 scale-125 shadow-xl"
                      : isHovered
                      ? "scale-125 shadow-lg"
                      : ""
                  }`}
                  style={{
                    backgroundColor: pinColor,
                    borderColor: "#0D0F10",
                  }}
                >
                  <span className="h-1 w-1 rounded-full bg-white" />
                </div>
              </div>
            );
          })}

        {/* Hover Tooltip (if not clicked) */}
        {hovered && !selected && (
          <div
            className="absolute z-30 rounded-xl border border-[#2C2A25] bg-[#151718]/95 backdrop-blur-md px-3.5 py-2.5 text-[12px] pointer-events-none shadow-2xl max-w-xs"
            style={{
              left: `${hovered.x}%`,
              top: `${hovered.y}%`,
              transform: "translate(-50%, -120%)",
            }}
          >
            <div className="font-semibold text-[#F3F0E8] truncate mb-0.5">
              {hovered.title}
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#8D918F]">
              <span>{hovered.ward}</span>
              <span>•</span>
              <span className="text-[#F4B52C]">Score: P-{hovered.priorityScore}</span>
            </div>
          </div>
        )}

        {/* Selected Asset Modal Card (Fixed on Map Bottom-Right) */}
        {selected && (
          <div
            className="absolute right-4 bottom-4 z-40 max-w-sm w-full rounded-xl border border-[#F4B52C]/40 bg-[#151718]/95 backdrop-blur-md p-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-mono text-[11px] font-bold text-[#F4B52C] bg-[#F4B52C]/10 border border-[#F4B52C]/30 px-2 py-0.5 rounded">
                ISSUE #{selected.id}
              </span>
              {selected.severity && <SeverityBadge severity={selected.severity} />}
            </div>

            <h4 className="text-[14px] font-bold text-[#F3F0E8] mb-1 leading-snug">
              {selected.title}
            </h4>

            <div className="flex items-center gap-2 text-[12px] text-[#8D918F] mb-3">
              <MapPin size={12} className="text-[#F4B52C]" />
              <span>{selected.ward || "Unassigned"}</span>
              {selected.department && <span>• {selected.department}</span>}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#2C2A25]">
              <div className="text-[11.5px] font-mono text-[#8D918F]">
                Priority: <strong className="text-[#F3F0E8]">P-{selected.priorityScore}</strong>
              </div>

              <Link
                href={`/authority/issues/${selected.id}`}
                className="focus-ring inline-flex items-center gap-1 text-[12px] font-mono text-[#F4B52C] hover:underline"
              >
                <span>Open Intelligence</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        )}

        {/* Bottom-Left Map Legend */}
        <div className="absolute left-4 bottom-4 rounded-xl border border-[#2C2A25] bg-[#151718]/90 backdrop-blur-md px-3.5 py-2.5 text-[11px] font-mono space-y-1.5 z-20 shadow-xl">
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
        </div>
      </div>
    </div>
  );
}
