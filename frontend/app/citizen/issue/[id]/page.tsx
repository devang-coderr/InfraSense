"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Layers,
  Sparkles,
  Building2,
  FileText,
  Navigation,
  Camera,
  ImageOff,
  Maximize2,
  X,
} from "lucide-react";
import { getIssue } from "@/lib/api/issues";
import { ApiError, getMediaUrl } from "@/lib/api/client";
import { SeverityBadge, StatusPill, ScoreBar } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import type { Issue, IssueStatus } from "@/lib/types";

interface StatusStep {
  key: IssueStatus;
  label: string;
  description: string;
}

const statusSteps: StatusStep[] = [
  {
    key: "reported",
    label: "Report Submitted",
    description: "Citizen logged issue with photo and GPS location coordinates.",
  },
  {
    key: "ai_verified",
    label: "AI Diagnostic Verification",
    description: "Computer vision assessed defect category, severity, and duplicates.",
  },
  {
    key: "assigned",
    label: "Department Assigned",
    description: "Routed to responsible municipal department for work scheduling.",
  },
  {
    key: "in_progress",
    label: "Field Work in Progress",
    description: "Technician work crew dispatched to site for physical repair.",
  },
  {
    key: "resolved",
    label: "Resolution Completed",
    description: "Repairs finalized and verified by municipal authority.",
  },
];

const statusTone: Record<IssueStatus, "neutral" | "accent" | "high" | "low"> = {
  reported: "neutral",
  ai_verified: "accent",
  assigned: "high",
  in_progress: "high",
  resolved: "low",
};

export default function CitizenIssuePage() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);

  const fetchIssue = useCallback(async () => {
    if (!id) {
      setError("Invalid issue identifier.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setImageError(false);
    try {
      const data = await getIssue(id);
      setIssue(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not retrieve the requested infrastructure issue details."
      );
      setIssue(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIssue();
  }, [fetchIssue]);

  const order: IssueStatus[] = ["reported", "ai_verified", "assigned", "in_progress", "resolved"];
  const currentIdx = issue ? order.indexOf(issue.status) : -1;

  // Resolve API-provided media/image URL if returned by backend
  const rawEvidenceUrl =
    issue?.media_url ||
    issue?.image_url ||
    issue?.file_url ||
    issue?.imageUrl ||
    issue?.mediaUrl ||
    null;
  const evidenceUrl = getMediaUrl(rawEvidenceUrl);

  return (
    <div className="min-h-screen bg-[#0D0F10] text-[#F3F0E8] pt-24 sm:pt-28 pb-24">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Back Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/citizen/reports"
            className="focus-ring inline-flex items-center gap-1.5 text-[12.5px] font-mono text-[#8D918F] hover:text-[#F4B52C] transition-colors"
          >
            <ArrowLeft size={14} />
            <span>Back to My Reports</span>
          </Link>

          <Link
            href="/citizen"
            className="focus-ring text-[12px] font-mono text-[#8D918F] hover:text-[#F3F0E8] transition-colors"
          >
            Citizen Dashboard
          </Link>
        </div>

        {/* Loading State Skeleton */}
        {loading && (
          <div className="space-y-6 animate-pulse">
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="h-4 w-24 bg-[#2C2A25] rounded" />
                <div className="h-6 w-24 bg-[#2C2A25] rounded-full" />
              </div>
              <div className="h-8 w-3/4 bg-[#2C2A25] rounded mb-3" />
              <div className="h-4 w-1/2 bg-[#2C2A25] rounded" />
            </div>
            <div className="grid md:grid-cols-12 gap-6">
              <div className="md:col-span-7 h-64 bg-[#151718] border border-[#2C2A25] rounded-2xl" />
              <div className="md:col-span-5 h-64 bg-[#151718] border border-[#2C2A25] rounded-2xl" />
            </div>
          </div>
        )}

        {/* Error / Not Found State */}
        {!loading && (error || !issue) && (
          <div className="rounded-2xl border border-[#B23A2C]/30 bg-[#151718] p-8 sm:p-12 text-center max-w-lg mx-auto">
            <div className="h-12 w-12 rounded-2xl bg-[#B23A2C]/10 text-[#B23A2C] mx-auto flex items-center justify-center mb-4">
              <AlertCircle size={24} />
            </div>
            <h2 className="text-xl font-bold text-[#F3F0E8] mb-2">Issue Record Not Found</h2>
            <p className="text-[13.5px] text-[#8D918F] mb-6" role="alert">
              {error || "The requested infrastructure report could not be found or has been removed."}
            </p>
            <div className="flex justify-center gap-3">
              {id && (
                <Button onClick={fetchIssue} variant="secondary" size="sm" className="gap-1.5">
                  <RefreshCw size={14} />
                  <span>Retry</span>
                </Button>
              )}
              <Button href="/citizen/reports" size="sm">
                Back to Reports
              </Button>
            </div>
          </div>
        )}

        {/* Issue Details Content */}
        {!loading && !error && issue && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-[#2C2A25]">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono text-[12px] font-bold text-[#F4B52C] bg-[#F4B52C]/10 border border-[#F4B52C]/30 px-2.5 py-1 rounded-md">
                    REPORT #{issue.id}
                  </span>
                  <StatusPill tone={statusTone[issue.status] || "neutral"} size="md">
                    {issue.status.replace("_", " ")}
                  </StatusPill>
                  {issue.severity && <SeverityBadge severity={issue.severity} />}
                </div>

                <div className="flex items-center gap-2 text-[12px] font-mono text-[#8D918F]">
                  <Clock size={13} />
                  <span>Reported {issue.reportedAt}</span>
                </div>
              </div>

              <h1 className="text-2xl sm:text-3xl font-bold text-[#F3F0E8] tracking-tight mb-2">
                {issue.title}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-[#8D918F]">
                {issue.ward && (
                  <span className="flex items-center gap-1.5">
                    <MapPin size={14} className="text-[#F4B52C]" />
                    <span className="text-[#F3F0E8]">{issue.ward}</span>
                  </span>
                )}
                {issue.category && <span>• Category: <strong className="text-[#F3F0E8] font-medium">{issue.category}</strong></span>}
                {issue.department && (
                  <span className="flex items-center gap-1.5">
                    • <Building2 size={13} />
                    <span>Department: <strong className="text-[#F3F0E8] font-medium">{issue.department}</strong></span>
                  </span>
                )}
              </div>
            </div>

            {/* Two-Column Grid */}
            <div className="grid md:grid-cols-12 gap-6 items-start">
              {/* Left Column: Evidence, Description & Metadata */}
              <div className="md:col-span-7 space-y-6">
                {/* Uploaded Photo Evidence Section */}
                <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6">
                  <div className="flex items-center justify-between mb-3.5">
                    <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold flex items-center gap-1.5">
                      <Camera size={14} />
                      <span>Original Photo Evidence</span>
                    </h3>
                    {evidenceUrl && !imageError && (
                      <span className="text-[11px] font-mono text-[#8D918F] bg-[#1C1F21] px-2 py-0.5 rounded border border-[#2C2A25]">
                        Citizen Submission
                      </span>
                    )}
                  </div>

                  {evidenceUrl && !imageError ? (
                    <div className="space-y-3">
                      <div className="relative rounded-xl overflow-hidden border border-[#2C2A25] bg-[#121415] max-h-[360px] group">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={evidenceUrl}
                          alt={`Uploaded evidence for issue #${issue.id} - ${issue.title}`}
                          className="w-full h-auto max-h-[340px] object-cover sm:object-contain mx-auto transition-transform group-hover:scale-[1.01]"
                          onError={() => setImageError(true)}
                        />
                        <button
                          type="button"
                          onClick={() => setLightboxOpen(true)}
                          className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#0D0F10]/80 text-[#F3F0E8] border border-[#2C2A25] backdrop-blur-sm hover:bg-[#151718] transition-colors cursor-pointer"
                        >
                          <Maximize2 size={12} />
                          <span>Expand</span>
                        </button>
                      </div>
                      <p className="text-[11.5px] text-[#8D918F] leading-relaxed">
                        Photographic evidence submitted at the time of report creation.
                      </p>
                    </div>
                  ) : imageError ? (
                    <div className="p-6 rounded-xl bg-[#121415] border border-[#B23A2C]/30 text-center">
                      <ImageOff size={24} className="text-[#B23A2C] mx-auto mb-2" />
                      <div className="text-[13px] font-medium text-[#F4F1E8] mb-1">
                        Unable to Load Evidence Image
                      </div>
                      <p className="text-[12px] text-[#8D918F] max-w-sm mx-auto">
                        The image file could not be retrieved from the media storage endpoint.
                      </p>
                    </div>
                  ) : (
                    <div className="p-6 rounded-xl bg-[#121415] border border-[#2C2A25] text-center">
                      <Camera size={24} className="text-[#8D918F] mx-auto mb-2 opacity-60" />
                      <div className="text-[13px] font-medium text-[#F3F0E8] mb-1">
                        Original Photo Unavailable
                      </div>
                      <p className="text-[12px] text-[#8D918F] max-w-sm mx-auto leading-relaxed">
                        Original photo unavailable from the current API response.
                      </p>
                    </div>
                  )}
                </div>

                {/* Description Card */}
                <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6">
                  <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold mb-3 flex items-center gap-1.5">
                    <FileText size={14} />
                    <span>Problem Description</span>
                  </h3>
                  <p className="text-[14px] text-[#F3F0E8] leading-relaxed whitespace-pre-wrap">
                    {issue.description || "No written description provided by the reporting citizen."}
                  </p>
                </div>

                {/* Geolocation & Dispatch Details */}
                <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6">
                  <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold mb-3 flex items-center gap-1.5">
                    <Navigation size={14} />
                    <span>Location & GIS Coordinates</span>
                  </h3>

                  <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
                    <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                      <div className="text-[11px] text-[#8D918F] mb-1">Municipal Ward</div>
                      <div className="font-medium text-[#F3F0E8]">{issue.ward || "Unassigned Zone"}</div>
                    </div>

                    <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                      <div className="text-[11px] text-[#8D918F] mb-1">GPS Coordinates</div>
                      <div className="font-mono text-[#F3F0E8] text-[12px]">
                        {issue.lat && issue.lng
                          ? `${issue.lat.toFixed(5)}, ${issue.lng.toFixed(5)}`
                          : "Location coordinates on file"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Photo Evidence Assessment */}
                {issue.imageDescription && (
                  <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6">
                    <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold mb-3 flex items-center gap-1.5">
                      <Sparkles size={14} />
                      <span>Photo Evidence Assessment</span>
                    </h3>
                    <div className="p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25] text-[13px] text-[#8D918F] leading-relaxed">
                      {issue.imageDescription}
                    </div>
                  </div>
                )}

                {/* Clustered Reports Notice */}
                {typeof issue.duplicateCount === "number" && issue.duplicateCount > 0 && (
                  <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-5 flex items-start gap-3.5">
                    <div className="h-9 w-9 rounded-xl bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] flex items-center justify-center shrink-0">
                      <Layers size={18} />
                    </div>
                    <div>
                      <h4 className="text-[13.5px] font-semibold text-[#F3F0E8] mb-0.5">
                        Community Clustered Report
                      </h4>
                      <p className="text-[12.5px] text-[#8D918F] leading-relaxed">
                        {issue.duplicateCount === 1
                          ? "1 additional nearby citizen submission was merged into this issue to accelerate municipal repair dispatch."
                          : `${issue.duplicateCount} additional nearby citizen submissions were merged into this issue to accelerate municipal repair dispatch.`}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Resolution Lifecycle & AI Diagnostics */}
              <div className="md:col-span-5 space-y-6">
                {/* Resolution Progress Timeline */}
                <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
                    <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                      Resolution Lifecycle
                    </h3>
                    <span className="text-[11px] font-mono text-[#8D918F]">
                      Stage {currentIdx + 1} of 5
                    </span>
                  </div>

                  <div className="space-y-4">
                    {statusSteps.map((step, idx) => {
                      const isCompleted = idx < currentIdx;
                      const isCurrent = idx === currentIdx;

                      return (
                        <div key={step.key} className="flex items-start gap-3">
                          <div className="flex flex-col items-center mt-0.5">
                            {isCompleted ? (
                              <div className="h-5 w-5 rounded-full bg-[#4C7A5E] text-white flex items-center justify-center">
                                <CheckCircle2 size={13} />
                              </div>
                            ) : isCurrent ? (
                              <div className="h-5 w-5 rounded-full bg-[#F4B52C] text-[#0D0F10] flex items-center justify-center font-bold text-[10px]">
                                ●
                              </div>
                            ) : (
                              <div className="h-5 w-5 rounded-full border border-[#2C2A25] bg-[#1C1F21] text-[#8D918F] flex items-center justify-center text-[10px]">
                                {idx + 1}
                              </div>
                            )}

                            {idx < statusSteps.length - 1 && (
                              <div
                                className={`w-0.5 h-8 my-1 transition-colors ${
                                  idx < currentIdx ? "bg-[#4C7A5E]" : "bg-[#2C2A25]"
                                }`}
                              />
                            )}
                          </div>

                          <div className="flex-1 pb-1">
                            <div
                              className={`text-[13px] font-semibold ${
                                isCurrent
                                  ? "text-[#F4B52C]"
                                  : isCompleted
                                  ? "text-[#F3F0E8]"
                                  : "text-[#8D918F]"
                              }`}
                            >
                              {step.label}
                            </div>
                            <p className="text-[11.5px] text-[#8D918F] mt-0.5 leading-relaxed">
                              {step.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* AI Diagnostic Assessment Card */}
                {(typeof issue.confidence === "number" ||
                  typeof issue.severityScore === "number" ||
                  (issue.severityFactors && issue.severityFactors.length > 0)) && (
                  <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#2C2A25]">
                      <div className="flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                        <ShieldCheck size={15} />
                        <span>AI Diagnostic Metrics</span>
                      </div>
                      <span className="text-[10px] font-mono text-[#8D918F] bg-[#1C1F21] px-2 py-0.5 rounded border border-[#2C2A25]">
                        Automated Analysis
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {typeof issue.confidence === "number" && (
                        <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                          <div className="text-[11px] text-[#8D918F] mb-0.5">Classification Confidence</div>
                          <div className="font-mono text-lg font-bold text-[#F4B52C]">
                            {issue.confidence}%
                          </div>
                        </div>
                      )}

                      {typeof issue.severityScore === "number" && (
                        <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                          <div className="text-[11px] text-[#8D918F] mb-0.5">Severity Score</div>
                          <div className="font-mono text-lg font-bold text-[#F3F0E8]">
                            {issue.severityScore}/100
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Severity Factors Breakdown */}
                    {issue.severityFactors && issue.severityFactors.length > 0 && (
                      <div className="pt-2 border-t border-[#2C2A25]">
                        <div className="text-[11.5px] font-mono uppercase tracking-wider text-[#8D918F] mb-3">
                          Severity Breakdown Factors
                        </div>
                        <div className="space-y-2.5">
                          {issue.severityFactors.map((factor) => (
                            <ScoreBar
                              key={factor.label}
                              label={factor.label}
                              score={factor.score}
                              max={factor.max}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Lightbox Modal for Expanded Photo Evidence */}
        {lightboxOpen && evidenceUrl && (
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Expanded photo evidence preview"
            className="fixed inset-0 z-50 bg-[#0D0F10]/95 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightboxOpen(false)}
          >
            <div
              className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                className="absolute -top-12 right-0 p-2 text-[#8D918F] hover:text-[#F3F0E8] transition-colors cursor-pointer"
                aria-label="Close expanded view"
              >
                <X size={24} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evidenceUrl}
                alt={`Expanded evidence for issue #${issue?.id}`}
                className="max-h-[80vh] w-auto max-w-full rounded-xl border border-[#2C2A25] object-contain shadow-2xl"
              />
              <div className="mt-3 text-center text-[12.5px] font-mono text-[#8D918F]">
                Report #{issue?.id} • {issue?.title} ({issue?.ward})
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
