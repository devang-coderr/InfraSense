from datetime import datetime

from pydantic import BaseModel


class WorkOrderCreateRequest(BaseModel):
    issue_id: int
    department_id: int | None = None  # defaults to the issue's own department if omitted
    assigned_to: int | None = None
    deadline: datetime | None = None


class WorkOrderUpdateRequest(BaseModel):
    status: str | None = None
    assigned_to: int | None = None
    deadline: datetime | None = None


class ResolutionEvidenceRequest(BaseModel):
    before_image_url: str | None = None
    after_image_url: str | None = None


class WorkOrderOut(BaseModel):
    id: int
    issue_id: int
    department_id: int
    department_name: str
    assigned_to: int | None
    priority: int
    deadline: datetime | None
    status: str
    started_at: datetime | None
    completed_at: datetime | None
    created_at: datetime
