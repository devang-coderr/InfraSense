"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  AlertTriangle,
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
  Wrench,
  Calendar,
  User,
  Plus,
  Send,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { AuthorityShell } from "@/components/authority/AuthorityShell";
import { SeverityBadge, ScoreBar, StatusPill } from "@/components/ui/Primitives";
import { Button } from "@/components/ui/Button";
import { getIssue, updateIssue } from "@/lib/api/issues";
import { uploadMedia } from "@/lib/api/media";
import {
  createWorkOrder,
  getWorkOrders,
  updateWorkOrder,
  type WorkOrder,
} from "@/lib/api/workOrders";
import { ApiError, getMediaUrl } from "@/lib/api/client";
import { IssueStatus, type Issue } from "@/lib/types";

interface StatusStep {
  key: IssueStatus;
  label: string;
  description: string;
}

const statusSteps: StatusStep[] = [
  { key: "reported", label: "Reported", description: "Logged by citizen." },
  { key: "ai_verified", label: "AI Verified", description: "Computer vision assessed." },
  { key: "assigned", label: "Assigned", description: "Routed to department." },
  { key: "in_progress", label: "In Progress", description: "Crew dispatched to site." },
  { key: "resolved", label: "Resolved", description: "Repairs verified complete." },
];

const DEPARTMENTS = [
  { id: 1, name: "Roads" },
  { id: 2, name: "Electrical" },
  { id: 3, name: "Sanitation" },
  { id: 4, name: "Water" },
  { id: 5, name: "Traffic" },
];

const statusTone: Record<IssueStatus, "neutral" | "accent" | "high" | "low"> = {
  reported: "neutral",
  ai_verified: "accent",
  assigned: "high",
  in_progress: "high",
  resolved: "low",
};

function formatEvidenceDate(dateStr?: string | null): string {
  if (!dateStr) return "Unavailable";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "Unavailable";
    return d.toLocaleString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "Unavailable";
  }
}

function formatCoords(lat?: number | null, lng?: number | null): string {
  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return "Unavailable";
  }
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}

function getGPSStatusBadge(status?: string) {
  switch (status) {
    case "match":
      return { label: "Location consistent", color: "bg-[#4C7A5E]/20 text-[#4C7A5E] border-[#4C7A5E]/30" };
    case "mismatch":
      return { label: "Location mismatch", color: "bg-[#F4B52C]/20 text-[#F4B52C] border-[#F4B52C]/30" };
    default:
      return { label: "Unavailable", color: "bg-[#1C1F21] text-[#8D918F] border-[#2C2A25]" };
  }
}

function getTimeStatusBadge(status?: string) {
  switch (status) {
    case "match":
      return { label: "Time consistent", color: "bg-[#4C7A5E]/20 text-[#4C7A5E] border-[#4C7A5E]/30" };
    case "mismatch":
      return { label: "Time mismatch", color: "bg-[#F4B52C]/20 text-[#F4B52C] border-[#F4B52C]/30" };
    default:
      return { label: "Unavailable", color: "bg-[#1C1F21] text-[#8D918F] border-[#2C2A25]" };
  }
}

export default function IssueDetailPage() {
  const params = useParams();
  const rawId = params?.id;
  const id = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : "";

  const [issue, setIssue] = useState<Issue | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState<boolean>(false);
  const [lightboxOpen, setLightboxOpen] = useState<boolean>(false);
  const [activePhotoIdx, setActivePhotoIdx] = useState<number>(0);

  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [workOrdersLoading, setWorkOrdersLoading] = useState<boolean>(true);
  const [workOrdersError, setWorkOrdersError] = useState<string | null>(null);

  // Work Order Creation Modal State
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [creatingWo, setCreatingWo] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalSuccess, setModalSuccess] = useState<string | null>(null);

  const [formDeptId, setFormDeptId] = useState<number>(1);
  const [formAssignee, setFormAssignee] = useState<string>("");
  const [formTitle, setFormTitle] = useState<string>("");
  const [formDescription, setFormDescription] = useState<string>("");
  const [formDeadline, setFormDeadline] = useState<string>("");

  // Work Order Completion Modal State
  const [completeModalOpen, setCompleteModalOpen] = useState<boolean>(false);
  const [completingWoId, setCompletingWoId] = useState<number | null>(null);
  const [completionNotes, setCompletionNotes] = useState<string>("");
  const [completingWo, setCompletingWo] = useState<boolean>(false);

  const [updatingWoId, setUpdatingWoId] = useState<number | null>(null);

  // Issue Status Update Form State
  const [selectedStatus, setSelectedStatus] = useState<IssueStatus>("reported");
  const [statusUpdating, setStatusUpdating] = useState<boolean>(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);
  const [statusUpdateSuccess, setStatusUpdateSuccess] = useState<string | null>(null);

  // Resolution Confirmation Form State
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [evidencePreview, setEvidencePreview] = useState<string | null>(null);
  const [markWorkOrdersComplete, setMarkWorkOrdersComplete] = useState<boolean>(true);
  const [selectedWorkOrderIdToComplete, setSelectedWorkOrderIdToComplete] = useState<string>("all");
  const [resolving, setResolving] = useState<boolean>(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [resolutionSuccess, setResolutionSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        err instanceof ApiError ? err.message : "Could not retrieve the requested issue record."
      );
      setIssue(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchWorkOrders = useCallback(async () => {
    if (!id) return;
    setWorkOrdersLoading(true);
    setWorkOrdersError(null);
    try {
      const orders = await getWorkOrders({ issue_id: Number(id) });
      setWorkOrders(orders);
    } catch (err) {
      setWorkOrdersError(
        err instanceof ApiError ? err.message : "Failed to load associated work orders."
      );
    } finally {
      setWorkOrdersLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchIssue();
    fetchWorkOrders();
  }, [fetchIssue, fetchWorkOrders]);

  useEffect(() => {
    if (issue?.department) {
      const match = DEPARTMENTS.find(
        (d) => d.name.toLowerCase() === issue.department.toLowerCase()
      );
      if (match) {
        setFormDeptId(match.id);
      }
    }
    if (issue?.status) {
      setSelectedStatus(issue.status);
    }
  }, [issue]);

  async function handleStatusUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !issue || selectedStatus === issue.status || statusUpdating) return;

    setStatusUpdating(true);
    setStatusUpdateError(null);
    setStatusUpdateSuccess(null);

    try {
      await updateIssue(id, { status: selectedStatus });
      setStatusUpdateSuccess(
        `Status successfully updated to "${statusSteps.find((s) => s.key === selectedStatus)?.label || selectedStatus}".`
      );
      await fetchIssue();
    } catch (err) {
      setStatusUpdateError(
        err instanceof ApiError ? err.message : "Failed to update issue status. Please try again."
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  const handleEvidenceFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
    }
    setEvidenceFile(file);
    setEvidencePreview(URL.createObjectURL(file));
    setResolutionError(null);
    setResolutionSuccess(null);
  };

  const handleRemoveEvidence = useCallback(() => {
    if (evidencePreview) {
      URL.revokeObjectURL(evidencePreview);
    }
    setEvidenceFile(null);
    setEvidencePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [evidencePreview]);

  useEffect(() => {
    return () => {
      if (evidencePreview) {
        URL.revokeObjectURL(evidencePreview);
      }
    };
  }, [evidencePreview]);

  async function handleConfirmResolution(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !issue || resolving || issue.status === "resolved") return;

    setResolving(true);
    setResolutionError(null);
    setResolutionSuccess(null);

    try {
      if (evidenceFile) {
        try {
          await uploadMedia(evidenceFile);
        } catch {
          // Proceed with resolution even if optional media upload fails
        }
      }

      await updateIssue(id, { status: "resolved" });

      if (markWorkOrdersComplete && workOrders.length > 0) {
        const pendingWos = workOrders.filter((wo) => wo.status !== "completed");
        if (selectedWorkOrderIdToComplete === "all") {
          for (const wo of pendingWos) {
            await updateWorkOrder(wo.id, { status: "completed" });
          }
        } else {
          const targetId = Number(selectedWorkOrderIdToComplete);
          if (!isNaN(targetId)) {
            await updateWorkOrder(targetId, { status: "completed" });
          }
        }
      }

      setResolutionSuccess("Issue verified and marked as Resolved.");
      handleRemoveEvidence();
      await fetchIssue();
      await fetchWorkOrders();
    } catch (err) {
      setResolutionError(
        err instanceof ApiError ? err.message : "Failed to confirm resolution. Please try again."
      );
    } finally {
      setResolving(false);
    }
  }

  async function handleCreateWorkOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!issue) return;
    setCreatingWo(true);
    setModalError(null);
    setModalSuccess(null);
    try {
      const payload: {
        issue_id: number;
        department_id?: number;
        assigned_to?: number;
        title?: string;
        description?: string;
        deadline?: string;
      } = {
        issue_id: Number(issue.id),
        department_id: formDeptId,
        title: formTitle.trim() || undefined,
        description: formDescription.trim() || undefined,
      };
      if (formAssignee.trim()) {
        const parsed = Number(formAssignee);
        if (!isNaN(parsed) && parsed > 0) {
          payload.assigned_to = parsed;
        }
      }
      if (formDeadline) {
        payload.deadline = formDeadline;
      }

      await createWorkOrder(payload);
      setModalSuccess("Work order dispatched successfully!");
      await fetchWorkOrders();
      await fetchIssue();
      setTimeout(() => {
        setModalOpen(false);
        setModalSuccess(null);
        setFormAssignee("");
        setFormTitle("");
        setFormDescription("");
        setFormDeadline("");
      }, 700);
    } catch (err) {
      setModalError(
        err instanceof ApiError ? err.message : "Failed to dispatch work order. Please try again."
      );
    } finally {
      setCreatingWo(false);
    }
  }

  async function handleCompleteWorkOrder(e: React.FormEvent) {
    e.preventDefault();
    if (!completingWoId) return;
    setCompletingWo(true);
    try {
      await updateWorkOrder(completingWoId, {
        status: "completed",
        completion_notes: completionNotes.trim() || undefined,
      });
      await fetchWorkOrders();
      await fetchIssue();
      setCompleteModalOpen(false);
      setCompletingWoId(null);
      setCompletionNotes("");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to mark work order as completed.");
    } finally {
      setCompletingWo(false);
    }
  }

  async function handleStatusChange(orderId: number, nextStatus: string) {
    if (nextStatus === "completed") {
      setCompletingWoId(orderId);
      setCompletionNotes("");
      setCompleteModalOpen(true);
      return;
    }
    setUpdatingWoId(orderId);
    try {
      await updateWorkOrder(orderId, { status: nextStatus });
      await fetchWorkOrders();
      await fetchIssue();
    } catch (err) {
      alert(
        err instanceof ApiError ? err.message : "Failed to update work order status. Please try again."
      );
    } finally {
      setUpdatingWoId(null);
    }
  }

  const statusOrder: IssueStatus[] = ["reported", "ai_verified", "assigned", "in_progress", "resolved"];
  const currentIdx = issue ? statusOrder.indexOf(issue.status) : -1;

  // Build list of all evidence items
  const evidenceList: Array<{ url: string; item?: import("@/lib/types").IssueMediaItem }> = [];
  if (issue?.evidence_images && issue.evidence_images.length > 0) {
    issue.evidence_images.forEach((img) => {
      const url = getMediaUrl(img.file_url);
      if (url) evidenceList.push({ url, item: img });
    });
  } else if (issue?.media_urls && issue.media_urls.length > 0) {
    issue.media_urls.forEach((u) => {
      const url = getMediaUrl(u);
      if (url) evidenceList.push({ url });
    });
  } else {
    const rawSingle =
      issue?.media_url ||
      issue?.image_url ||
      issue?.file_url ||
      issue?.imageUrl ||
      issue?.mediaUrl ||
      null;
    const singleUrl = getMediaUrl(rawSingle);
    if (singleUrl) evidenceList.push({ url: singleUrl });
  }

  const currentEvidence = evidenceList[activePhotoIdx] || evidenceList[0];
  const evidenceUrl = currentEvidence?.url || null;

  return (
    <AuthorityShell>
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between gap-4 mb-6">
        <Link
          href="/authority/priority"
          className="focus-ring inline-flex items-center gap-1.5 text-[12.5px] font-mono text-[#8D918F] hover:text-[#F4B52C] transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Priority Queue</span>
        </Link>

        <Link
          href="/authority"
          className="focus-ring text-[12px] font-mono text-[#8D918F] hover:text-[#F3F0E8] transition-colors"
        >
          Command Center
        </Link>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-6 mb-8 animate-pulse">
          <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8">
            <div className="flex items-center justify-between mb-4">
              <div className="h-4 w-28 bg-[#2C2A25] rounded" />
              <div className="h-6 w-24 bg-[#2C2A25] rounded-full" />
            </div>
            <div className="h-8 w-3/4 bg-[#2C2A25] rounded mb-3" />
            <div className="h-4 w-1/2 bg-[#2C2A25] rounded" />
          </div>

          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] h-96" />
            <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] h-96" />
          </div>
        </div>
      )}

      {/* Error / Not Found Notice */}
      {!loading && (error || !issue) && (
        <div className="rounded-2xl border border-[#B23A2C]/30 bg-[#151718] p-8 sm:p-12 text-center max-w-lg mx-auto my-8">
          <div className="h-12 w-12 rounded-2xl bg-[#B23A2C]/10 text-[#B23A2C] mx-auto flex items-center justify-center mb-4">
            <AlertTriangle size={24} />
          </div>
          <h2 className="text-xl font-bold text-[#F3F0E8] mb-2">Issue Record Unavailable</h2>
          <p className="text-[13.5px] text-[#8D918F] mb-6" role="alert">
            {error || "The requested municipal issue record could not be found."}
          </p>
          <div className="flex justify-center gap-3">
            {id && (
              <Button onClick={fetchIssue} variant="secondary" size="sm" className="gap-1.5">
                <RefreshCw size={14} />
                <span>Retry</span>
              </Button>
            )}
            <Button href="/authority/priority" size="sm">
              Back to Queue
            </Button>
          </div>
        </div>
      )}

      {/* Issue Intelligence Content */}
      {!loading && !error && issue && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 mb-5 border-b border-[#2C2A25]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="font-mono text-[12px] font-bold text-[#F4B52C] bg-[#F4B52C]/10 border border-[#F4B52C]/30 px-2.5 py-1 rounded-md">
                  ISSUE #{issue.id}
                </span>
                <StatusPill tone={statusTone[issue.status] || "neutral"} size="md">
                  {issue.status.replace("_", " ")}
                </StatusPill>
                {issue.severity && <SeverityBadge severity={issue.severity} />}
                <span className="font-mono text-[11.5px] font-bold px-2 py-0.5 rounded bg-[#1C1F21] border border-[#2C2A25] text-[#F4B52C]">
                  Priority P-{issue.priorityScore}
                </span>
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
              {issue.category && (
                <span>
                  • Category: <strong className="text-[#F3F0E8] font-medium">{issue.category}</strong>
                </span>
              )}
              {issue.department && (
                <span className="flex items-center gap-1.5">
                  • <Building2 size={13} />
                  <span>
                    Department: <strong className="text-[#F3F0E8] font-medium">{issue.department}</strong>
                  </span>
                </span>
              )}
            </div>
          </div>

          {/* Two-Column Layout */}
          <div className="grid lg:grid-cols-[1.3fr_1fr] gap-6 items-start">
            {/* Left Column: Evidence, Metadata, Problem Description, AI Intelligence, GIS & Related Reports */}
            <div className="space-y-6">
              {/* Uploaded Evidence Section */}
              <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-[#2C2A25]">
                  <div className="flex items-center gap-2">
                    <Camera size={16} className="text-[#F4B52C]" />
                    <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                      Citizen Photographic Evidence
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#8D918F] bg-[#1C1F21] px-2.5 py-0.5 rounded-full border border-[#2C2A25]">
                      {evidenceList.length} {evidenceList.length === 1 ? "Image" : "Images"} Attached
                    </span>
                    {evidenceList.length > 0 && (
                      <span className="text-[11px] font-mono text-[#F4B52C] bg-[#F4B52C]/10 px-2 py-0.5 rounded border border-[#F4B52C]/30">
                        Selected: {activePhotoIdx + 1} of {evidenceList.length}
                      </span>
                    )}
                  </div>
                </div>

                {evidenceUrl && !imageError ? (
                  <div className="space-y-4">
                    {/* Main Selected Image Viewer */}
                    <div className="relative rounded-xl overflow-hidden border border-[#2C2A25] bg-[#121415] min-h-[260px] max-h-[420px] group flex items-center justify-center">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={evidenceUrl}
                        alt={`Evidence for issue #${issue.id} - Photo ${activePhotoIdx + 1}`}
                        className="w-full h-auto max-h-[400px] object-contain mx-auto transition-transform group-hover:scale-[1.01]"
                        onError={() => setImageError(true)}
                      />
                      <div className="absolute top-2.5 left-2.5 inline-flex items-center gap-1.5 text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#0D0F10]/80 text-[#F3F0E8] border border-[#2C2A25] backdrop-blur-sm">
                        <span>Image {activePhotoIdx + 1}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setLightboxOpen(true)}
                        className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 text-[11px] font-mono px-2.5 py-1 rounded-md bg-[#0D0F10]/80 text-[#F3F0E8] border border-[#2C2A25] backdrop-blur-sm hover:bg-[#151718] transition-colors cursor-pointer"
                      >
                        <Maximize2 size={12} />
                        <span>Expand View</span>
                      </button>
                    </div>

                    {/* Multi-Photo Thumbnails (1 to 5 images) */}
                    {evidenceList.length > 1 && (
                      <div>
                        <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-2 font-medium">
                          Select Evidence Image to Inspect
                        </div>
                        <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                          {evidenceList.map((ev, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setActivePhotoIdx(i);
                                setImageError(false);
                              }}
                              className={`relative group rounded-lg overflow-hidden border-2 shrink-0 transition-all cursor-pointer p-0.5 ${
                                i === activePhotoIdx
                                  ? "border-[#F4B52C] ring-2 ring-[#F4B52C]/40 bg-[#F4B52C]/10 scale-105"
                                  : "border-[#2C2A25] bg-[#1C1F21] opacity-70 hover:opacity-100"
                              }`}
                            >
                              <div className="h-16 w-16 rounded overflow-hidden relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={ev.url}
                                  alt={`Evidence Thumbnail ${i + 1}`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-0 inset-x-0 bg-black/75 text-[9.5px] font-mono text-center py-0.5 text-[#F3F0E8]">
                                  Image {i + 1}
                                </div>
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Selected Evidence Metadata Card */}
                    <div className="rounded-xl border border-[#2C2A25] bg-[#121415] p-4 space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-[#2C2A25]">
                        <div className="flex items-center gap-2">
                          <ShieldCheck size={14} className="text-[#F4B52C]" />
                          <span className="text-[12px] font-semibold text-[#F3F0E8]">
                            Selected Evidence Metadata • Image {activePhotoIdx + 1}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono text-[#8D918F]">
                          {[currentEvidence?.item?.camera_make, currentEvidence?.item?.camera_model].filter(Boolean).join(" ") || "Camera metadata on file"}
                        </span>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3 text-[12px]">
                        {/* Location Verification Signals */}
                        <div className="p-3 rounded-lg bg-[#1C1F21] border border-[#2C2A25] space-y-2">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] font-semibold flex items-center justify-between">
                            <span>Location Evidence</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getGPSStatusBadge(currentEvidence?.item?.evidence_verification?.gps.status).color}`}>
                              {getGPSStatusBadge(currentEvidence?.item?.evidence_verification?.gps.status).label}
                            </span>
                          </div>
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[#8D918F]">Device location:</span>
                              <span className="font-mono text-[#F3F0E8]">
                                {formatCoords(currentEvidence?.item?.device_latitude, currentEvidence?.item?.device_longitude)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#8D918F]">EXIF location:</span>
                              <span className="font-mono text-[#F3F0E8]">
                                {formatCoords(currentEvidence?.item?.exif_latitude, currentEvidence?.item?.exif_longitude)}
                              </span>
                            </div>
                            {typeof currentEvidence?.item?.evidence_verification?.gps.distance_meters === "number" && (
                              <div className="flex items-center justify-between text-[11px] text-[#8D918F] pt-1 border-t border-[#2C2A25]">
                                <span>GPS delta:</span>
                                <span className="font-mono text-[#F3F0E8]">
                                  ~{Math.round(currentEvidence.item.evidence_verification.gps.distance_meters)}m
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Temporal Verification Signals */}
                        <div className="p-3 rounded-lg bg-[#1C1F21] border border-[#2C2A25] space-y-2">
                          <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] font-semibold flex items-center justify-between">
                            <span>Time Evidence</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${getTimeStatusBadge(currentEvidence?.item?.evidence_verification?.capture_time.status).color}`}>
                              {getTimeStatusBadge(currentEvidence?.item?.evidence_verification?.capture_time.status).label}
                            </span>
                          </div>
                          <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[#8D918F]">Device capture time:</span>
                              <span className="font-mono text-[#F3F0E8] text-[11px]">
                                {formatEvidenceDate(currentEvidence?.item?.device_captured_at)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[#8D918F]">EXIF capture time:</span>
                              <span className="font-mono text-[#F3F0E8] text-[11px]">
                                {formatEvidenceDate(currentEvidence?.item?.exif_captured_at)}
                              </span>
                            </div>
                            {typeof currentEvidence?.item?.evidence_verification?.capture_time.difference_seconds === "number" && (
                              <div className="flex items-center justify-between text-[11px] text-[#8D918F] pt-1 border-t border-[#2C2A25]">
                                <span>Time delta:</span>
                                <span className="font-mono text-[#F3F0E8]">
                                  {Math.abs(currentEvidence.item.evidence_verification.capture_time.difference_seconds)}s
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Camera Device Details */}
                      <div className="p-2.5 rounded-lg bg-[#1C1F21]/60 border border-[#2C2A25] flex items-center justify-between text-[11.5px]">
                        <span className="text-[#8D918F]">Camera Device:</span>
                        <span className="font-mono text-[#F3F0E8]">
                          {[currentEvidence?.item?.camera_make, currentEvidence?.item?.camera_model].filter(Boolean).join(" ") || "Unavailable"}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : imageError ? (
                  <div className="p-6 rounded-xl bg-[#121415] border border-[#B23A2C]/30 text-center">
                    <ImageOff size={24} className="text-[#B23A2C] mx-auto mb-2" />
                    <div className="text-[13px] font-medium text-[#F4F1E8] mb-1">
                      Evidence Image Unavailable
                    </div>
                    <p className="text-[12px] text-[#8D918F] max-w-sm mx-auto">
                      Could not load the image from the media storage endpoint.
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

              {/* Citizen Problem Description */}
              <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
                <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold mb-3 flex items-center gap-1.5">
                  <FileText size={14} />
                  <span>Citizen Report Description</span>
                </h3>
                <p className="text-[14px] text-[#F3F0E8] leading-relaxed whitespace-pre-wrap">
                  {issue.description || "No written description provided by the reporting citizen."}
                </p>
              </div>

              {/* AI-Assisted Assessment & Priority Intelligence */}
              <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-[#2C2A25]">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[#F4B52C]" />
                    <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                      AI Assessment & Priority Intelligence
                    </h3>
                  </div>
                  <span className="text-[10.5px] font-mono text-[#8D918F] bg-[#1C1F21] px-2 py-0.5 rounded border border-[#2C2A25]">
                    Operational Heuristic
                  </span>
                </div>

                {/* Metric Summary Tiles */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[13px]">
                  <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                    <div className="text-[11px] text-[#8D918F] mb-1">Detected Category</div>
                    <div className="font-semibold text-[#F3F0E8] capitalize truncate">
                      {issue.category || "General Defect"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                    <div className="text-[11px] text-[#8D918F] mb-1">AI Confidence</div>
                    <div className="font-mono font-bold text-[#F4B52C]">
                      {typeof issue.confidence === "number" ? `${issue.confidence}%` : "Unavailable"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                    <div className="text-[11px] text-[#8D918F] mb-1">Severity Score</div>
                    <div className="font-mono font-bold text-[#F3F0E8]">
                      {typeof issue.severityScore === "number" ? `${issue.severityScore}/100` : "Unavailable"}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                    <div className="text-[11px] text-[#8D918F] mb-1">Priority Index</div>
                    <div className="font-mono font-bold text-[#F4B52C]">
                      {typeof issue.priorityScore === "number" ? `P-${issue.priorityScore}/100` : "Unavailable"}
                    </div>
                  </div>
                </div>

                {/* Priority Explanation: Why this issue has this priority */}
                <div className="p-4 rounded-xl bg-[#121415] border border-[#2C2A25] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-[#2C2A25]">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-[#F4B52C]" />
                      <h4 className="text-[12px] font-semibold text-[#F3F0E8]">
                        Why this issue has this priority (P-{issue.priorityScore ?? "—"})
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono text-[#8D918F]">
                      Severity: <strong className="text-[#F3F0E8] capitalize">{issue.severity || "Unavailable"}</strong>
                    </span>
                  </div>

                  <ul className="grid sm:grid-cols-2 gap-2 text-[12px] text-[#F3F0E8]">
                    <li className="flex items-start gap-2 p-2 rounded-lg bg-[#1C1F21]/70 border border-[#2C2A25]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-[#F3F0E8]">Structural Defect Severity: </span>
                        <span className="text-[#8D918F]">
                          {issue.severity.toUpperCase()} ({issue.severityScore}/100 base score)
                        </span>
                      </div>
                    </li>

                    <li className="flex items-start gap-2 p-2 rounded-lg bg-[#1C1F21]/70 border border-[#2C2A25]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-[#F3F0E8]">Community Report Volume: </span>
                        <span className="text-[#8D918F]">
                          {typeof issue.duplicateCount === "number" && issue.duplicateCount > 0
                            ? `${issue.duplicateCount} merged citizen reports`
                            : "Single initial report logged"}
                        </span>
                      </div>
                    </li>

                    <li className="flex items-start gap-2 p-2 rounded-lg bg-[#1C1F21]/70 border border-[#2C2A25]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-[#F3F0E8]">Location & Ward Zone: </span>
                        <span className="text-[#8D918F]">
                          {issue.ward ? `${issue.ward} (Municipal Jurisdiction)` : "Unassigned Zone"}
                        </span>
                      </div>
                    </li>

                    <li className="flex items-start gap-2 p-2 rounded-lg bg-[#1C1F21]/70 border border-[#2C2A25]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] mt-1.5 shrink-0" />
                      <div>
                        <span className="font-medium text-[#F3F0E8]">Complaint Age & Status: </span>
                        <span className="text-[#8D918F]">
                          Reported {issue.reportedAt ? new Date(issue.reportedAt).toLocaleDateString() : "Recently"} ({issue.status.replace("_", " ")})
                        </span>
                      </div>
                    </li>
                  </ul>
                </div>

                {/* Structural Severity Breakdown Factors */}
                {issue.severityFactors && issue.severityFactors.length > 0 && (
                  <div className="pt-2 border-t border-[#2C2A25]">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-3 font-semibold">
                      Structural Severity Factors (Base Defect Weight)
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

                {/* Priority Urgency Factors */}
                {issue.priorityFactors && issue.priorityFactors.length > 0 && (
                  <div className="pt-2 border-t border-[#2C2A25]">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-3 font-semibold">
                      Urgency & Dispatch Factors (Priority Weighting)
                    </div>
                    <div className="space-y-2.5">
                      {issue.priorityFactors.map((factor) => (
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

              {/* Report Location & GIS Profile */}
              <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2A25]">
                  <div className="flex items-center gap-2">
                    <Navigation size={16} className="text-[#F4B52C]" />
                    <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                      Report Location & GIS Profile
                    </h3>
                  </div>
                  <span className="text-[10.5px] font-mono text-[#8D918F] bg-[#1C1F21] px-2 py-0.5 rounded border border-[#2C2A25]">
                    Citizen Submission Location
                  </span>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 text-[13px]">
                  <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                    <div className="text-[11px] text-[#8D918F] mb-1">Municipal Ward</div>
                    <div className="font-medium text-[#F3F0E8]">{issue.ward || "Unassigned"}</div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#1C1F21] border border-[#2C2A25]">
                    <div className="text-[11px] text-[#8D918F] mb-1">Report GPS Coordinates</div>
                    <div className="font-mono text-[#F3F0E8] text-[12px]">
                      {typeof issue.lat === "number" && typeof issue.lng === "number"
                        ? `${issue.lat.toFixed(5)}, ${issue.lng.toFixed(5)}`
                        : "GIS coordinates on file"}
                    </div>
                  </div>
                </div>
              </div>

              {/* Possible Related Reports Section */}
              {((issue.duplicate_assessment?.matches && issue.duplicate_assessment.matches.length > 0) || (typeof issue.duplicateCount === "number" && issue.duplicateCount > 0)) && (
                <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#2C2A25]">
                    <div className="flex items-center gap-2">
                      <Layers size={16} className="text-[#F4B52C]" />
                      <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                        Possible Related Reports
                      </h3>
                    </div>
                    <span className="text-[11px] font-mono text-[#8D918F] bg-[#1C1F21] px-2.5 py-0.5 rounded-full border border-[#2C2A25]">
                      {issue.duplicate_assessment?.matches?.length || issue.duplicateCount} Detected
                    </span>
                  </div>

                  {issue.duplicate_assessment?.matches && issue.duplicate_assessment.matches.length > 0 ? (
                    <div className="space-y-3">
                      {issue.duplicate_assessment.matches.map((match) => (
                        <div
                          key={match.issue_id}
                          className="rounded-xl border border-[#2C2A25] bg-[#1C1F21] p-4 text-[13px] space-y-3 transition-colors hover:border-[#F4B52C]/40"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[12px] font-bold text-[#F4B52C] bg-[#F4B52C]/10 border border-[#F4B52C]/30 px-2 py-0.5 rounded">
                                Issue #{match.issue_id}
                              </span>
                              <span className="text-[12px] font-semibold text-[#F3F0E8]">
                                {match.category || issue.category}
                              </span>
                              <span className="text-[11px] font-mono text-[#8D918F] bg-[#151718] px-2 py-0.5 rounded border border-[#2C2A25]">
                                Possible related report
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[11.5px] font-mono font-medium text-[#F4B52C]">
                                {Math.round(match.similarity_score * 100)}% Similarity
                              </span>
                              <Link
                                href={`/authority/issues/${match.issue_id}`}
                                className="focus-ring inline-flex items-center gap-1 text-[11.5px] font-mono px-2.5 py-1 rounded-md bg-[#F4B52C]/10 text-[#F4B52C] border border-[#F4B52C]/30 hover:bg-[#F4B52C]/20 transition-colors cursor-pointer"
                              >
                                <FileText size={12} />
                                <span>View Issue</span>
                              </Link>
                            </div>
                          </div>

                          {/* Explainable similarity signals */}
                          {match.reasons && match.reasons.length > 0 && (
                            <div className="pt-2 border-t border-[#2C2A25] space-y-1">
                              <div className="text-[10.5px] font-mono uppercase tracking-wider text-[#8D918F]">
                                Similarity Signals:
                              </div>
                              <ul className="grid sm:grid-cols-2 gap-1.5 text-[11.5px] text-[#F3F0E8]">
                                {match.reasons.map((reason, rIdx) => (
                                  <li key={rIdx} className="flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-[#F4B52C] shrink-0" />
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-[#1C1F21] border border-[#2C2A25] flex items-start gap-3">
                      <Layers size={16} className="text-[#F4B52C] shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-[13px] font-semibold text-[#F3F0E8]">
                          Duplicate Cluster
                        </h4>
                        <p className="text-[12px] text-[#8D918F] leading-relaxed">
                          {issue.duplicateCount} nearby citizen reports have been recorded in this vicinity.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Column: Status Lifecycle, Work Orders, & Resolution Confirmation */}
            <div className="space-y-6">
              {/* Status Milestone Stepper & Quick Status Update */}
              <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2A25]">
                  <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                    Issue Status & Milestone
                  </h3>
                  <span className="text-[11px] font-mono text-[#8D918F]">
                    Stage {currentIdx + 1} of 5
                  </span>
                </div>

                <div className="space-y-3.5 mb-6">
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
                              className={`w-0.5 h-6 my-1 transition-colors ${
                                idx < currentIdx ? "bg-[#4C7A5E]" : "bg-[#2C2A25]"
                              }`}
                            />
                          )}
                        </div>

                        <div className="flex-1 pb-0.5">
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
                          <p className="text-[11px] text-[#8D918F] leading-normal">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Quick Status Update Form */}
                <div className="pt-4 border-t border-[#2C2A25]">
                  <div className="text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-2 font-semibold">
                    Override Issue Status
                  </div>
                  <form onSubmit={handleStatusUpdate} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedStatus}
                        onChange={(e) => {
                          setSelectedStatus(e.target.value as IssueStatus);
                          setStatusUpdateError(null);
                          setStatusUpdateSuccess(null);
                        }}
                        disabled={statusUpdating}
                        aria-label="Update issue status"
                        className="focus-ring flex-1 bg-[#1C1F21] border border-[#2C2A25] rounded-xl px-3 py-2 text-[12.5px] text-[#F3F0E8] cursor-pointer disabled:opacity-50"
                      >
                        {statusSteps.map((s) => (
                          <option key={s.key} value={s.key}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={statusUpdating || selectedStatus === issue.status}
                      >
                        {statusUpdating ? "Saving…" : "Save"}
                      </Button>
                    </div>

                    {statusUpdateError && (
                      <p className="text-[12px] text-[#B23A2C]" role="alert">
                        {statusUpdateError}
                      </p>
                    )}

                    {statusUpdateSuccess && (
                      <p className="text-[12px] text-[#4C7A5E] font-medium" role="status">
                        {statusUpdateSuccess}
                      </p>
                    )}
                  </form>
                </div>
              </div>

              {/* Work Orders Management */}
              <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2A25]">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-[#F4B52C]" />
                    <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                      Municipal Work Orders
                    </h3>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1 text-[11.5px]"
                    onClick={() => {
                      setModalError(null);
                      setModalSuccess(null);
                      setModalOpen(true);
                    }}
                  >
                    <Plus size={13} />
                    <span>Create WO</span>
                  </Button>
                </div>

                <div className="text-[12.5px] text-[#8D918F] mb-3">
                  Department:{" "}
                  <strong className="text-[#F3F0E8] font-medium">
                    {issue.department ? `${issue.department} Department` : "Unassigned"}
                  </strong>
                </div>

                {workOrdersLoading && (
                  <div className="py-4 text-center text-[12px] font-mono text-[#8D918F] animate-pulse">
                    Loading work orders…
                  </div>
                )}

                {!workOrdersLoading && workOrdersError && (
                  <div className="py-3 text-center">
                    <p className="text-[12.5px] text-[#B23A2C] mb-2" role="alert">
                      {workOrdersError}
                    </p>
                    <Button onClick={fetchWorkOrders} size="sm" variant="secondary">
                      Retry
                    </Button>
                  </div>
                )}

                {!workOrdersLoading && !workOrdersError && workOrders.length === 0 && (
                  <div className="p-4 rounded-xl bg-[#1C1F21] border border-[#2C2A25] text-center">
                    <p className="text-[12.5px] text-[#8D918F]">
                      No work orders currently dispatched for this issue.
                    </p>
                  </div>
                )}

                {!workOrdersLoading && !workOrdersError && workOrders.length > 0 && (
                  <div className="space-y-4">
                    {workOrders.map((wo) => {
                      const isPendingOrAssigned = wo.status === "pending" || wo.status === "assigned";
                      const isInProgress = wo.status === "in_progress";
                      const isCompleted = wo.status === "completed" || wo.status === "verification";
                      const isVerified = wo.status === "verified" || wo.status === "resolved";

                      return (
                        <div
                          key={wo.id}
                          className={`rounded-xl border p-4 text-[13px] transition-all duration-200 ${
                            isVerified
                              ? "bg-[#151718]/60 border-[#4C7A5E]/40"
                              : isCompleted
                              ? "bg-[#151718] border-[#F4B52C]/40"
                              : isInProgress
                              ? "bg-[#1C1F21] border-[#F4B52C]/30 shadow-md"
                              : "bg-[#1C1F21] border-[#2C2A25]"
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[12px] font-bold text-[#F3F0E8]">
                                WO #{wo.id}
                              </span>
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#25282A] text-[#8D918F] border border-[#2C2A25]">
                                {wo.department_name || `Dept #${wo.department_id}`}
                              </span>
                            </div>

                            <span
                              className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded tracking-wide ${
                                isVerified
                                  ? "bg-[#4C7A5E]/20 text-[#4C7A5E] border border-[#4C7A5E]/30"
                                  : isCompleted
                                  ? "bg-[#F4B52C]/20 text-[#F4B52C] border border-[#F4B52C]/30"
                                  : isInProgress
                                  ? "bg-[#F4B52C] text-black"
                                  : "bg-[#25282A] text-[#8D918F]"
                              }`}
                            >
                              {wo.status.replace("_", " ")}
                            </span>
                          </div>

                          {wo.title && (
                            <div className="font-semibold text-[#F3F0E8] text-[13.5px] mb-1">
                              {wo.title}
                            </div>
                          )}

                          {wo.description && (
                            <p className="text-[12.5px] text-[#8D918F] mb-3 leading-relaxed">
                              {wo.description}
                            </p>
                          )}

                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11.5px] text-[#8D918F] pt-2.5 border-t border-[#2C2A25] font-mono">
                            <div>
                              Assignee:{" "}
                              <strong className="text-[#F3F0E8] font-medium">
                                {wo.assigned_to_name
                                  ? wo.assigned_to_name
                                  : wo.assigned_to
                                  ? `User #${wo.assigned_to}`
                                  : "Unassigned"}
                              </strong>
                            </div>
                            <div>
                              Deadline:{" "}
                              <strong className="text-[#F3F0E8] font-medium">
                                {wo.deadline ? new Date(wo.deadline).toLocaleDateString() : "None"}
                              </strong>
                            </div>
                            <div>
                              Priority:{" "}
                              <strong className="text-[#F3F0E8] font-medium">
                                {wo.priority || 0}
                              </strong>
                            </div>
                          </div>

                          {/* Timeline Dates */}
                          <div className="flex flex-wrap items-center gap-3 pt-2 text-[10.5px] font-mono text-[#6F6B63]">
                            <span>Created: {new Date(wo.created_at).toLocaleDateString()}</span>
                            {wo.started_at && (
                              <span>• Started: {new Date(wo.started_at).toLocaleDateString()}</span>
                            )}
                            {wo.completed_at && (
                              <span>• Completed: {new Date(wo.completed_at).toLocaleDateString()}</span>
                            )}
                            {wo.verified_at && (
                              <span className="text-[#4C7A5E]">
                                • Verified: {new Date(wo.verified_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>

                          {wo.completion_notes && (
                            <div className="mt-2.5 p-2 rounded-lg bg-[#151718] border border-[#2C2A25] text-[11.5px] font-mono text-[#A6A29A]">
                              <span className="text-[#F4B52C] font-semibold">Completion Notes:</span>{" "}
                              {wo.completion_notes}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-[#2C2A25]">
                            {isPendingOrAssigned && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={updatingWoId === wo.id}
                                onClick={() => handleStatusChange(wo.id, "in_progress")}
                              >
                                {updatingWoId === wo.id ? "Updating…" : "Start Field Work"}
                              </Button>
                            )}

                            {isInProgress && (
                              <Button
                                size="sm"
                                disabled={updatingWoId === wo.id}
                                onClick={() => handleStatusChange(wo.id, "completed")}
                              >
                                Mark Completed
                              </Button>
                            )}

                            {isCompleted && (
                              <Button
                                size="sm"
                                variant="secondary"
                                disabled={updatingWoId === wo.id}
                                onClick={() => handleStatusChange(wo.id, "verified")}
                              >
                                {updatingWoId === wo.id ? "Verifying…" : "Verify & Close"}
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Resolution Confirmation Action */}
              <div className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 shadow-xl">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2A25]">
                  <h3 className="text-[12px] font-mono uppercase tracking-wider text-[#F4B52C] font-semibold">
                    Resolution Verification
                  </h3>
                  {issue.status === "resolved" ? (
                    <StatusPill tone="low">Resolved</StatusPill>
                  ) : (
                    <span className="text-[11px] font-mono text-[#8D918F]">
                      Authority Closeout
                    </span>
                  )}
                </div>

                {issue.status === "resolved" ? (
                  <div className="rounded-xl bg-[#4C7A5E]/10 border border-[#4C7A5E]/30 p-4 space-y-2">
                    <div className="flex items-center gap-2 text-[#4C7A5E] font-semibold text-[13px]">
                      <CheckCircle2 size={16} />
                      <span>Issue Confirmed & Resolved</span>
                    </div>
                    <p className="text-[12px] text-[#8D918F]">
                      All municipal repair milestones for this issue have been marked as completed.
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleConfirmResolution} className="space-y-4">
                    <div>
                      <label className="block text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1.5 font-semibold">
                        Resolution Evidence (Optional After-Photo)
                      </label>

                      {evidencePreview ? (
                        <div className="space-y-2">
                          <div className="relative rounded-xl overflow-hidden border border-[#2C2A25] max-h-48 bg-[#121415]">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={evidencePreview}
                              alt="Resolution evidence preview"
                              className="w-full h-40 object-cover"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11.5px] text-[#8D918F] truncate max-w-[200px]">
                              {evidenceFile?.name}
                            </span>
                            <button
                              type="button"
                              onClick={handleRemoveEvidence}
                              disabled={resolving}
                              className="text-[11.5px] text-[#B23A2C] hover:underline cursor-pointer disabled:opacity-50"
                            >
                              Remove photo
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            disabled={resolving}
                            onChange={handleEvidenceFileChange}
                            aria-label="Upload resolution evidence photo"
                            className="focus-ring block w-full text-[12px] text-[#8D918F] file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-[#2C2A25] file:text-[11.5px] file:font-mono file:bg-[#1C1F21] file:text-[#F3F0E8] hover:file:bg-[#25282A] file:cursor-pointer cursor-pointer disabled:opacity-50"
                          />
                        </div>
                      )}
                    </div>

                    {workOrders.length > 0 && (
                      <div className="pt-2 border-t border-[#2C2A25]">
                        <label className="flex items-start gap-2 cursor-pointer mb-2">
                          <input
                            type="checkbox"
                            checked={markWorkOrdersComplete}
                            disabled={resolving}
                            onChange={(e) => setMarkWorkOrdersComplete(e.target.checked)}
                            className="mt-0.5 rounded border-[#2C2A25] text-[#F4B52C] focus:ring-0 cursor-pointer"
                          />
                          <span className="text-[12.5px] text-[#F3F0E8]">
                            Mark associated work order(s) as Completed
                          </span>
                        </label>

                        {markWorkOrdersComplete && workOrders.length > 1 && (
                          <div className="mt-2 pl-5">
                            <label
                              htmlFor="select-wo-complete"
                              className="block text-[10.5px] font-mono uppercase text-[#8D918F] mb-1"
                            >
                              Target Work Order
                            </label>
                            <select
                              id="select-wo-complete"
                              value={selectedWorkOrderIdToComplete}
                              disabled={resolving}
                              onChange={(e) => setSelectedWorkOrderIdToComplete(e.target.value)}
                              className="focus-ring w-full bg-[#1C1F21] border border-[#2C2A25] rounded-xl px-2.5 py-1.5 text-[12px] text-[#F3F0E8] cursor-pointer disabled:opacity-50"
                            >
                              <option value="all">
                                All incomplete work orders (
                                {workOrders.filter((w) => w.status !== "completed").length})
                              </option>
                              {workOrders.map((wo) => (
                                <option key={wo.id} value={String(wo.id)}>
                                  WO #{wo.id} • {wo.department_name || `Dept #${wo.department_id}`} (
                                  {wo.status})
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    )}

                    {resolutionError && (
                      <p className="text-[12px] text-[#B23A2C]" role="alert">
                        {resolutionError}
                      </p>
                    )}

                    {resolutionSuccess && (
                      <p className="text-[12px] text-[#4C7A5E] font-medium" role="status">
                        {resolutionSuccess}
                      </p>
                    )}

                    <div className="pt-2">
                      <Button
                        type="submit"
                        size="md"
                        className="w-full justify-center gap-2"
                        disabled={resolving}
                      >
                        {resolving ? (
                          <>
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Confirming Resolution…</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 size={16} />
                            <span>Confirm Issue Resolution</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal for Photo Evidence */}
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

            <div className="relative w-full flex items-center justify-center">
              {/* Prev Button */}
              {evidenceList.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) => (prev > 0 ? prev - 1 : evidenceList.length - 1))
                  }
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#151718]/80 text-[#F3F0E8] border border-[#2C2A25] hover:bg-[#25282A] transition-colors cursor-pointer z-10"
                >
                  <ChevronLeft size={20} />
                </button>
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={evidenceUrl}
                alt={`Expanded evidence for issue #${issue?.id} - Photo ${activePhotoIdx + 1}`}
                className="max-h-[75vh] w-auto max-w-full rounded-xl border border-[#2C2A25] object-contain shadow-2xl"
              />

              {/* Next Button */}
              {evidenceList.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setActivePhotoIdx((prev) => (prev < evidenceList.length - 1 ? prev + 1 : 0))
                  }
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-[#151718]/80 text-[#F3F0E8] border border-[#2C2A25] hover:bg-[#25282A] transition-colors cursor-pointer z-10"
                >
                  <ChevronRight size={20} />
                </button>
              )}
            </div>

            {/* Photo Indicator & Thumbnails in Lightbox */}
            <div className="mt-3 flex flex-col items-center gap-2">
              <div className="text-center text-[12.5px] font-mono text-[#8D918F]">
                Issue #{issue?.id} • Photo {activePhotoIdx + 1} of {evidenceList.length} • {issue?.title} ({issue?.ward})
              </div>

              {evidenceList.length > 1 && (
                <div className="flex items-center gap-2">
                  {evidenceList.map((ev, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActivePhotoIdx(idx)}
                      className={`h-10 w-10 rounded-md overflow-hidden border-2 transition-all cursor-pointer ${
                        idx === activePhotoIdx
                          ? "border-[#F4B52C] scale-105"
                          : "border-[#2C2A25] opacity-50 hover:opacity-100"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ev.url}
                        alt={`Lightbox thumb ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Work Order Modal */}
      {modalOpen && issue && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2A25]">
              <div className="flex items-center gap-2">
                <Wrench size={18} className="text-[#F4B52C]" />
                <h3 id="modal-title" className="text-[17px] font-bold text-[#F3F0E8]">
                  Dispatch Work Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="text-[#8D918F] hover:text-[#F3F0E8] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-[12.5px] text-[#8D918F] mb-5">
              Issue #{issue.id}: <strong className="text-[#F3F0E8]">{issue.title}</strong>
            </p>

            <form onSubmit={handleCreateWorkOrder} className="space-y-4">
              <div>
                <label
                  htmlFor="wo-dept"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1.5 font-semibold"
                >
                  Target Department
                </label>
                <select
                  id="wo-dept"
                  value={formDeptId}
                  onChange={(e) => setFormDeptId(Number(e.target.value))}
                  disabled={creatingWo}
                  className="focus-ring w-full bg-[#1C1F21] border border-[#2C2A25] rounded-xl px-3 py-2 text-[13px] text-[#F3F0E8] cursor-pointer disabled:opacity-50"
                >
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} Department
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="wo-title"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1.5 font-semibold"
                >
                  Field Action Title (Optional)
                </label>
                <input
                  id="wo-title"
                  type="text"
                  placeholder={`e.g. Repair ${issue.category} #${issue.id}`}
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  disabled={creatingWo}
                  className="focus-ring w-full bg-[#1C1F21] border border-[#2C2A25] rounded-xl px-3 py-2 text-[13px] text-[#F3F0E8] placeholder-[#8D918F]/60 disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="wo-desc"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1.5 font-semibold"
                >
                  Work Instructions / Description (Optional)
                </label>
                <textarea
                  id="wo-desc"
                  rows={3}
                  placeholder="Provide field crew instructions or repair specifications..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  disabled={creatingWo}
                  className="focus-ring w-full bg-[#1C1F21] border border-[#2C2A25] rounded-xl px-3 py-2 text-[13px] text-[#F3F0E8] placeholder-[#8D918F]/60 disabled:opacity-50 resize-none"
                />
              </div>

              <div>
                <label
                  htmlFor="wo-assignee"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1.5 font-semibold"
                >
                  Assignee User ID (Optional)
                </label>
                <input
                  id="wo-assignee"
                  type="number"
                  min="1"
                  placeholder="e.g. 101"
                  value={formAssignee}
                  onChange={(e) => setFormAssignee(e.target.value)}
                  disabled={creatingWo}
                  className="focus-ring w-full bg-[#1C1F21] border border-[#2C2A25] rounded-xl px-3 py-2 text-[13px] text-[#F3F0E8] placeholder-[#8D918F]/60 disabled:opacity-50"
                />
              </div>

              <div>
                <label
                  htmlFor="wo-deadline"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1.5 font-semibold"
                >
                  Completion Deadline (Optional)
                </label>
                <input
                  id="wo-deadline"
                  type="date"
                  value={formDeadline}
                  onChange={(e) => setFormDeadline(e.target.value)}
                  disabled={creatingWo}
                  className="focus-ring w-full bg-[#1C1F21] border border-[#2C2A25] rounded-xl px-3 py-2 text-[13px] text-[#F3F0E8] disabled:opacity-50"
                />
              </div>

              {modalError && (
                <p className="text-[12.5px] text-[#B23A2C]" role="alert">
                  {modalError}
                </p>
              )}

              {modalSuccess && (
                <p className="text-[12.5px] text-[#4C7A5E] font-medium" role="status">
                  {modalSuccess}
                </p>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2C2A25]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={creatingWo}
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={creatingWo}>
                  {creatingWo ? "Dispatching…" : "Dispatch Work Order"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Complete Work Order Modal */}
      {completeModalOpen && completingWoId && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="complete-modal-title"
            className="rounded-2xl border border-[#2C2A25] bg-[#151718] p-6 sm:p-8 max-w-md w-full shadow-2xl relative"
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#2C2A25]">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-[#F4B52C]" />
                <h3 id="complete-modal-title" className="text-[17px] font-bold text-[#F3F0E8]">
                  Mark WO #{completingWoId} Completed
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCompleteModalOpen(false);
                  setCompletingWoId(null);
                }}
                className="text-[#8D918F] hover:text-[#F3F0E8] cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCompleteWorkOrder} className="space-y-4">
              <div>
                <label
                  htmlFor="wo-completion-notes"
                  className="block text-[11px] font-mono uppercase tracking-wider text-[#8D918F] mb-1.5 font-semibold"
                >
                  Completion Notes / Field Action Summary
                </label>
                <textarea
                  id="wo-completion-notes"
                  rows={4}
                  placeholder="Detail repair actions performed by field crew, materials used, or observations..."
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  disabled={completingWo}
                  className="focus-ring w-full bg-[#1C1F21] border border-[#2C2A25] rounded-xl px-3 py-2 text-[13px] text-[#F3F0E8] placeholder-[#8D918F]/60 disabled:opacity-50 resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#2C2A25]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  disabled={completingWo}
                  onClick={() => {
                    setCompleteModalOpen(false);
                    setCompletingWoId(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={completingWo}>
                  {completingWo ? "Submitting…" : "Confirm Completion"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AuthorityShell>
  );
}
