from datetime import datetime
from pydantic import BaseModel


class WorkOrderCreateRequest(BaseModel):
    issue_id: int
    department_id: int | None = None  # defaults to the issue's own department if omitted
    assigned_to: int | None = None
    title: str | None = None
    description: str | None = None
    deadline: datetime | None = None


class WorkOrderUpdateRequest(BaseModel):
    status: str | None = None
    assigned_to: int | None = None
    title: str | None = None
    description: str | None = None
    completion_notes: str | None = None
    deadline: datetime | None = None


class ResolutionEvidenceRequest(BaseModel):
    before_image_url: str | None = None
    after_image_url: str | None = None


class WorkOrderOut(BaseModel):
    id: int
    issue_id: int
    issue_title: str | None = None
    issue_category: str | None = None
    issue_severity: str | None = None
    issue_priority: int | None = None
    issue_state: str | None = None
    issue_district: str | None = None
    department_id: int
    department_name: str
    assigned_to: int | None = None
    assigned_to_name: str | None = None
    title: str | None = None
    description: str | None = None
    completion_notes: str | None = None
    priority: int
    deadline: datetime | None = None
    status: str
    started_at: datetime | None = None
    completed_at: datetime | None = None
    verified_at: datetime | None = None
    verified_by: int | None = None
    created_at: datetime
    updated_at: datetime | None = None
