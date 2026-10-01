from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import SeverityFactorOut, PriorityFactorOut


class IssueCreateRequest(BaseModel):
    """
    What the citizen's report form (app/citizen/report) sends.
    `reported_by` is deliberately NOT accepted here — the backend takes the
    user id from the JWT (see routes/issues.py), never from the client.
    """

    description: str = Field(default="", max_length=2000)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    state: str | None = None
    district: str | None = None
    media_id: int | None = None
    media_ids: list[int] | None = None
    # Optional: if the frontend already ran POST /ai/analyze-image first
    # (as the ReportForm flow does) it can pass that result along so we
    # don't analyze twice. If omitted, the backend runs it itself.
    ai_category: str | None = None
    ai_confidence: int | None = None


class IssueUpdateRequest(BaseModel):
    """Authority/officer status or assignment update (PATCH /issues/{id})."""

    status: str | None = None
    department_id: int | None = None


class AIAnalyzeResult(BaseModel):
    category: str
    confidence: int
    severity: str
    severity_score: int
    is_baseline: bool = False
    note: str = "Classified with EfficientNet-B0 transfer learning model."


class GPSVerificationOut(BaseModel):
    device_available: bool
    exif_available: bool
    distance_meters: float | None = None
    status: str = "unavailable"


class TimeVerificationOut(BaseModel):
    device_available: bool
    exif_available: bool
    difference_seconds: int | None = None
    status: str = "unavailable"


class EvidenceVerificationOut(BaseModel):
    gps: GPSVerificationOut
    capture_time: TimeVerificationOut


class IssueMediaItem(BaseModel):
    id: int
    file_url: str
    media_type: str = "image"
    device_latitude: float | None = None
    device_longitude: float | None = None
    device_captured_at: str | None = None
    exif_latitude: float | None = None
    exif_longitude: float | None = None
    exif_captured_at: str | None = None
    camera_make: str | None = None
    camera_model: str | None = None
    evidence_verification: EvidenceVerificationOut | None = None


class DuplicateSignalMatchOut(BaseModel):
    issue_id: str
    category_match: bool
    category: str
    distance_meters: float | None = None
    location_nearby: bool = False
    time_difference_seconds: int | None = None
    time_recent: bool = False
    image_similarity: float | None = None
    image_strong_match: bool = False
    similarity_score: float
    reasons: list[str] = Field(default_factory=list)


class DuplicateAssessmentOut(BaseModel):
    status: str = "no_clear_match"  # "possible_duplicate" | "no_clear_match" | "insufficient_evidence"
    matched_issue_id: str | None = None
    matches: list[DuplicateSignalMatchOut] = Field(default_factory=list)


class CitizenWorkOrderOut(BaseModel):
    id: int
    department_name: str | None = None
    status: str
    title: str | None = None
    created_at: str | None = None
    started_at: str | None = None
    completed_at: str | None = None
    verified_at: str | None = None
    completion_notes: str | None = None


class IssueOut(BaseModel):
    """
    Field names/casing here are copied 1:1 from the frontend's
    `Issue` interface in lib/types.ts, so the frontend API layer can pass
    this JSON straight through as that type with (almost) no reshaping.
    """

    id: str
    title: str
    category: str
    description: str
    ward: str
    lat: float
    lng: float
    x: float
    y: float
    severity: str
    severityScore: int
    severityFactors: list[SeverityFactorOut]
    priorityScore: int
    priorityFactors: list[PriorityFactorOut]
    confidence: int
    status: str
    department: str
    duplicateCount: int
    reportedAt: str  # ISO-8601 string; frontend formats to "2 days ago" etc.
    imageDescription: str
    state: str | None = None
    district: str | None = None
    media_id: int | None = None
    media_url: str | None = None
    file_url: str | None = None
    image_url: str | None = None
    media_ids: list[int] = Field(default_factory=list)
    media_urls: list[str] = Field(default_factory=list)
    evidence_images: list[IssueMediaItem] = Field(default_factory=list)
    duplicate_assessment: DuplicateAssessmentOut | None = None
    work_order: CitizenWorkOrderOut | None = None
    work_orders: list[CitizenWorkOrderOut] = Field(default_factory=list)


class IssueListResponse(BaseModel):
    items: list[IssueOut]
    total: int
