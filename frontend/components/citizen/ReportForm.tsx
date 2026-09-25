"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Camera,
  MapPin,
  CheckCircle2,
  AlertCircle,
  UploadCloud,
  RefreshCw,
  Sparkles,
  Trash2,
  Loader2,
  Info,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { analyzeImage, uploadMedia, type AIAnalyzeResult } from "@/lib/api/media";
import { createIssue } from "@/lib/api/issues";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/Primitives";

type Stage = "idle" | "scanning" | "analyzed" | "submitting" | "submitted";

export function ReportForm() {
  const [stage, setStage] = useState<Stage>("idle");
  const [description, setDescription] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [mediaId, setMediaId] = useState<number | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<AIAnalyzeResult | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleRemovePhoto() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setPhoto(null);
    setMediaId(null);
    setFileUrl(null);
    setAiResult(null);
    setError(null);
    setStage("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleResetForm() {
    handleRemovePhoto();
    setCoords(null);
    setLocationError(null);
    setDescription("");
    setStage("idle");
  }

  function requestLocation(): Promise<{ lat: number; lng: number }> {
    return new Promise((resolve, reject) => {
      if (typeof window === "undefined" || !navigator.geolocation) {
        reject(
          new Error(
            "Geolocation is not supported by your browser. Location coordinates are required to dispatch municipal crews."
          )
        );
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
        },
        (err) => {
          let message = "Location coordinates are required to submit a report.";
          if (err.code === err.PERMISSION_DENIED) {
            message =
              "Location permission was denied. Please allow location access in your browser settings to pinpoint the issue.";
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            message =
              "Location information is unavailable. Please check your device GPS / location settings.";
          } else if (err.code === err.TIMEOUT) {
            message = "Location request timed out. Please tap retry to try again.";
          }
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  async function handleRetryLocation() {
    setLocationLoading(true);
    setLocationError(null);
    try {
      const loc = await requestLocation();
      setCoords(loc);
      setLocationError(null);
    } catch (err) {
      setCoords(null);
      setLocationError(
        err instanceof Error
          ? err.message
          : "Could not retrieve your location. Location is required to submit a report."
      );
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    const newPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(newPreviewUrl);
    setPhoto(file);
    setMediaId(null);
    setFileUrl(null);
    setAiResult(null);
    setError(null);
    setLocationError(null);
    setCoords(null);
    setStage("scanning");

    try {
      const [uploadRes, result, locResult] = await Promise.all([
        uploadMedia(file),
        analyzeImage(file, description),
        requestLocation().catch((locErr) => {
          return {
            error:
              locErr instanceof Error
                ? locErr.message
                : "Location is required to submit a report.",
          };
        }),
      ]);
      setMediaId(uploadRes.media_id);
      setFileUrl(uploadRes.file_url);
      setAiResult(result);

      if ("error" in locResult) {
        setCoords(null);
        setLocationError(locResult.error);
      } else {
        setCoords(locResult);
      }
      setStage("analyzed");
    } catch (err) {
      URL.revokeObjectURL(newPreviewUrl);
      setPreviewUrl(null);
      setPhoto(null);
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to upload or analyze photo evidence. Please try again."
      );
      setStage("idle");
    }
  }

  async function handleSubmit() {
    if (!coords) {
      setLocationError("Location coordinates are required to submit your report.");
      return;
    }
    setStage("submitting");
    setError(null);
    try {
      await createIssue({
        description,
        latitude: coords.lat,
        longitude: coords.lng,
        media_id: mediaId ?? undefined,
        ai_category: aiResult?.category,
        ai_confidence: aiResult?.confidence,
      });
      setStage("submitted");
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not submit your report. Please verify your connection and try again."
      );
      setStage("analyzed");
    }
  }

  // Success Screen
  if (stage === "submitted") {
    return (
      <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-8 sm:p-12 text-center max-w-xl mx-auto shadow-2xl">
        <div className="h-16 w-16 rounded-2xl bg-[#4C7A5E]/15 border border-[#4C7A5E]/30 text-[#4C7A5E] mx-auto flex items-center justify-center mb-5">
          <CheckCircle2 size={36} />
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#4C7A5E]/15 border border-[#4C7A5E]/30 text-[#4C7A5E] font-mono text-[11px] uppercase tracking-wider font-semibold mb-3">
          Report Logged Successfully
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-[#F3F0E8] tracking-tight mb-3">
          Civic Report Transmitted
        </h2>
        <p className="text-[14px] text-[#8D918F] leading-relaxed max-w-md mx-auto mb-8">
          Your report has been logged and assigned to the municipal dispatch queue. If nearby duplicate reports are detected, they will be clustered to expedite engineering response.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button href="/citizen/reports" variant="primary" size="lg" className="w-full sm:w-auto gap-2">
            <span>Track My Reports</span>
            <ArrowRight size={16} />
          </Button>
          <Button onClick={handleResetForm} variant="secondary" size="lg" className="w-full sm:w-auto">
            Submit Another Report
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Visual Workflow Steps */}
      <div className="grid grid-cols-4 gap-2 pb-4 border-b border-[#2C2A25]">
        <div className="flex flex-col items-center text-center">
          <span
            className={`h-6 w-6 rounded-full font-mono text-[11px] font-bold flex items-center justify-center mb-1 ${
              photo ? "bg-[#4C7A5E] text-white" : "bg-[#F4B52C] text-[#0D0F10]"
            }`}
          >
            {photo ? "✓" : "1"}
          </span>
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#8D918F]">
            Capture
          </span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span
            className={`h-6 w-6 rounded-full font-mono text-[11px] font-bold flex items-center justify-center mb-1 ${
              stage === "analyzed" || stage === "submitting"
                ? "bg-[#4C7A5E] text-white"
                : photo
                ? "bg-[#F4B52C] text-[#0D0F10]"
                : "bg-[#1C1F21] text-[#8D918F] border border-[#2C2A25]"
            }`}
          >
            {stage === "analyzed" || stage === "submitting" ? "✓" : "2"}
          </span>
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#8D918F]">
            Analyze
          </span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span
            className={`h-6 w-6 rounded-full font-mono text-[11px] font-bold flex items-center justify-center mb-1 ${
              coords
                ? "bg-[#4C7A5E] text-white"
                : "bg-[#1C1F21] text-[#8D918F] border border-[#2C2A25]"
            }`}
          >
            {coords ? "✓" : "3"}
          </span>
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#8D918F]">
            Locate
          </span>
        </div>
        <div className="flex flex-col items-center text-center">
          <span
            className={`h-6 w-6 rounded-full font-mono text-[11px] font-bold flex items-center justify-center mb-1 ${
              stage === "submitting"
                ? "bg-[#F4B52C] text-[#0D0F10] animate-pulse"
                : "bg-[#1C1F21] text-[#8D918F] border border-[#2C2A25]"
            }`}
          >
            4
          </span>
          <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#8D918F]">
            Submit
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8 shadow-xl">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelected}
          className="hidden"
        />

        {/* Section 1: Photo Evidence */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold flex items-center gap-1.5">
              <Camera size={14} />
              <span>1. Photo Evidence</span>
            </label>
            <span className="text-[11px] text-[#8D918F]">Required for AI assessment</span>
          </div>

          <div className="w-full min-h-[220px] rounded-xl bg-[#121415] border-2 border-dashed border-[#2C2A25] relative overflow-hidden flex flex-col items-center justify-center transition-all hover:border-[#F4B52C]/50">
            {!previewUrl ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={stage !== "idle"}
                className="focus-ring w-full h-full p-8 flex flex-col items-center justify-center text-center group cursor-pointer"
              >
                <div className="h-14 w-14 rounded-2xl bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <UploadCloud size={26} />
                </div>
                <span className="text-[14.5px] font-semibold text-[#F3F0E8] mb-1">
                  Upload or Capture Photograph
                </span>
                <span className="text-[12.5px] text-[#8D918F] max-w-xs leading-relaxed">
                  Tap to take a photo of the defect or upload an image from your device (JPG, PNG, WebP)
                </span>
              </button>
            ) : (
              <div className="relative w-full h-64 sm:h-72 bg-[#0D0F10]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Captured infrastructure defect evidence"
                  className="w-full h-full object-cover"
                />

                {/* Scanning Overlay */}
                {stage === "scanning" && (
                  <div className="absolute inset-0 bg-[#0D0F10]/75 backdrop-blur-sm flex flex-col items-center justify-center gap-3">
                    <Loader2 size={32} className="text-[#F4B52C] animate-spin" />
                    <span className="text-[12px] font-mono px-3.5 py-1.5 rounded-full bg-[#F4B52C] text-[#0D0F10] font-bold tracking-wider">
                      ANALYZING INFRASTRUCTURE EVIDENCE…
                    </span>
                  </div>
                )}

                {/* Analyzed Tag */}
                {(stage === "analyzed" || stage === "submitting") && (
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 text-[10.5px] font-mono px-2.5 py-1 rounded-md bg-[#0D0F10]/90 border border-[#F4B52C]/40 text-[#F4B52C] font-semibold backdrop-blur-md">
                    <Sparkles size={12} />
                    AI DIAGNOSTIC COMPLETE
                  </span>
                )}

                {/* Image Management Actions */}
                {stage !== "submitting" && stage !== "scanning" && (
                  <div className="absolute top-3 right-3 flex items-center gap-2 z-10">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium px-3 py-1.5 rounded-lg bg-[#151718]/90 hover:bg-[#1C1F21] text-[#F3F0E8] border border-[#2C2A25] backdrop-blur-sm transition-all"
                    >
                      <span>Replace</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="inline-flex items-center gap-1 text-[11.5px] font-medium px-3 py-1.5 rounded-lg bg-[#B23A2C]/20 hover:bg-[#B23A2C]/30 text-[#F4F1E8] border border-[#B23A2C]/40 backdrop-blur-sm transition-all"
                    >
                      <Trash2 size={13} />
                      <span>Remove</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* AI Diagnostics Results Card */}
        {aiResult && (stage === "analyzed" || stage === "submitting") && (
          <div className="rounded-xl border border-[#F4B52C]/30 bg-[#1C1F21] p-5 mb-8">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2C2A25]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#F4B52C]" />
                <span className="text-[12px] font-mono uppercase tracking-wider text-[#F3F0E8] font-semibold">
                  Computer Vision Assessment
                </span>
              </div>
              {aiResult.is_baseline && (
                <span className="text-[10px] font-mono text-[#8D918F] bg-[#151718] px-2 py-0.5 rounded border border-[#2C2A25]">
                  Baseline Diagnostic
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[13px]">
              <div className="p-2.5 rounded-lg bg-[#151718] border border-[#2C2A25]">
                <div className="text-[11px] text-[#8D918F] mb-0.5">Detected Category</div>
                <div className="font-semibold text-[#F3F0E8] capitalize">
                  {aiResult.category || "General Road Defect"}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#151718] border border-[#2C2A25]">
                <div className="text-[11px] text-[#8D918F] mb-0.5">AI Confidence</div>
                <div className="font-mono font-bold text-[#F4B52C]">
                  {aiResult.confidence ? `${aiResult.confidence}%` : "—"}
                </div>
              </div>

              <div className="col-span-2 sm:col-span-1 p-2.5 rounded-lg bg-[#151718] border border-[#2C2A25] flex flex-col justify-center">
                <div className="text-[11px] text-[#8D918F] mb-1">Severity Rating</div>
                <div>
                  <SeverityBadge
                    severity={
                      (aiResult.severity?.toLowerCase() as
                        | "critical"
                        | "high"
                        | "medium"
                        | "low") || "medium"
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 2: Problem Description */}
        <div className="mb-8">
          <label className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold flex items-center gap-1.5 mb-2.5">
            <Info size={14} />
            <span>2. Problem Description</span>
          </label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (aiResult) {
                setAiResult(null);
              }
            }}
            rows={3}
            placeholder="Describe the issue, surrounding landmark references, or traffic impact..."
            className="focus-ring w-full rounded-xl bg-[#121415] border border-[#2C2A25] p-3.5 text-[13.5px] text-[#F3F0E8] placeholder-[#8D918F]/60 resize-none transition-colors"
          />
          <span className="text-[11px] text-[#8D918F] mt-1 block">
            Provide any additional details that will help repair crews locate and resolve the issue.
          </span>
        </div>

        {/* Section 3: Geolocation Coordinates */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold flex items-center gap-1.5">
              <MapPin size={14} />
              <span>3. Geolocation & Dispatch Coordinates</span>
            </label>
            {coords && (
              <span className="text-[11px] font-mono text-[#4C7A5E]">
                Lat: {coords.lat.toFixed(4)}, Lng: {coords.lng.toFixed(4)}
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-[#121415] border border-[#2C2A25] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                  coords
                    ? "bg-[#4C7A5E]/15 border border-[#4C7A5E]/30 text-[#4C7A5E]"
                    : locationError
                    ? "bg-[#B23A2C]/15 border border-[#B23A2C]/30 text-[#B23A2C]"
                    : "bg-[#1C1F21] border border-[#2C2A25] text-[#8D918F]"
                }`}
              >
                {locationLoading ? (
                  <Loader2 size={18} className="animate-spin text-[#F4B52C]" />
                ) : (
                  <MapPin size={18} />
                )}
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#F3F0E8]">
                  {locationLoading
                    ? "Retrieving GPS coordinates…"
                    : coords
                    ? "GPS Coordinates Locked"
                    : locationError
                    ? "Location Required"
                    : "Location requested with photo upload"}
                </div>
                <div className="text-[11.5px] text-[#8D918F]">
                  {locationLoading
                    ? "Contacting browser geolocation service..."
                    : coords
                    ? "Municipal ward and dispatch routing automatically assigned"
                    : locationError
                    ? locationError
                    : "Enables automated routing to the nearest municipal zone"}
                </div>
              </div>
            </div>

            {(!coords || locationError) && (
              <button
                type="button"
                onClick={handleRetryLocation}
                disabled={locationLoading}
                className="inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg bg-[#1C1F21] hover:bg-[#25282A] text-[#F4B52C] border border-[#2C2A25] transition-colors shrink-0 cursor-pointer"
              >
                <RefreshCw size={13} className={locationLoading ? "animate-spin" : ""} />
                <span>{locationLoading ? "Detecting…" : "Retry Location"}</span>
              </button>
            )}
          </div>
        </div>

        {/* Global Error Notice */}
        {error && (
          <div
            className="mb-6 p-4 rounded-xl bg-[#B23A2C]/10 border border-[#B23A2C]/30 text-[13px] text-[#F4F1E8]"
            role="alert"
          >
            <div className="flex items-center gap-2 font-medium text-[#F4F1E8] mb-1">
              <AlertCircle size={16} className="text-[#B23A2C]" />
              <span>Submission Notice</span>
            </div>
            <p className="text-[#8D918F] text-[12.5px]">{error}</p>
            {(error.toLowerCase().includes("logged in") ||
              error.toLowerCase().includes("unauthorized") ||
              error.toLowerCase().includes("session")) && (
              <div className="mt-3 pt-3 border-t border-[#B23A2C]/20 flex items-center gap-3">
                <Link
                  href="/login?role=citizen"
                  className="text-[12px] font-mono text-[#F4B52C] hover:underline"
                >
                  Citizen Sign In →
                </Link>
                <Link
                  href="/signup?role=citizen"
                  className="text-[12px] font-mono text-[#8D918F] hover:text-[#F3F0E8]"
                >
                  Create Account
                </Link>
              </div>
            )}
          </div>
        )}

        {/* Form Submission Action */}
        <div className="pt-4 border-t border-[#2C2A25]">
          <Button
            className="w-full justify-center gap-2"
            size="lg"
            disabled={stage !== "analyzed" || !coords || locationLoading}
            onClick={handleSubmit}
          >
            {stage === "submitting" ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Submitting Report to Municipality…</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={18} />
                <span>Submit Infrastructure Report</span>
              </>
            )}
          </Button>

          {/* Contextual Guidance Notes */}
          <div className="text-center text-[12px] text-[#8D918F] mt-3">
            {stage === "idle" && (
              <span>Step 1: Upload a photo above to run automated AI diagnostics.</span>
            )}
            {stage === "scanning" && (
              <span>Running computer vision classification on photo evidence…</span>
            )}
            {stage === "analyzed" && !coords && (
              <span className="text-[#F4B52C]">
                GPS location is required. Please allow location access or tap Retry Location.
              </span>
            )}
            {stage === "analyzed" && coords && (
              <span className="text-[#4C7A5E]">
                All evidence ready. Ready to log into municipal queue.
              </span>
            )}
          </div>

          <div className="text-center mt-4">
            <Link
              href="/citizen"
              className="focus-ring inline-flex items-center gap-1.5 text-[12.5px] text-[#8D918F] hover:text-[#F3F0E8] transition-colors"
            >
              <ArrowLeft size={14} />
              <span>Back to Citizen Portal</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
