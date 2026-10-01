from datetime import datetime
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    user_id: int
    issue_id: int | None = None
    type: str
    severity: str | None = None
    title: str
    message: str
    reason: str | None = None
    status: str = "unread"
    is_read: bool
    acknowledged_at: datetime | None = None
    resolved_at: datetime | None = None
    created_at: datetime
    category: str | None = None
    state: str | None = None
    district: str | None = None


class UnreadCountResponse(BaseModel):
    unread_count: int
