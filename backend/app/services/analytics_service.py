"""
Analytics service — real SQL aggregation, no hardcoded numbers (spec
section 21). Every number here comes from COUNT/GROUP BY queries against
whatever is actually in the database (which is empty/near-empty on a
freshly-seeded install — run the seed script for realistic-looking demo
numbers, see README).
"""
from collections import Counter
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database.models.issue import Issue

HEALTH_CATEGORY_MAP = {
    "Roads": ["Pothole", "Road Crack", "Open Manhole"],
    "Streetlights": ["Streetlight"],
    "Water": ["Water Leakage"],
    "Sanitation": ["Garbage"],
    "Traffic": ["Traffic Signal"],
}

SEVERITY_PENALTY = {"critical": 14, "high": 8, "medium": 4, "low": 1}


def category_breakdown(db: Session) -> list[dict]:
    rows = db.query(Issue.category, func.count(Issue.id)).group_by(Issue.category).all()
    return [{"name": category, "value": count} for category, count in rows]


def weekly_trend(db: Session, weeks: int = 12) -> list[dict]:
    """
    Buckets issues into the last `weeks` 7-day windows by reported_at.
    Returns oldest -> newest, labelled W1..Wn like the frontend mock.
    """
    now = datetime.now(timezone.utc)
    issues = db.query(Issue.reported_at).all()
    counts = [0] * weeks
    for (reported_at,) in issues:
        if reported_at.tzinfo is None:
            reported_at = reported_at.replace(tzinfo=timezone.utc)
        age_days = (now - reported_at).days
        week_index_from_end = age_days // 7
        bucket = weeks - 1 - week_index_from_end
        if 0 <= bucket < weeks:
            counts[bucket] += 1
    return [{"week": f"W{i + 1}", "reports": counts[i]} for i in range(weeks)]


def resolution_stats(db: Session) -> dict:
    total = db.query(func.count(Issue.id)).scalar() or 0
    resolved = db.query(func.count(Issue.id)).filter(Issue.status == "resolved").scalar() or 0

    resolved_issues = db.query(Issue).filter(Issue.status == "resolved").all()
    if resolved_issues:
        durations = []
        for issue in resolved_issues:
            reported_at = issue.reported_at
            if reported_at.tzinfo is None:
                reported_at = reported_at.replace(tzinfo=timezone.utc)
            updated_at = issue.updated_at
            if updated_at.tzinfo is None:
                updated_at = updated_at.replace(tzinfo=timezone.utc)
            durations.append((updated_at - reported_at).total_seconds() / 86400)
        avg_days = round(sum(durations) / len(durations), 1)
    else:
        avg_days = 0.0

    return {
        "total_issues": total,
        "resolved_issues": resolved,
        "resolution_rate": round((resolved / total) * 100, 1) if total else 0.0,
        "average_resolution_days": avg_days,
    }


def infrastructure_health(db: Session) -> dict:
    """
    Heuristic (documented in schemas/analytics.py HealthResponse.methodology):
    each category starts at 100 and loses points per unresolved issue,
    weighted by severity. This is a scoring rubric, not a validated index.
    """
    open_issues = db.query(Issue).filter(Issue.status != "resolved").all()

    category_scores = {}
    for label, categories in HEALTH_CATEGORY_MAP.items():
        penalty = 0
        for issue in open_issues:
            if issue.category in categories:
                penalty += SEVERITY_PENALTY.get(issue.severity.value, 1)
        category_scores[label] = max(0, 100 - penalty)

    overall = round(sum(category_scores.values()) / len(category_scores)) if category_scores else 100
    return {
        "city_health_score": overall,
        "categories": [{"label": k, "score": v} for k, v in category_scores.items()],
    }


def authority_dashboard(db: Session) -> dict:
    total = db.query(func.count(Issue.id)).scalar() or 0
    critical = db.query(func.count(Issue.id)).filter(Issue.severity == "critical").scalar() or 0
    pending = db.query(func.count(Issue.id)).filter(Issue.status != "resolved").scalar() or 0
    resolved = db.query(func.count(Issue.id)).filter(Issue.status == "resolved").scalar() or 0
    stats = resolution_stats(db)
    health = infrastructure_health(db)

    return {
        "total_issues": total,
        "critical_issues": critical,
        "pending_issues": pending,
        "resolved_issues": resolved,
        "average_resolution_days": stats["average_resolution_days"],
        "infrastructure_health": health["city_health_score"],
    }
