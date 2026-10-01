from datetime import datetime, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import require_authority
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.department import Department
from app.database.models.enums import WorkOrderStatus, IssueStatus, UserRole
from app.database.models.issue import Issue
from app.database.models.user import User
from app.database.models.work_order import WorkOrder, ResolutionEvidence
from app.schemas.work_order import (
    WorkOrderCreateRequest,
    WorkOrderUpdateRequest,
    ResolutionEvidenceRequest,
    WorkOrderOut,
)
from app.services.jurisdiction_service import is_issue_in_jurisdiction, apply_jurisdiction_scope
from app.services import alert_service

router = APIRouter(prefix="/api/v1/work-orders", tags=["work_orders"])

VALID_TRANSITIONS: dict[WorkOrderStatus, set[WorkOrderStatus]] = {
    WorkOrderStatus.PENDING: {WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED},
    WorkOrderStatus.ASSIGNED: {WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.COMPLETED},
    WorkOrderStatus.IN_PROGRESS: {WorkOrderStatus.COMPLETED},
    WorkOrderStatus.COMPLETED: {WorkOrderStatus.VERIFIED, WorkOrderStatus.VERIFICATION, WorkOrderStatus.RESOLVED},
    WorkOrderStatus.VERIFICATION: {WorkOrderStatus.VERIFIED, WorkOrderStatus.RESOLVED},
    WorkOrderStatus.VERIFIED: set(),
    WorkOrderStatus.RESOLVED: set(),
}


def _serialize_work_order(wo: WorkOrder) -> WorkOrderOut:
    dept_name = wo.department.name if wo.department else "Unknown"
    assignee_name = wo.assignee.name if wo.assignee else None

    issue_title = None
    issue_category = None
    issue_severity = None
    issue_priority = None
    issue_state = None
    issue_district = None

    if wo.issue:
        issue_title = wo.issue.title
        issue_category = wo.issue.category
        issue_severity = wo.issue.severity.value if wo.issue.severity else None
        issue_priority = int(wo.issue.priority_score or 0)
        issue_state = wo.issue.state
        issue_district = wo.issue.district

    return WorkOrderOut(
        id=wo.id,
        issue_id=wo.issue_id,
        issue_title=issue_title,
        issue_category=issue_category,
        issue_severity=issue_severity,
        issue_priority=issue_priority,
        issue_state=issue_state,
        issue_district=issue_district,
        department_id=wo.department_id,
        department_name=dept_name,
        assigned_to=wo.assigned_to,
        assigned_to_name=assignee_name,
        title=wo.title,
        description=wo.description,
        completion_notes=wo.completion_notes,
        priority=wo.priority,
        deadline=wo.deadline,
        status=wo.status.value,
        started_at=wo.started_at,
        completed_at=wo.completed_at,
        verified_at=wo.verified_at,
        verified_by=wo.verified_by,
        created_at=wo.created_at,
        updated_at=wo.updated_at,
    )


@router.post("")
def create_work_order(
    payload: WorkOrderCreateRequest, user: User = Depends(require_authority), db: Session = Depends(get_db)
):
    issue = db.get(Issue, payload.issue_id)
    if not issue:
        raise AppError("ISSUE_NOT_FOUND", "Issue not found.", 404)

    # Jurisdiction enforcement
    if not is_issue_in_jurisdiction(issue, user):
        raise AppError("ISSUE_NOT_FOUND", "Issue not found.", 404)

    department_id = payload.department_id or issue.department_id
    if department_id is None:
        raise AppError("DEPARTMENT_REQUIRED", "This issue has no department assigned yet.", 422)

    dept = db.get(Department, department_id)
    if not dept:
        raise AppError("DEPARTMENT_NOT_FOUND", "Department not found.", 404)

    initial_status = WorkOrderStatus.ASSIGNED if payload.assigned_to else WorkOrderStatus.PENDING

    wo = WorkOrder(
        issue_id=issue.id,
        department_id=department_id,
        assigned_to=payload.assigned_to,
        title=payload.title or f"Repair {issue.category} #{issue.id}",
        description=payload.description,
        priority=int(issue.priority_score or 0),
        deadline=payload.deadline,
        status=initial_status,
    )
    db.add(wo)
    if payload.assigned_to:
        issue.status = IssueStatus.ASSIGNED

    db.commit()
    db.refresh(wo)
    return ok(_serialize_work_order(wo).model_dump(), "Work order created")


@router.get("")
def list_work_orders(
    issue_id: int | None = Query(None),
    status: str | None = Query(None),
    user: User = Depends(require_authority),
    db: Session = Depends(get_db),
):
    query = db.query(WorkOrder).join(Issue, WorkOrder.issue_id == Issue.id)

    # Jurisdiction filter
    query = apply_jurisdiction_scope(query, user, Issue)

    if issue_id is not None:
        query = query.filter(WorkOrder.issue_id == issue_id)

    if status is not None:
        query = query.filter(WorkOrder.status == status)

    orders = query.order_by(WorkOrder.created_at.desc()).all()
    return ok([_serialize_work_order(wo).model_dump() for wo in orders])


@router.get("/{work_order_id}")
def get_work_order(work_order_id: int, user: User = Depends(require_authority), db: Session = Depends(get_db)):
    wo = db.get(WorkOrder, work_order_id)
    if not wo:
        raise AppError("WORK_ORDER_NOT_FOUND", "Work order not found.", 404)

    if wo.issue and not is_issue_in_jurisdiction(wo.issue, user):
        raise AppError("WORK_ORDER_NOT_FOUND", "Work order not found.", 404)

    return ok(_serialize_work_order(wo).model_dump())


@router.patch("/{work_order_id}")
def update_work_order(
    work_order_id: int,
    payload: WorkOrderUpdateRequest,
    user: User = Depends(require_authority),
    db: Session = Depends(get_db),
):
    wo = db.get(WorkOrder, work_order_id)
    if not wo:
        raise AppError("WORK_ORDER_NOT_FOUND", "Work order not found.", 404)

    issue = db.get(Issue, wo.issue_id)
    if issue and not is_issue_in_jurisdiction(issue, user):
        raise AppError("WORK_ORDER_NOT_FOUND", "Work order not found.", 404)

    if payload.status:
        valid_status_values = {s.value for s in WorkOrderStatus}
        if payload.status not in valid_status_values:
            raise AppError("INVALID_STATUS", f"Status must be one of {sorted(valid_status_values)}.", 422)

        target_status = WorkOrderStatus(payload.status)
        current_status = wo.status

        # Transition validation
        if target_status != current_status:
            allowed = VALID_TRANSITIONS.get(current_status, set())
            if target_status not in allowed:
                raise AppError(
                    "INVALID_STATUS_TRANSITION",
                    f"Cannot transition from {current_status.value} to {target_status.value}.",
                    422,
                )

        wo.status = target_status
        now = datetime.now(timezone.utc)

        if wo.status == WorkOrderStatus.IN_PROGRESS and not wo.started_at:
            wo.started_at = now
            if issue:
                issue.status = IssueStatus.IN_PROGRESS

        if wo.status == WorkOrderStatus.COMPLETED and not wo.completed_at:
            wo.completed_at = now

        if wo.status in (WorkOrderStatus.VERIFIED, WorkOrderStatus.RESOLVED):
            wo.verified_at = now
            wo.verified_by = user.id
            if issue:
                issue.status = IssueStatus.RESOLVED
                alert_service.resolve_alerts_for_issue(db, issue.id)

    if payload.assigned_to is not None:
        wo.assigned_to = payload.assigned_to
        if wo.status == WorkOrderStatus.PENDING:
            wo.status = WorkOrderStatus.ASSIGNED
        if issue and issue.status == IssueStatus.AI_VERIFIED:
            issue.status = IssueStatus.ASSIGNED

    if payload.title is not None:
        wo.title = payload.title
    if payload.description is not None:
        wo.description = payload.description
    if payload.completion_notes is not None:
        wo.completion_notes = payload.completion_notes
    if payload.deadline is not None:
        wo.deadline = payload.deadline

    db.commit()
    db.refresh(wo)
    return ok(_serialize_work_order(wo).model_dump(), "Work order updated")


@router.post("/{work_order_id}/resolution-evidence")
def submit_resolution_evidence(
    work_order_id: int,
    payload: ResolutionEvidenceRequest,
    user: User = Depends(require_authority),
    db: Session = Depends(get_db),
):
    wo = db.get(WorkOrder, work_order_id)
    if not wo:
        raise AppError("WORK_ORDER_NOT_FOUND", "Work order not found.", 404)

    if wo.issue and not is_issue_in_jurisdiction(wo.issue, user):
        raise AppError("WORK_ORDER_NOT_FOUND", "Work order not found.", 404)

    evidence = wo.evidence or ResolutionEvidence(work_order_id=wo.id)
    if payload.before_image_url:
        evidence.before_image_url = payload.before_image_url
    if payload.after_image_url:
        evidence.after_image_url = payload.after_image_url

    if evidence.before_image_url and evidence.after_image_url:
        evidence.ai_verification_score = 70
        evidence.ai_verification_status = "likely_resolved_baseline"
        wo.status = WorkOrderStatus.VERIFICATION

    db.add(evidence)
    db.commit()
    db.refresh(evidence)

    return ok(
        {
            "verification_status": evidence.ai_verification_status,
            "confidence": evidence.ai_verification_score,
            "requires_authority_confirmation": True,
            "is_baseline": True,
        },
        "Evidence submitted — awaiting authority confirmation",
    )
