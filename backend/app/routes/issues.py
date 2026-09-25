from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user, require_authority
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.issue import Issue
from app.database.models.department import Department
from app.database.models.enums import IssueStatus
from app.database.models.user import User
from app.schemas.issue import IssueCreateRequest, IssueUpdateRequest, IssueListResponse
from app.services import gis_service
from app.services.issue_service import create_issue_pipeline
from app.utils.formatting import issue_to_out

router = APIRouter(prefix="/api/v1/issues", tags=["issues"])


@router.post("")
def create_issue(
    payload: IssueCreateRequest, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    # `reported_by` always comes from the JWT, never trusted from the client.
    issue = create_issue_pipeline(db, reporter_id=user.id, payload=payload)
    return ok(issue_to_out(issue), "Issue created successfully")


@router.get("")
def list_issues(
    status_: str | None = Query(default=None, alias="status"),
    category: str | None = None,
    severity: str | None = None,
    department: str | None = None,
    ward: str | None = None,
    mine: bool = False,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Issue)
    if status_:
        query = query.filter(Issue.status == status_)
    if category:
        query = query.filter(Issue.category == category)
    if severity:
        query = query.filter(Issue.severity == severity)
    if department:
        query = query.join(Department, isouter=True).filter(Department.name == department)
    if ward:
        from app.database.models.ward import Ward

        query = query.join(Ward, Issue.ward_id == Ward.id).filter(Ward.name == ward)
    if mine:
        query = query.filter(Issue.reported_by == user.id)

    items = query.order_by(Issue.reported_at.desc()).all()
    return ok(IssueListResponse(items=[issue_to_out(i) for i in items], total=len(items)))


@router.get("/map")
def issues_map(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = db.query(Issue).all()
    return ok([issue_to_out(i) for i in items])


@router.get("/nearby")
def issues_nearby(
    lat: float,
    lng: float,
    radius: float = 500,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    results = gis_service.nearby_issues(db, lat, lng, radius)
    return ok(
        [
            {"issue": issue_to_out(issue).model_dump(), "distance_meters": round(dist, 1)}
            for issue, dist in results
        ]
    )


@router.get("/{issue_id}")
def get_issue(issue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise AppError("ISSUE_NOT_FOUND", "Issue not found.", 404)
    return ok(issue_to_out(issue))


@router.patch("/{issue_id}")
def update_issue(
    issue_id: int,
    payload: IssueUpdateRequest,
    user: User = Depends(require_authority),
    db: Session = Depends(get_db),
):
    issue = db.get(Issue, issue_id)
    if not issue:
        raise AppError("ISSUE_NOT_FOUND", "Issue not found.", 404)

    if payload.status:
        valid_statuses = {s.value for s in IssueStatus}
        if payload.status not in valid_statuses:
            raise AppError("INVALID_STATUS", f"Status must be one of {sorted(valid_statuses)}.", 422)
        issue.status = IssueStatus(payload.status)

    if payload.department_id is not None:
        dept = db.get(Department, payload.department_id)
        if not dept:
            raise AppError("DEPARTMENT_NOT_FOUND", "Department not found.", 404)
        issue.department_id = dept.id

    db.commit()
    db.refresh(issue)
    return ok(issue_to_out(issue), "Issue updated")
