from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_authority
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.department import Department
from app.database.models.enums import WorkOrderStatus, IssueStatus
from app.database.models.issue import Issue
from app.database.models.user import User
from app.database.models.work_order import WorkOrder, ResolutionEvidence
from app.schemas.work_order import (
    WorkOrderCreateRequest,
    WorkOrderUpdateRequest,
    ResolutionEvidenceRequest,
    WorkOrderOut,
)

router = APIRouter(prefix="/api/v1/work-orders", tags=["work_orders"])


def _work_order_out(wo: WorkOrder, dept_name: str) -> WorkOrderOut:
    return WorkOrderOut(
        id=wo.id,
        issue_id=wo.issue_id,
        department_id=wo.department_id,
        department_name=dept_name,
        assigned_to=wo.assigned_to,
        priority=wo.priority,
        deadline=wo.deadline,
        status=wo.status.value,
        started_at=wo.started_at,
        completed_at=wo.completed_at,
        created_at=wo.created_at,
    )


@router.post("")
def create_work_order(
    payload: WorkOrderCreateRequest, user: User = Depends(require_authority), db: Session = Depends(get_db)
):
    issue = db.get(Issue, payload.issue_id)
    if not issue:
        raise AppError("ISSUE_NOT_FOUND", "Issue not found.", 404)

    department_id = payload.department_id or issue.department_id
    if department_id is None:
        raise AppError("DEPARTMENT_REQUIRED", "This issue has no department assigned yet.", 422)

    dept = db.get(Department, department_id)
    if not dept:
        raise AppError("DEPARTMENT_NOT_FOUND", "Department not found.", 404)

    wo = WorkOrder(
        issue_id=issue.id,
        department_id=department_id,
        assigned_to=payload.assigned_to,
        priority=issue.priority_score,
        deadline=payload.deadline,
        status=WorkOrderStatus.ASSIGNED,
    )
    db.add(wo)
    issue.status = IssueStatus.ASSIGNED
    db.commit()
    db.refresh(wo)
    return ok(_work_order_out(wo, dept.name), "Work order created")


@router.get("")
def list_work_orders(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    orders = db.query(WorkOrder).all()
    out = []
    for wo in orders:
        dept = db.get(Department, wo.department_id)
        out.append(_work_order_out(wo, dept.name if dept else "Unknown").model_dump())
    return ok(out)


@router.get("/{work_order_id}")
def get_work_order(work_order_id: int, user: User = Depends(require_authority), db: Session = Depends(get_db)):
    wo = db.get(WorkOrder, work_order_id)
    if not wo:
        raise AppError("WORK_ORDER_NOT_FOUND", "Work order not found.", 404)
    dept = db.get(Department, wo.department_id)
    return ok(_work_order_out(wo, dept.name if dept else "Unknown"))


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

    if payload.status:
        valid = {s.value for s in WorkOrderStatus}
        if payload.status not in valid:
            raise AppError("INVALID_STATUS", f"Status must be one of {sorted(valid)}.", 422)
        wo.status = WorkOrderStatus(payload.status)

        now = datetime.now(timezone.utc)
        if wo.status == WorkOrderStatus.IN_PROGRESS and not wo.started_at:
            wo.started_at = now
            if issue:
                issue.status = IssueStatus.IN_PROGRESS
        if wo.status == WorkOrderStatus.COMPLETED and not wo.completed_at:
            wo.completed_at = now
        if wo.status == WorkOrderStatus.RESOLVED and issue:
            issue.status = IssueStatus.RESOLVED

    if payload.assigned_to is not None:
        wo.assigned_to = payload.assigned_to
    if payload.deadline is not None:
        wo.deadline = payload.deadline

    db.commit()
    db.refresh(wo)
    dept = db.get(Department, wo.department_id)
    return ok(_work_order_out(wo, dept.name if dept else "Unknown"), "Work order updated")


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

    evidence = wo.evidence or ResolutionEvidence(work_order_id=wo.id)
    if payload.before_image_url:
        evidence.before_image_url = payload.before_image_url
    if payload.after_image_url:
        evidence.after_image_url = payload.after_image_url

    # Baseline "AI verification": presence of both images -> placeholder
    # confidence. NOT a real before/after change-detection model — see
    # app/ai/vision.py for the same disclosure pattern.
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
