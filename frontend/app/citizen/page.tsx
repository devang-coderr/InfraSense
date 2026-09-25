"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  ListChecks,
  ShieldCheck,
  Wrench,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Clock,
  Sparkles,
  RefreshCw,
  FileText,
  MapPin,
  ChevronRight,
} from "lucide-react";
import heroImg from "@/Resources/images/img4hero.jpeg";
import { getIssues } from "@/lib/api/issues";
import { ApiError } from "@/lib/api/client";
import { useAuth } from "@/lib/useAuth";
import { CitizenUserMenu } from "@/components/citizen/CitizenUserMenu";
import { Button } from "@/components/ui/Button";
import { SeverityBadge, StatusPill } from "@/components/ui/Primitives";
import type { Issue, IssueStatus } from "@/lib/types";

export default function CitizenDashboardPage() {
  const { user, loading: authLoading, logout } = useAuth();
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getIssues({ mine: true });
      setIssues(data);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load your infrastructure reports. Please verify your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Genuine computed metrics from API data
  const totalCount = issues.length;
  const underReviewCount = issues.filter(
    (i) => i.status === "reported" || i.status === "ai_verified"
  ).length;
  const inProgressCount = issues.filter(
    (i) => i.status === "assigned" || i.status === "in_progress"
  ).length;
  const resolvedCount = issues.filter((i) => i.status === "resolved").length;

  const recentReports = issues.slice(0, 4);

  const greeting = user?.name
    ? `Welcome back, ${user.name}`
    : "Citizen Portal";

  return (
    <div className="min-h-screen bg-[#0D0F10] text-[#F3F0E8] pt-24 sm:pt-28 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Header / Portal Status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-[#2C2A25]">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#F4B52C]/10 border border-[#F4B52C]/30 text-[#F4B52C] font-mono text-[10.5px] uppercase tracking-wider font-semibold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] animate-pulse" />
                Citizen Intelligence Portal
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#F3F0E8]">
              {greeting}
            </h1>
            <p className="text-[13.5px] text-[#8D918F] mt-1">
              Report, track, and verify public infrastructure conditions across your municipality.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-center">
            <CitizenUserMenu
              user={user}
              loading={authLoading}
              onLogout={() => logout("citizen")}
            />
          </div>
        </div>

        {/* Hero Reporting Banner */}
        <div className="relative rounded-2xl border border-[#2C2A25] bg-[#151718] overflow-hidden mb-10 shadow-xl">
          {/* Subtle background infrastructure imagery with dark gradient overlay */}
          <div className="absolute inset-0 z-0">
            <Image
              src={heroImg}
              alt="Civic Infrastructure"
              fill
              priority
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-cover object-center opacity-25 filter grayscale-[30%]"
            />
            <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-[#151718] via-[#151718]/90 to-[#151718]/60" />
          </div>

          <div className="relative z-10 p-6 sm:p-8 lg:p-10 max-w-2xl">
            <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#F4B52C] mb-3">
              <Sparkles size={14} className="text-[#F4B52C]" />
              <span>Report • Understand • Track</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#F3F0E8] leading-tight mb-3">
              Spotted damaged public infrastructure?
            </h2>
            <p className="text-[14px] sm:text-[15px] text-[#8D918F] leading-relaxed mb-6">
              Take a photo of potholes, broken lighting, drainage failures, or hazardous sidewalks. Our AI classifies severity and directly alerts municipal engineering teams.
            </p>

            <div className="flex flex-wrap items-center gap-3.5">
              <Button
                href="/citizen/report"
                variant="primary"
                size="lg"
                className="gap-2 shadow-lg shadow-[#F4B52C]/10"
              >
                <Camera size={18} />
                <span>Report an Issue</span>
              </Button>
              <Button
                href="/citizen/reports"
                variant="secondary"
                size="lg"
                className="gap-2"
              >
                <ListChecks size={18} />
                <span>View My Reports</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Summary Statistics Grid */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#8D918F]">
              Your Reporting Activity
            </h3>
            {issues.length > 0 && (
              <span className="text-[11.5px] font-mono text-[#8D918F]">
                {totalCount} Total Submissions
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
            {/* Total Reports */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#F4B52C]/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">Total Reports</span>
                <div className="h-8 w-8 rounded-lg bg-[#1C1F21] border border-[#2C2A25] flex items-center justify-center text-[#F4B52C]">
                  <FileText size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F3F0E8]">
                {loading ? <span className="text-base text-[#8D918F]">...</span> : totalCount}
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">Submitted by your account</div>
            </div>

            {/* Under Review */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#F4B52C]/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">Under Review</span>
                <div className="h-8 w-8 rounded-lg bg-[#1C1F21] border border-[#2C2A25] flex items-center justify-center text-[#F4B52C]">
                  <ShieldCheck size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F3F0E8]">
                {loading ? <span className="text-base text-[#8D918F]">...</span> : underReviewCount}
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">Reported & AI verified</div>
            </div>

            {/* In Progress */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#F4B52C]/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">In Resolution</span>
                <div className="h-8 w-8 rounded-lg bg-[#1C1F21] border border-[#2C2A25] flex items-center justify-center text-[#C88A2A]">
                  <Wrench size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F3F0E8]">
                {loading ? <span className="text-base text-[#8D918F]">...</span> : inProgressCount}
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">Assigned to field crews</div>
            </div>

            {/* Resolved */}
            <div className="rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#F4B52C]/40 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[12px] font-medium text-[#8D918F]">Resolved</span>
                <div className="h-8 w-8 rounded-lg bg-[#1C1F21] border border-[#2C2A25] flex items-center justify-center text-[#4C7A5E]">
                  <CheckCircle2 size={16} />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-bold text-[#F3F0E8]">
                {loading ? <span className="text-base text-[#8D918F]">...</span> : resolvedCount}
              </div>
              <div className="text-[11px] text-[#8D918F] mt-1">Completed civic repairs</div>
            </div>
          </div>
        </div>

        {/* Recent Submissions Section */}
        <div className="mb-14">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#F3F0E8]">
                Recent Reports
              </h3>
              <p className="text-[12.5px] text-[#8D918F]">
                Track real-time progress and verification stages of your reports
              </p>
            </div>
            {issues.length > 0 && (
              <Link
                href="/citizen/reports"
                className="focus-ring text-[12.5px] font-mono text-[#F4B52C] hover:text-[#F4B52C]/80 inline-flex items-center gap-1 transition-colors"
              >
                <span>View All ({totalCount})</span>
                <ChevronRight size={14} />
              </Link>
            )}
          </div>

          {/* Loading State */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div
                  key={n}
                  className="rounded-xl border border-[#2C2A25] bg-[#151718] p-5 animate-pulse"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="h-3 w-16 bg-[#2C2A25] rounded" />
                    <div className="h-5 w-24 bg-[#2C2A25] rounded-full" />
                  </div>
                  <div className="h-4 w-56 bg-[#2C2A25] rounded mb-3" />
                  <div className="h-2 w-full bg-[#2C2A25] rounded" />
                </div>
              ))}
            </div>
          )}

          {/* API Error State */}
          {!loading && error && (
            <div className="rounded-xl border border-[#B23A2C]/30 bg-[#151718] p-8 text-center">
              <div className="h-10 w-10 rounded-full bg-[#B23A2C]/10 text-[#B23A2C] mx-auto flex items-center justify-center mb-3">
                <AlertCircle size={20} />
              </div>
              <h4 className="text-[15px] font-semibold text-[#F3F0E8] mb-1">
                Unable to Retrieve Reports
              </h4>
              <p className="text-[13px] text-[#8D918F] max-w-md mx-auto mb-5">
                {error}
              </p>
              <Button
                onClick={fetchReports}
                variant="secondary"
                size="sm"
                className="gap-2"
              >
                <RefreshCw size={14} />
                <span>Try Again</span>
              </Button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && issues.length === 0 && (
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-8 sm:p-12 text-center">
              <div className="h-14 w-14 rounded-2xl bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] mx-auto flex items-center justify-center mb-4">
                <Camera size={26} />
              </div>
              <h4 className="text-[17px] font-semibold text-[#F3F0E8] mb-2">
                No Infrastructure Reports Yet
              </h4>
              <p className="text-[13.5px] text-[#8D918F] max-w-md mx-auto mb-6 leading-relaxed">
                You haven&apos;t submitted any civic issue reports. Help improve municipal infrastructure by reporting damaged assets in your neighborhood.
              </p>
              <Button href="/citizen/report" variant="primary" size="md" className="gap-2">
                <Camera size={16} />
                <span>Submit Your First Report</span>
              </Button>
            </div>
          )}

          {/* Issue Cards */}
          {!loading && !error && recentReports.length > 0 && (
            <div className="space-y-3">
              {recentReports.map((issue) => {
                const statusTone: Record<IssueStatus, "neutral" | "accent" | "high" | "low"> = {
                  reported: "neutral",
                  ai_verified: "accent",
                  assigned: "high",
                  in_progress: "high",
                  resolved: "low",
                };

                const order: IssueStatus[] = [
                  "reported",
                  "ai_verified",
                  "assigned",
                  "in_progress",
                  "resolved",
                ];
                const currentIdx = order.indexOf(issue.status);

                return (
                  <Link
                    key={issue.id}
                    href={`/citizen/issue/${issue.id}`}
                    className="focus-ring block rounded-xl border border-[#2C2A25] bg-[#151718] p-4 sm:p-5 hover:border-[#F4B52C]/50 hover:bg-[#1C1F21] transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-[11px] text-[#8D918F] bg-[#1C1F21] px-2 py-0.5 rounded border border-[#2C2A25]">
                          #{issue.id}
                        </span>
                        <StatusPill tone={statusTone[issue.status] || "neutral"} size="sm">
                          {issue.status.replace("_", " ")}
                        </StatusPill>
                        {issue.severity && (
                          <SeverityBadge severity={issue.severity} />
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 text-[11.5px] font-mono text-[#8D918F]">
                        <Clock size={12} />
                        <span>{issue.reportedAt}</span>
                      </div>
                    </div>

                    <div className="mb-3.5">
                      <h4 className="text-[14.5px] font-medium text-[#F3F0E8] group-hover:text-[#F4B52C] transition-colors">
                        {issue.title}
                      </h4>
                      {issue.ward && (
                        <div className="flex items-center gap-1 text-[12px] text-[#8D918F] mt-0.5">
                          <MapPin size={12} className="text-[#F4B52C]" />
                          <span>{issue.ward}</span>
                          {issue.category && <span>• {issue.category}</span>}
                        </div>
                      )}
                    </div>

                    {/* Progress Indicator Bar */}
                    <div className="flex items-center gap-1.5 pt-2 border-t border-[#2C2A25]">
                      {order.map((step, idx) => {
                        const isDone = idx <= currentIdx;
                        return (
                          <div key={step} className="flex items-center flex-1">
                            <div
                              className={`h-1.5 w-full rounded-full transition-all ${
                                isDone
                                  ? issue.status === "resolved"
                                    ? "bg-[#4C7A5E]"
                                    : "bg-[#F4B52C]"
                                  : "bg-[#2C2A25]"
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* How It Works / Civic Intelligence Workflow */}
        <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8">
          <div className="mb-6">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#F4B52C]">
              Civic Infrastructure Lifecycle
            </span>
            <h3 className="text-[18px] sm:text-[20px] font-bold text-[#F3F0E8] mt-1">
              How InfraSense Resolves Municipal Issues
            </h3>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="h-7 w-7 rounded-lg bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] font-mono text-[12px] font-bold flex items-center justify-center">
                  01
                </span>
                <h4 className="text-[14px] font-semibold text-[#F3F0E8]">Capture & Submit</h4>
              </div>
              <p className="text-[13px] text-[#8D918F] leading-relaxed">
                Take a photograph of any public defect. Location coordinates are attached automatically to pinpoint the asset.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="h-7 w-7 rounded-lg bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] font-mono text-[12px] font-bold flex items-center justify-center">
                  02
                </span>
                <h4 className="text-[14px] font-semibold text-[#F3F0E8]">AI Assessment</h4>
              </div>
              <p className="text-[13px] text-[#8D918F] leading-relaxed">
                Computer vision evaluates severity, checks for duplicates, and assigns the case to the responsible municipal department.
              </p>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2.5">
                <span className="h-7 w-7 rounded-lg bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] font-mono text-[12px] font-bold flex items-center justify-center">
                  03
                </span>
                <h4 className="text-[14px] font-semibold text-[#F3F0E8]">Field Verification</h4>
              </div>
              <p className="text-[13px] text-[#8D918F] leading-relaxed">
                Municipal work crews are dispatched. Resolution photographic evidence is posted once repairs are verified.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
