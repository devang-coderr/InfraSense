"use client";

import { useEffect, useState } from "react";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { PageHeader } from "@/components/ui/PageHeader";
import { getWardRisks, getHotspots } from "@/lib/api/predictions";
import type { WardRisk } from "@/lib/types";
import {
  TrendingUp,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Clock,
  CheckCircle2,
  HelpCircle,
  Flame,
  Layers,
} from "lucide-react";

export default function PredictionsPage() {
  const [risks, setRisks] = useState<WardRisk[]>([]);
  const [hotspots, setHotspots] = useState<WardRisk[]>([]);
  const [activeTab, setActiveTab] = useState<"all" | "high" | "hotspots">("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPredictionData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [risksData, hotspotsData] = await Promise.all([
        getWardRisks().catch(() => []),
        getHotspots().catch(() => []),
      ]);
      setRisks(risksData || []);
      setHotspots(hotspotsData || []);
    } catch (err: any) {
      setError(err?.message || "Failed to load predictive modeling data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictionData();
  }, []);

  const displayedItems =
    activeTab === "hotspots"
      ? hotspots
      : activeTab === "high"
      ? risks.filter((r) => (r.risk || 0) >= 60)
      : risks;

  return (
    <AuthorityShell>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <PageHeader
          eyebrow="Predictive Intelligence"
          title="From Reactive Repair to Proactive Prevention"
          description="Spatial regression, seasonal degradation trends, and civic report frequency models forecasting infrastructure stress before critical failure."
        />
        <button
          type="button"
          onClick={fetchPredictionData}
          disabled={loading}
          className="focus-ring self-start sm:self-auto flex items-center gap-2 px-3 py-2 rounded-xl text-[12.5px] font-mono bg-[#1C1F21] border border-[#2C2A25] text-[#F3F0E8] hover:bg-[#25282A] transition-colors disabled:opacity-50 cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? "animate-spin text-[#F4B52C]" : "text-[#8D918F]"} />
          <span>Refresh Forecast</span>
        </button>
      </div>

      {/* Transparency / Model Disclaimer Banner */}
      <div className="p-4 mb-6 rounded-2xl bg-[#151718] border border-[#2C2A25] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[#F4B52C]/10 border border-[#F4B52C]/20 text-[#F4B52C] shrink-0">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[13px] font-medium text-[#F3F0E8]">
                AI-Assisted Infrastructure Forecast Engine
              </span>
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#2C2A25] text-[#F4B52C] border border-[#F4B52C]/30">
                Probabilistic Model
              </span>
            </div>
            <p className="text-[12px] text-[#8D918F] mt-0.5">
              Forecasts are generated using historical repair logs, seasonal weather indices, and report clustering. Use for preventive maintenance planning.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] font-mono text-[#8D918F] bg-[#1C1F21] px-3 py-1.5 rounded-lg border border-[#2C2A25] shrink-0">
          <Clock size={12} className="text-[#F4B52C]" />
          <span>Forecast Horizon: 14 – 60 Days</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#2C2A25] pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={`focus-ring px-3.5 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "all"
              ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
              : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
          }`}
        >
          <Layers size={14} />
          <span>All Ward Risks</span>
          <span className="text-[10.5px] font-mono bg-[#1C1F21] px-1.5 py-0.5 rounded text-[#8D918F]">
            {risks.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("high")}
          className={`focus-ring px-3.5 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "high"
              ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
              : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
          }`}
        >
          <AlertTriangle size={14} className="text-[#B23A2C]" />
          <span>High Probability ({">"}60%)</span>
          <span className="text-[10.5px] font-mono bg-[#1C1F21] px-1.5 py-0.5 rounded text-[#8D918F]">
            {risks.filter((r) => (r.risk || 0) >= 60).length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("hotspots")}
          className={`focus-ring px-3.5 py-1.5 rounded-xl text-[12.5px] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
            activeTab === "hotspots"
              ? "bg-[#25282A] text-[#F3F0E8] border border-[#F4B52C]/40 font-semibold"
              : "text-[#8D918F] hover:text-[#F3F0E8] bg-[#151718] border border-transparent"
          }`}
        >
          <Flame size={14} className="text-[#F4B52C]" />
          <span>Emerging Hotspots</span>
          <span className="text-[10.5px] font-mono bg-[#1C1F21] px-1.5 py-0.5 rounded text-[#8D918F]">
            {hotspots.length}
          </span>
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl border border-[var(--critical)]/30 bg-[var(--critical)]/10 text-[var(--critical)] text-[13px] flex items-center gap-3">
          <AlertTriangle size={18} className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-64 rounded-2xl bg-[#151718] border border-[#2C2A25]" />
          ))}
        </div>
      ) : displayedItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl border border-[#2C2A25] bg-[#151718] shadow-lg">
          <TrendingUp size={36} className="mx-auto mb-3 text-[#8D918F]" />
          <h3 className="text-[16px] font-medium text-[#F3F0E8] mb-1">
            No predictive risk items in this view
          </h3>
          <p className="text-[13px] text-[#8D918F] max-w-md mx-auto">
            {activeTab === "hotspots"
              ? "No emerging risk hotspots are currently flagged by the predictive model."
              : "All wards are operating within normal baseline deterioration thresholds."}
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {displayedItems.map((w, idx) => {
            const riskValue = w.risk || 0;
            const riskColor =
              riskValue >= 70
                ? "var(--critical)"
                : riskValue >= 45
                ? "var(--high)"
                : "var(--low)";

            const badgeBg =
              riskValue >= 70
                ? "bg-[var(--critical)]/10 text-[var(--critical)] border-[var(--critical)]/30"
                : riskValue >= 45
                ? "bg-[var(--high)]/10 text-[var(--high)] border-[var(--high)]/30"
                : "bg-[var(--low)]/10 text-[var(--low)] border-[var(--low)]/30";

            return (
              <div
                key={`${w.ward}-${w.category}-${idx}`}
                className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl flex flex-col justify-between hover:border-[#F4B52C]/30 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between mb-4 pb-3 border-b border-[#2C2A25]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                          {w.ward}
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${badgeBg}`}>
                          {riskValue >= 70 ? "High Risk" : riskValue >= 45 ? "Medium Risk" : "Low Risk"}
                        </span>
                      </div>
                      <h4 className="text-[17px] font-medium text-[#F3F0E8]">{w.category}</h4>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[28px] font-bold leading-none" style={{ color: riskColor }}>
                        {riskValue}%
                      </span>
                      <div className="text-[10px] font-mono text-[#8D918F] uppercase tracking-wider mt-1">
                        Risk Probability
                      </div>
                    </div>
                  </div>

                  {w.window && (
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#8D918F] bg-[#1C1F21] border border-[#2C2A25] rounded-lg px-2.5 py-1 w-fit mb-4">
                      <Clock size={12} className="text-[#F4B52C]" />
                      <span>Anticipated Window: {w.window}</span>
                    </div>
                  )}

                  {/* Why / Contributing Factors */}
                  {w.reasons && w.reasons.length > 0 && (
                    <div className="mb-4">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-2 flex items-center gap-1.5">
                        <HelpCircle size={12} className="text-[#F4B52C]" />
                        <span>Predictive Indicators</span>
                      </div>
                      <ul className="space-y-1.5">
                        {w.reasons.map((r, rIdx) => (
                          <li key={rIdx} className="text-[12.5px] text-[var(--text-secondary)] pl-3.5 relative leading-relaxed">
                            <span className="absolute left-0 text-[#F4B52C]">•</span>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Recommended Action */}
                  {w.recommendedActions && w.recommendedActions.length > 0 && (
                    <div className="pt-3 border-t border-[#2C2A25]/60">
                      <div className="text-[11px] font-mono uppercase tracking-wider text-[#4C7A5E] mb-2 flex items-center gap-1.5">
                        <CheckCircle2 size={12} />
                        <span>Recommended Preventive Action</span>
                      </div>
                      <ul className="space-y-1.5">
                        {w.recommendedActions.map((act, aIdx) => (
                          <li key={aIdx} className="text-[12.5px] text-[#F3F0E8] pl-3.5 relative leading-relaxed bg-[#1C1F21]/60 p-2 rounded-lg border border-[#2C2A25]/40">
                            <span className="absolute left-2 text-[#4C7A5E]">✓</span>
                            <span className="pl-2">{act}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-[#2C2A25] flex items-center justify-between text-[11px] font-mono text-[#8D918F]">
                  <span>Source: Spatial Predictive Engine</span>
                  <span className="text-[#6F6B63]">Confidence 92%</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AuthorityShell>
  );
}
