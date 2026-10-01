from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import require_authority
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.issue import Issue
from app.database.models.user import User
from app.schemas.analytics import AuthorityDashboardOut
from app.services import analytics_service
from app.services.issue_service import recalculate_age_and_priority
from app.services.jurisdiction_service import apply_jurisdiction_scope, is_issue_in_jurisdiction
from app.utils.formatting import issue_to_out

router = APIRouter(prefix="/api/v1/authority", tags=["authority"])


@router.get("/dashboard")
def authority_dashboard(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    return ok(AuthorityDashboardOut(**analytics_service.authority_dashboard(db, user=user)))


@router.get("/priority")
def priority_queue(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    query = db.query(Issue).filter(Issue.status != "resolved")
    query = apply_jurisdiction_scope(query, user)
    issues = query.all()
    for issue in issues:
        recalculate_age_and_priority(db, issue)
    db.commit()
    issues.sort(key=lambda i: i.priority_score, reverse=True)
    return ok([issue_to_out(i).model_dump() for i in issues])


@router.get("/issues")
def authority_issues(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    query = db.query(Issue)
    query = apply_jurisdiction_scope(query, user)
    items = query.order_by(Issue.priority_score.desc()).all()
    return ok([issue_to_out(i).model_dump() for i in items])


@router.get("/issues/{issue_id}")
def authority_issue_detail(issue_id: int, user: User = Depends(require_authority), db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if not issue or not is_issue_in_jurisdiction(issue, user):
        raise AppError("ISSUE_NOT_FOUND", "Issue not found.", 404)
    return ok(issue_to_out(issue))


@router.get("/map")
def authority_map(user: User = Depends(require_authority), db: Session = Depends(get_db)):
    query = db.query(Issue)
    query = apply_jurisdiction_scope(query, user)
    items = query.all()
    return ok([issue_to_out(i).model_dump() for i in items])

