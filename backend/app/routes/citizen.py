from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.issue import Issue
from app.database.models.user import User
from app.utils.formatting import issue_to_out

router = APIRouter(prefix="/api/v1/citizen", tags=["citizen"])


@router.get("/dashboard")
def citizen_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mine = db.query(Issue).filter(Issue.reported_by == user.id).all()
    active = [i for i in mine if i.status != "resolved"]
    resolved_nearby = db.query(Issue).filter(Issue.status == "resolved").count()
    return ok(
        {
            "active_reports": len(active),
            "resolved_nearby": resolved_nearby,
            "recent": [issue_to_out(i).model_dump() for i in mine[:3]],
        }
    )


@router.get("/reports")
def citizen_reports(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    mine = (
        db.query(Issue)
        .filter(Issue.reported_by == user.id)
        .order_by(Issue.reported_at.desc())
        .all()
    )
    return ok([issue_to_out(i).model_dump() for i in mine])


@router.get("/reports/{issue_id}")
def citizen_report_detail(issue_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    issue = db.get(Issue, issue_id)
    if not issue or issue.reported_by != user.id:
        raise AppError("ISSUE_NOT_FOUND", "Report not found.", 404)
    return ok(issue_to_out(issue))
