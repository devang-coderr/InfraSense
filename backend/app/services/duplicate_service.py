"""
Duplicate detection — version 1 (spec section 13).

Rule: a new issue is a likely duplicate of an existing OPEN issue if it's
within DISTANCE_THRESHOLD_M metres, has the same category, and was
reported within TIME_WINDOW_DAYS days. No image/text embeddings yet
(that's the documented "version 2" upgrade — see docstring below).

UPGRADE PATH: swap `find_possible_duplicate` internals for a call that
also compares text similarity (e.g. sentence-transformers embeddings) and
image similarity (pgvector), without changing its signature.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.database.models.issue import Issue
from app.database.models.issue_duplicate import IssueDuplicate
from app.services.gis_service import haversine_meters

DISTANCE_THRESHOLD_M = 150
TIME_WINDOW_DAYS = 14


def find_possible_duplicate(
    db: Session, category: str, lat: float | None, lng: float | None, exclude_issue_id: int | None = None
) -> tuple[Issue, float] | None:
    if lat is None or lng is None:
        return None

    query = db.query(Issue).filter(Issue.category == category, Issue.status != "resolved")
    if exclude_issue_id is not None:
        query = query.filter(Issue.id != exclude_issue_id)

    now = datetime.now(timezone.utc)
    best: Issue | None = None
    best_distance: float | None = None

    for candidate in query.all():
        if candidate.latitude is None or candidate.longitude is None:
            continue
        reported_at = candidate.reported_at
        if reported_at.tzinfo is None:
            reported_at = reported_at.replace(tzinfo=timezone.utc)
        age_days = (now - reported_at).total_seconds() / 86400
        if age_days > TIME_WINDOW_DAYS:
            continue

        distance = haversine_meters(lat, lng, candidate.latitude, candidate.longitude)
        if distance <= DISTANCE_THRESHOLD_M and (best_distance is None or distance < best_distance):
            best, best_distance = candidate, distance

    if best is None:
        return None
    return best, best_distance


def record_duplicate(db: Session, master: Issue, new_issue: Issue, distance_m: float) -> None:
    """
    The citizen's new report still gets its own `issues` row (so it shows
    up in their "My reports"), but it's linked to the master issue and the
    master's duplicate_count goes up — that count is what the authority
    dashboard and priority queue show.
    """
    master.duplicate_count += 1
    link = IssueDuplicate(
        master_issue_id=master.id,
        duplicate_issue_id=new_issue.id,
        similarity_score=1.0,
        distance_meters=distance_m,
        reason="Same category, within 150m, within 14 days (rule-based v1)",
    )
    db.add(link)
