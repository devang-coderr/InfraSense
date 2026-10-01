import logging
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models.enums import IssueStatus, Severity, UserRole
from app.database.models.issue import Issue
from app.database.models.notification import Notification
from app.database.models.user import User

logger = logging.getLogger(__name__)


def evaluate_and_create_alerts(db: Session, issue: Issue, trigger: str = "ISSUE_CREATED") -> list[Notification]:
    """
    Evaluates issue state against alert rules and creates jurisdiction-scoped,
    idempotent alerts for authorized authority users.
    """
    created_notifications: list[Notification] = []
    try:
        # 1. Alert Rule Evaluation - Alert on Critical and High severity/priority issues
        is_critical = (
            issue.severity == Severity.CRITICAL
            or (issue.severity_score is not None and issue.severity_score >= 80)
        )
        is_high_priority = (
            issue.severity == Severity.HIGH
            or (issue.priority_score is not None and issue.priority_score >= 50)
        )

        if not (is_critical or is_high_priority):
            # Normal / low / medium severity issue - no authority alert needed
            return []

        # 2. Determine Alert Properties
        if is_critical:
            alert_severity = "critical"
            alert_type = "CRITICAL_ISSUE_REPORTED"
            alert_title = f"Critical {issue.category} Reported"
            alert_reason = f"Critical {issue.category} reported in your jurisdiction"
        else:
            alert_severity = "high"
            alert_type = "HIGH_PRIORITY_REPORTED"
            alert_title = f"High-Priority {issue.category} Reported"
            alert_reason = f"High-priority {issue.category} (Priority: {int(issue.priority_score or 0)}) reported in your jurisdiction"

        location_desc = f"{issue.district}, {issue.state}" if issue.district and issue.state else (issue.district or issue.state or "Assigned Ward")
        alert_message = (
            f"{issue.category} (Issue #{issue.id}) in {location_desc} requires attention. "
            f"Severity: {issue.severity.value.capitalize() if issue.severity else 'N/A'}, "
            f"Priority Score: {int(issue.priority_score or 0)}."
        )

        # 3. Recipient Resolution - Jurisdiction Check
        recipients: list[User] = []
        if issue.state and issue.district:
            state_clean = issue.state.strip().lower()
            district_clean = issue.district.strip().lower()

            authority_users = (
                db.query(User)
                .filter(
                    User.role.in_([UserRole.OFFICER, UserRole.DEPARTMENT_ADMIN]),
                    User.state.isnot(None),
                    User.district.isnot(None),
                    func.lower(func.trim(User.state)) == state_clean,
                    func.lower(func.trim(User.district)) == district_clean,
                )
                .all()
            )
            recipients.extend(authority_users)

        # Super Admins have global visibility
        super_admins = db.query(User).filter(User.role == UserRole.SUPER_ADMIN).all()
        for sa in super_admins:
            if sa not in recipients:
                recipients.append(sa)

        # 4. Duplicate Prevention & Idempotent Alert Creation
        for recipient in recipients:
            existing = (
                db.query(Notification)
                .filter(
                    Notification.user_id == recipient.id,
                    Notification.issue_id == issue.id,
                    Notification.type == alert_type,
                )
                .first()
            )
            if existing:
                continue

            notif = Notification(
                user_id=recipient.id,
                issue_id=issue.id,
                type=alert_type,
                severity=alert_severity,
                title=alert_title,
                message=alert_message,
                reason=alert_reason,
                status="unread",
                is_read=False,
                created_at=datetime.now(timezone.utc),
            )
            db.add(notif)
            created_notifications.append(notif)

        if created_notifications:
            db.flush()

    except Exception as e:
        logger.error(f"Error evaluating alerts for issue #{issue.id}: {e}", exc_info=True)

    return created_notifications


def resolve_alerts_for_issue(db: Session, issue_id: int) -> int:
    """
    Marks all existing alerts for the resolved issue as resolved.
    """
    count = 0
    now = datetime.now(timezone.utc)
    alerts = (
        db.query(Notification)
        .filter(Notification.issue_id == issue_id, Notification.status != "resolved")
        .all()
    )
    for alert in alerts:
        alert.status = "resolved"
        alert.resolved_at = now
        count += 1
    if count > 0:
        db.flush()
    return count


def acknowledge_notification(db: Session, notification_id: int, user_id: int) -> Notification | None:
    """
    Acknowledge an alert notification by an authorized user.
    """
    notif = db.get(Notification, notification_id)
    if not notif or notif.user_id != user_id:
        return None
    notif.status = "acknowledged"
    notif.acknowledged_at = datetime.now(timezone.utc)
    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif


def mark_notification_read(db: Session, notification_id: int, user_id: int) -> Notification | None:
    """
    Mark a notification as read.
    """
    notif = db.get(Notification, notification_id)
    if not notif or notif.user_id != user_id:
        return None
    notif.is_read = True
    if notif.status == "unread":
        notif.status = "read"
    db.commit()
    db.refresh(notif)
    return notif


def mark_all_read(db: Session, user_id: int) -> int:
    """
    Mark all unread notifications for a user as read.
    """
    unread = (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .all()
    )
    count = 0
    for n in unread:
        n.is_read = True
        if n.status == "unread":
            n.status = "read"
        count += 1
    db.commit()
    return count


def get_unread_count(db: Session, user_id: int) -> int:
    """
    Returns unread notification count for a user.
    """
    return (
        db.query(func.count(Notification.id))
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .scalar()
        or 0
    )
