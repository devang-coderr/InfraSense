from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.notification import Notification
from app.database.models.user import User
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/api/v1/notifications", tags=["notifications"])


@router.get("")
def list_notifications(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    items = (
        db.query(Notification)
        .filter(Notification.user_id == user.id)
        .order_by(Notification.created_at.desc())
        .all()
    )
    return ok([NotificationOut.model_validate(n, from_attributes=True).model_dump() for n in items])


@router.patch("/{notification_id}/read")
def mark_read(notification_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    note = db.get(Notification, notification_id)
    if not note or note.user_id != user.id:
        raise AppError("NOTIFICATION_NOT_FOUND", "Notification not found.", 404)
    note.is_read = True
    db.commit()
    return ok(message="Marked as read")
