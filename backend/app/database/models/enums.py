"""
Enums used across models.

IMPORTANT: IssueStatus, Severity and Department below are copied EXACTLY
from the existing frontend's lib/types.ts. That file is the source of
truth for the UI, so the backend must not invent extra values (e.g. the
10-status workflow from earlier planning notes was simplified down to
match what the frontend actually renders).
"""
import enum


class UserRole(str, enum.Enum):
    CITIZEN = "citizen"
    OFFICER = "officer"
    DEPARTMENT_ADMIN = "department_admin"
    SUPER_ADMIN = "super_admin"


class Severity(str, enum.Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class IssueStatus(str, enum.Enum):
    REPORTED = "reported"
    AI_VERIFIED = "ai_verified"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class DepartmentName(str, enum.Enum):
    ROADS = "Roads"
    ELECTRICAL = "Electrical"
    SANITATION = "Sanitation"
    WATER = "Water"
    TRAFFIC = "Traffic"


class MediaType(str, enum.Enum):
    IMAGE = "image"
    VIDEO = "video"


class WorkOrderStatus(str, enum.Enum):
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    VERIFICATION = "verification"
    RESOLVED = "resolved"
