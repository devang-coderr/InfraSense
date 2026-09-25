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
    media_id: int | None = None
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
    is_baseline: bool = True
    note: str = "Baseline/placeholder result — no trained model is wired in yet."


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
    media_id: int | None = None
    media_url: str | None = None
    file_url: str | None = None
    image_url: str | None = None


class IssueListResponse(BaseModel):
    items: list[IssueOut]
    total: int
