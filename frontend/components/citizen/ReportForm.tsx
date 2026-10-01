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
  Plus,
  Compass,
  Clock,
  Smartphone,
  Check,
  HelpCircle,
  AlertTriangle,
  Layers,
} from "lucide-react";
import {
  analyzeImage,
  uploadMedia,
  type AIAnalyzeResult,
} from "@/lib/api/media";
import { createIssue } from "@/lib/api/issues";
import { ApiError } from "@/lib/api/client";
import { Button } from "@/components/ui/Button";
import { SeverityBadge } from "@/components/ui/Primitives";
import type { EvidenceVerification, Issue } from "@/lib/types";

type Stage = "idle" | "scanning" | "analyzed" | "submitting" | "submitted";

const MAX_PHOTOS = 5;

export interface EvidencePhoto {
  id: string;
  file: File;
  previewUrl: string;
  status: "uploading" | "uploaded" | "error";
  mediaId?: number | null;
  fileUrl?: string | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  verification?: EvidenceVerification | null;
  errorMessage?: string | null;
  deviceCapturedAt: string;
  deviceCoords?: { lat: number; lng: number } | null;
}

/**
 * Formats a Date object into an ISO-8601 string including the device's local timezone offset (e.g. 2026-09-28T13:26:44+05:30).
 */
function formatIsoWithLocalOffset(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());

  const offsetMinutes = -date.getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const absOffset = Math.abs(offsetMinutes);
  const offsetHours = pad(Math.floor(absOffset / 60));
  const offsetMins = pad(absOffset % 60);

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}${sign}${offsetHours}:${offsetMins}`;
}

export function ReportForm() {
  const [stage, setStage] = useState<Stage>("idle");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<EvidencePhoto[]>([]);
  const [aiResult, setAiResult] = useState<AIAnalyzeResult | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState<boolean>(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationNotice, setLocationNotice] = useState<string | null>(null);
  const [submittedIssue, setSubmittedIssue] = useState<Issue | null>(null);
  const [error, setError] = useState<string | null>(null);

  // File & Camera Input references for adding new photos
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Target index for replacing an existing photo
  const replaceIndexRef = useRef<number | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);
  const replaceCameraInputRef = useRef<HTMLInputElement>(null);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      photos.forEach((p) => {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      });
    };
  }, [photos]);

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
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  async function handleRetryLocation() {
    setLocationLoading(true);
    setLocationError(null);
    setLocationNotice(null);
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

  /**
   * Internal helper to upload a single photo and optionally run AI analysis.
   */
  async function processAndUploadPhoto(
    photoItem: EvidencePhoto,
    isPrimary: boolean,
    locationCoords?: { lat: number; lng: number } | null
  ) {
    try {
      const uploadPromise = uploadMedia(photoItem.file, {
        device_latitude: locationCoords?.lat ?? null,
        device_longitude: locationCoords?.lng ?? null,
        device_captured_at: photoItem.deviceCapturedAt,
      });

      const aiPromise =
        isPrimary
          ? analyzeImage(photoItem.file, description).catch(() => null)
          : Promise.resolve(null);

      const [uploadRes, aiRes] = await Promise.all([uploadPromise, aiPromise]);

      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoItem.id
            ? {
                ...p,
                status: "uploaded",
                mediaId: uploadRes.media_id,
                fileUrl: uploadRes.file_url,
                cameraMake: uploadRes.camera_make,
                cameraModel: uploadRes.camera_model,
                verification: uploadRes.evidence_verification,
                deviceCoords: locationCoords ?? null,
              }
            : p
        )
      );

      if (isPrimary && aiRes) {
        setAiResult(aiRes);
      }
    } catch (err) {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoItem.id
            ? {
                ...p,
                status: "error",
                errorMessage:
                  err instanceof ApiError
                    ? err.message
                    : "Upload failed. Check your network connection.",
              }
            : p
        )
      );
    }
  }

  /**
   * Handles adding one or more files from file input or camera input.
   */
  async function handleAddFiles(filesList: FileList | File[]) {
    const rawFiles = Array.from(filesList);
    if (!rawFiles.length) return;

    const availableSlots = MAX_PHOTOS - photos.length;
    if (availableSlots <= 0) return;

    const filesToAdd = rawFiles.slice(0, availableSlots);
    if (rawFiles.length > availableSlots) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed. Only ${availableSlots} were added.`);
    } else {
      setError(null);
    }

    // Capture location once per session if not already available
    let currentCoords = coords;
    if (!currentCoords) {
      setLocationLoading(true);
      try {
        currentCoords = await requestLocation();
        setCoords(currentCoords);
        setLocationError(null);
        setLocationNotice(null);
      } catch (locErr) {
        setLocationNotice("Location unavailable — evidence can still be submitted.");
      } finally {
        setLocationLoading(false);
      }
    }

    const newPhotos: EvidencePhoto[] = filesToAdd.map((file, idx) => {
      const fileDate = file.lastModified ? new Date(file.lastModified) : new Date();
      return {
        id: `${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        status: "uploading",
        deviceCapturedAt: formatIsoWithLocalOffset(fileDate),
        deviceCoords: currentCoords ?? null,
      };
    });

    const isFirstBatch = photos.length === 0;
    setPhotos((prev) => [...prev, ...newPhotos]);
    if (isFirstBatch) {
      setStage("scanning");
    }

    // Upload each new photo concurrently
    await Promise.all(
      newPhotos.map((p, idx) =>
        processAndUploadPhoto(p, isFirstBatch && idx === 0, currentCoords)
      )
    );

    setStage("analyzed");
  }

  /**
   * Replaces a specific photo at `targetIndex`.
   */
  async function handleReplaceFile(file: File) {
    const idx = replaceIndexRef.current;
    if (idx === null || idx < 0 || idx >= photos.length) return;

    const oldPhoto = photos[idx];
    if (oldPhoto.previewUrl) {
      URL.revokeObjectURL(oldPhoto.previewUrl);
    }

    const fileDate = file.lastModified ? new Date(file.lastModified) : new Date();
    const replacementPhoto: EvidencePhoto = {
      id: `${Date.now()}_rep_${Math.random().toString(36).substring(2, 7)}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: "uploading",
      deviceCapturedAt: formatIsoWithLocalOffset(fileDate),
      deviceCoords: coords ?? null,
    };

    setPhotos((prev) => {
      const updated = [...prev];
      updated[idx] = replacementPhoto;
      return updated;
    });

    const isPrimary = idx === 0;
    if (isPrimary) {
      setStage("scanning");
    }

    await processAndUploadPhoto(replacementPhoto, isPrimary, coords);
    setStage("analyzed");
    replaceIndexRef.current = null;
  }

  function handleRemovePhoto(index: number) {
    const photoToRemove = photos[index];
    if (photoToRemove?.previewUrl) {
      URL.revokeObjectURL(photoToRemove.previewUrl);
    }

    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);

    if (updated.length === 0) {
      setAiResult(null);
      setStage("idle");
      setError(null);
    } else if (index === 0 && updated[0]) {
      // Re-run AI analysis on the new primary photo if primary was removed
      analyzeImage(updated[0].file, description)
        .then((res) => setAiResult(res))
        .catch(() => null);
    }
  }

  function handleRetryUpload(photoItem: EvidencePhoto) {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoItem.id ? { ...p, status: "uploading", errorMessage: null } : p))
    );
    const isPrimary = photos[0]?.id === photoItem.id;
    processAndUploadPhoto(photoItem, isPrimary, coords);
  }

  function handleResetForm() {
    photos.forEach((p) => {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    });
    setPhotos([]);
    setCoords(null);
    setLocationError(null);
    setLocationNotice(null);
    setDescription("");
    setAiResult(null);
    setError(null);
    setStage("idle");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!coords) {
      setLocationError("Location coordinates are required to submit your report.");
      return;
    }
    if (photos.length === 0) {
      setError("At least one photo evidence image is required.");
      return;
    }
    const hasPendingUploads = photos.some((p) => p.status === "uploading");
    if (hasPendingUploads) {
      setError("Please wait for all evidence images to finish uploading before submitting.");
      return;
    }
    const hasErrors = photos.some((p) => p.status === "error");
    if (hasErrors) {
      setError("One or more evidence photos failed to upload. Please retry or remove them.");
      return;
    }

    const uploadedMediaIds = photos
      .map((p) => p.mediaId)
      .filter((id): id is number => typeof id === "number");

    if (!uploadedMediaIds.length) {
      setError("Could not link uploaded evidence. Please retry uploading.");
      return;
    }

    setStage("submitting");
    setError(null);

    try {
      const createdIssue = await createIssue({
        description,
        latitude: coords.lat,
        longitude: coords.lng,
        media_id: uploadedMediaIds[0],
        media_ids: uploadedMediaIds,
        ai_category: aiResult?.category,
        ai_confidence: aiResult?.confidence,
      });
      setSubmittedIssue(createdIssue);
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

  // Format neutral verification text for UI
  function renderVerificationStatus(verification?: EvidenceVerification | null) {
    if (!verification) return null;

    const gpsStatus = verification.gps?.status || "unavailable";
    const timeStatus = verification.capture_time?.status || "unavailable";
    const distanceM = verification.gps?.distance_meters;
    const diffSec = verification.capture_time?.difference_seconds;

    return (
      <div className="mt-2 pt-2 border-t border-[#2C2A25]/60 text-[11px] space-y-1">
        {/* GPS Verification */}
        <div className="flex items-center justify-between">
          <span className="text-[#8D918F] flex items-center gap-1">
            <Compass size={11} className="text-[#F4B52C]" />
            <span>GPS Match</span>
          </span>
          <span
            className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded ${
              gpsStatus === "match"
                ? "bg-[#4C7A5E]/20 text-[#4C7A5E]"
                : gpsStatus === "mismatch"
                ? "bg-[#F4B52C]/20 text-[#F4B52C]"
                : "bg-[#1C1F21] text-[#8D918F]"
            }`}
          >
            {gpsStatus === "match"
              ? `Consistent ${distanceM !== undefined && distanceM !== null ? `(${distanceM}m)` : ""}`
              : gpsStatus === "mismatch"
              ? `Mismatch ${distanceM !== undefined && distanceM !== null ? `(${distanceM}m)` : ""}`
              : "Unavailable"}
          </span>
        </div>

        {/* Time Verification */}
        <div className="flex items-center justify-between">
          <span className="text-[#8D918F] flex items-center gap-1">
            <Clock size={11} className="text-[#F4B52C]" />
            <span>Capture Time</span>
          </span>
          <span
            className={`font-mono text-[10.5px] px-1.5 py-0.5 rounded ${
              timeStatus === "match"
                ? "bg-[#4C7A5E]/20 text-[#4C7A5E]"
                : timeStatus === "mismatch"
                ? "bg-[#F4B52C]/20 text-[#F4B52C]"
                : "bg-[#1C1F21] text-[#8D918F]"
            }`}
          >
            {timeStatus === "match"
              ? `Consistent ${diffSec !== undefined && diffSec !== null ? `(${diffSec}s)` : ""}`
              : timeStatus === "mismatch"
              ? `Mismatch ${diffSec !== undefined && diffSec !== null ? `(${diffSec}s)` : ""}`
              : "Unavailable"}
          </span>
        </div>
      </div>
    );
  }

  // Success Screen
  if (stage === "submitted") {
    const dupAssessment = submittedIssue?.duplicate_assessment;
    const isPossibleDuplicate =
      dupAssessment?.status === "possible_duplicate" &&
      dupAssessment.matches &&
      dupAssessment.matches.length > 0;
    const topMatch = isPossibleDuplicate ? dupAssessment.matches[0] : null;

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
        <p className="text-[14px] text-[#8D918F] leading-relaxed max-w-md mx-auto mb-6">
          Your report with {photos.length} evidence {photos.length === 1 ? "photo" : "photos"} has been logged and assigned to the municipal dispatch queue.
        </p>

        {/* Neutral Duplicate Assessment Notice */}
        {isPossibleDuplicate && topMatch && (
          <div className="mb-6 p-4 rounded-xl bg-[#1C1F21] border border-[#F4B52C]/30 text-left">
            <div className="flex items-center gap-2 text-[12.5px] font-semibold text-[#F4B52C] mb-1.5">
              <Layers size={15} />
              <span>Possible Related Report (Issue #{topMatch.issue_id})</span>
            </div>
            <p className="text-[12px] text-[#8D918F] mb-2 leading-relaxed">
              Our automated similarity scan noted a possible relation to an existing active issue:
            </p>
            {topMatch.reasons && topMatch.reasons.length > 0 && (
              <ul className="text-[11.5px] text-[#F3F0E8] space-y-1 mb-2.5 bg-[#151718] p-2.5 rounded-lg border border-[#2C2A25]">
                {topMatch.reasons.map((reason, rIdx) => (
                  <li key={rIdx} className="flex items-center gap-1.5">
                    <span className="text-[#F4B52C]">•</span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="text-[11px] text-[#8D918F]">
              This is a similarity signal for repair crew coordination. Your report is preserved and tracked independently.
            </div>
          </div>
        )}

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

  const isUploadingAny = photos.some((p) => p.status === "uploading");
  const canSubmit =
    stage === "analyzed" &&
    photos.length > 0 &&
    !isUploadingAny &&
    !photos.some((p) => p.status === "error") &&
    !!coords &&
    !locationLoading;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Hidden File Inputs for Adding New Photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        multiple
        onChange={(e) => {
          if (e.target.files) handleAddFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files) handleAddFiles(e.target.files);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Hidden File Inputs for Replacing Existing Photos */}
      <input
        ref={replaceFileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        onChange={(e) => {
          if (e.target.files?.[0]) handleReplaceFile(e.target.files[0]);
          e.target.value = "";
        }}
        className="hidden"
      />
      <input
        ref={replaceCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => {
          if (e.target.files?.[0]) handleReplaceFile(e.target.files[0]);
          e.target.value = "";
        }}
        className="hidden"
      />

      {/* Visual Workflow Steps */}
      <div className="grid grid-cols-4 gap-2 pb-4 border-b border-[#2C2A25]">
        <div className="flex flex-col items-center text-center">
          <span
            className={`h-6 w-6 rounded-full font-mono text-[11px] font-bold flex items-center justify-center mb-1 ${
              photos.length > 0 ? "bg-[#4C7A5E] text-white" : "bg-[#F4B52C] text-[#0D0F10]"
            }`}
          >
            {photos.length > 0 ? "✓" : "1"}
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
                : photos.length > 0
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
        {/* Section 1: Photo Evidence (1 to 5 Photos) */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2.5">
            <label className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold flex items-center gap-1.5">
              <Camera size={14} />
              <span>1. Photo Evidence ({photos.length}/{MAX_PHOTOS})</span>
            </label>
            <span className="text-[11px] text-[#8D918F]">
              {photos.length === 0
                ? "1–5 photos accepted"
                : photos.length === MAX_PHOTOS
                ? "Maximum 5 photos attached"
                : `Add up to ${MAX_PHOTOS - photos.length} more`}
            </span>
          </div>

          {/* Initial Empty Upload State */}
          {photos.length === 0 ? (
            <div className="w-full min-h-[220px] rounded-xl bg-[#121415] border-2 border-dashed border-[#2C2A25] p-6 flex flex-col items-center justify-center text-center transition-all hover:border-[#F4B52C]/50">
              <div className="h-14 w-14 rounded-2xl bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C] flex items-center justify-center mb-3">
                <UploadCloud size={26} />
              </div>
              <span className="text-[14.5px] font-semibold text-[#F3F0E8] mb-1">
                Add Infrastructure Evidence Photo
              </span>
              <span className="text-[12.5px] text-[#8D918F] max-w-sm leading-relaxed mb-5">
                Capture the defect using your camera or upload photo files (JPG, PNG, WebP). Up to 5 photos.
              </span>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F4B52C] hover:bg-[#E5A820] text-[#0D0F10] font-semibold text-[13px] transition-transform active:scale-95 cursor-pointer shadow-md"
                >
                  <Camera size={16} />
                  <span>Take Photo</span>
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1C1F21] hover:bg-[#25282A] text-[#F3F0E8] border border-[#2C2A25] font-semibold text-[13px] transition-colors cursor-pointer"
                >
                  <UploadCloud size={16} />
                  <span>Upload Photo</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Photo Evidence Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {photos.map((photoItem, idx) => (
                  <div
                    key={photoItem.id}
                    className="relative rounded-xl border border-[#2C2A25] bg-[#121415] overflow-hidden flex flex-col group"
                  >
                    {/* Image Preview */}
                    <div className="relative h-44 w-full bg-[#0D0F10]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoItem.previewUrl}
                        alt={`Evidence photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />

                      {/* Primary Photo Badge */}
                      {idx === 0 && (
                        <span className="absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-[#0D0F10]/85 border border-[#F4B52C]/40 text-[#F4B52C] font-semibold backdrop-blur-md">
                          <Sparkles size={10} />
                          Primary Photo
                        </span>
                      )}

                      {/* Upload Status Overlay */}
                      {photoItem.status === "uploading" && (
                        <div className="absolute inset-0 bg-[#0D0F10]/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                          <Loader2 size={24} className="text-[#F4B52C] animate-spin" />
                          <span className="text-[11px] font-mono text-[#F4B52C] font-semibold">
                            UPLOADING EVIDENCE…
                          </span>
                        </div>
                      )}

                      {/* Upload Error Overlay */}
                      {photoItem.status === "error" && (
                        <div className="absolute inset-0 bg-[#B23A2C]/85 backdrop-blur-sm p-3 flex flex-col items-center justify-center text-center gap-2">
                          <AlertCircle size={22} className="text-white" />
                          <span className="text-[11.5px] text-white font-medium">
                            {photoItem.errorMessage || "Upload failed"}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRetryUpload(photoItem)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded bg-white text-[#B23A2C] hover:bg-gray-100 transition-colors"
                          >
                            <RefreshCw size={11} />
                            <span>Retry</span>
                          </button>
                        </div>
                      )}

                      {/* Photo Actions */}
                      {photoItem.status !== "uploading" && stage !== "submitting" && (
                        <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              replaceIndexRef.current = idx;
                              replaceFileInputRef.current?.click();
                            }}
                            className="text-[11px] font-medium px-2 py-1 rounded-md bg-[#151718]/90 hover:bg-[#1C1F21] text-[#F3F0E8] border border-[#2C2A25] backdrop-blur-sm transition-colors cursor-pointer"
                            title="Replace this photo"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemovePhoto(idx)}
                            className="p-1 rounded-md bg-[#B23A2C]/30 hover:bg-[#B23A2C]/60 text-[#F4F1E8] border border-[#B23A2C]/50 backdrop-blur-sm transition-colors cursor-pointer"
                            title="Remove this photo"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Metadata & Verification Footer */}
                    <div className="p-3 bg-[#151718] border-t border-[#2C2A25]">
                      <div className="flex items-center justify-between text-[11.5px]">
                        <span className="font-semibold text-[#F3F0E8]">
                          Photo {idx + 1}
                        </span>
                        {photoItem.cameraMake || photoItem.cameraModel ? (
                          <span className="text-[10.5px] text-[#8D918F] truncate max-w-[140px] flex items-center gap-1">
                            <Smartphone size={10} className="shrink-0 text-[#F4B52C]" />
                            <span className="truncate">
                              {[photoItem.cameraMake, photoItem.cameraModel].filter(Boolean).join(" ")}
                            </span>
                          </span>
                        ) : (
                          <span className="text-[10.5px] text-[#8D918F]">
                            {photoItem.file.name.length > 18
                              ? `${photoItem.file.name.slice(0, 15)}...`
                              : photoItem.file.name}
                          </span>
                        )}
                      </div>

                      {/* Evidence Verification Block */}
                      {renderVerificationStatus(photoItem.verification)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Add More Photos Bar (Up to 5) */}
              {photos.length < MAX_PHOTOS && stage !== "submitting" && (
                <div className="p-3.5 rounded-xl bg-[#121415] border border-dashed border-[#2C2A25] flex flex-col sm:flex-row items-center justify-between gap-3">
                  <span className="text-[12.5px] text-[#8D918F]">
                    Add additional angles or context ({photos.length}/{MAX_PHOTOS} photos attached)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1F21] hover:bg-[#25282A] text-[#F4B52C] border border-[#2C2A25] text-[12px] font-semibold transition-colors cursor-pointer"
                    >
                      <Camera size={13} />
                      <span>Take Photo</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#1C1F21] hover:bg-[#25282A] text-[#F3F0E8] border border-[#2C2A25] text-[12px] font-semibold transition-colors cursor-pointer"
                    >
                      <Plus size={13} />
                      <span>Upload Photo</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* AI Diagnostics Results Card */}
        {aiResult && (stage === "analyzed" || stage === "submitting") && (
          <div className="rounded-xl border border-[#F4B52C]/30 bg-[#1C1F21] p-5 mb-8">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#2C2A25]">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-[#F4B52C]" />
                <span className="text-[12px] font-mono uppercase tracking-wider text-[#F3F0E8] font-semibold">
                  Computer Vision Assessment (Primary Evidence)
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
                    : "Location requested with photo capture"}
                </div>
                <div className="text-[11.5px] text-[#8D918F]">
                  {locationLoading
                    ? "Contacting browser geolocation service..."
                    : coords
                    ? "Municipal ward and dispatch routing automatically assigned"
                    : locationError
                    ? locationError
                    : locationNotice || "Enables automated routing to the nearest municipal zone"}
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
            disabled={!canSubmit}
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
                <span>
                  Submit Infrastructure Report ({photos.length} {photos.length === 1 ? "Photo" : "Photos"})
                </span>
              </>
            )}
          </Button>

          {/* Contextual Guidance Notes */}
          <div className="text-center text-[12px] text-[#8D918F] mt-3">
            {stage === "idle" && (
              <span>Step 1: Take or upload a photo above to begin evidence collection.</span>
            )}
            {stage === "scanning" && (
              <span>Running computer vision classification on evidence…</span>
            )}
            {stage === "analyzed" && !coords && (
              <span className="text-[#F4B52C]">
                GPS location is required to route municipal dispatch. Tap Retry Location above.
              </span>
            )}
            {stage === "analyzed" && coords && !isUploadingAny && (
              <span className="text-[#4C7A5E]">
                All evidence ready. Ready to transmit into municipal repair queue.
              </span>
            )}
            {isUploadingAny && (
              <span className="text-[#F4B52C]">
                Evidence photos uploading…
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
