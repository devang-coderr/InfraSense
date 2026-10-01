from datetime import datetime, timezone
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.notification import Notification
from app.database.models.user import User
from app.schemas.notification import NotificationOut, UnreadCountResponse
from app.services import alert_service

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


def _serialize_notification(note: Notification) -> NotificationOut:
    category = None
    state = None
    district = None
    if note.issue:
        category = note.issue.category
        state = note.issue.state
        district = note.issue.district

    return NotificationOut(
        id=note.id,
        user_id=note.user_id,
        issue_id=note.issue_id,
        type=note.type,
        severity=note.severity,
        title=note.title,
        message=note.message,
        reason=note.reason,
        status=note.status or ("read" if note.is_read else "unread"),
        is_read=note.is_read,
        acknowledged_at=note.acknowledged_at,
        resolved_at=note.resolved_at,
        created_at=note.created_at,
        category=category,
        state=state,
        district=district,
    )


@router.get("")
def list_notifications(
    filter_type: str | None = Query(None, alias="filter"),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    query = db.query(Notification).filter(Notification.user_id == user.id)

    if filter_type == "unread":
        query = query.filter(Notification.is_read == False)
    elif filter_type == "critical":
        query = query.filter(Notification.severity == "critical")
    elif filter_type == "acknowledged":
        query = query.filter(Notification.status == "acknowledged")
    elif filter_type == "resolved":
        query = query.filter(Notification.status == "resolved")

    items = query.order_by(Notification.created_at.desc()).all()
    return ok([_serialize_notification(n).model_dump() for n in items])


@router.get("/unread-count")
def get_unread_count(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = alert_service.get_unread_count(db, user.id)
    return ok(UnreadCountResponse(unread_count=count).model_dump())


@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = alert_service.mark_notification_read(db, notification_id, user.id)
    if not note:
        raise AppError("NOTIFICATION_NOT_FOUND", "Notification not found.", 404)
    return ok(_serialize_notification(note).model_dump(), "Marked as read")


@router.patch("/{notification_id}/acknowledge")
def acknowledge_alert(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = alert_service.acknowledge_notification(db, notification_id, user.id)
    if not note:
        raise AppError("NOTIFICATION_NOT_FOUND", "Notification not found.", 404)
    return ok(_serialize_notification(note).model_dump(), "Alert acknowledged")


@router.patch("/{notification_id}/resolve")
def resolve_alert(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.get(Notification, notification_id)
    if not note or note.user_id != user.id:
        raise AppError("NOTIFICATION_NOT_FOUND", "Notification not found.", 404)
    note.status = "resolved"
    note.resolved_at = datetime.now(timezone.utc)
    note.is_read = True
    db.commit()
    db.refresh(note)
    return ok(_serialize_notification(note).model_dump(), "Alert marked as resolved")


@router.post("/mark-all-read")
def mark_all_read(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    count = alert_service.mark_all_read(db, user.id)
    return ok({"updated_count": count}, "All notifications marked as read")
