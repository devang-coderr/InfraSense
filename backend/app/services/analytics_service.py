"""
Analytics service — real SQL aggregation, no hardcoded numbers (spec
section 21). Every number here comes from COUNT/GROUP BY queries against
live database records scoped to the requesting authority's jurisdiction.
"""
from datetime import datetime, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants import OFFICIAL_CATEGORIES
from app.database.models.enums import WorkOrderStatus, Severity
from app.database.models.issue import Issue
from app.database.models.user import User
from app.database.models.ward import Ward
from app.database.models.work_order import WorkOrder
from app.services.jurisdiction_service import apply_jurisdiction_scope

HEALTH_CATEGORY_MAP = {
    "Roads": ["Pothole", "Road Crack", "Open Manhole"],
    "Streetlights": ["Streetlight"],
    "Water": ["Water Leakage", "Drainage"],
    "Sanitation": ["Garbage"],
    "Traffic": ["Traffic Signal"],
}

SEVERITY_PENALTY = {"critical": 14, "high": 8, "medium": 4, "low": 1}


def category_breakdown(db: Session, user: User | None = None) -> list[dict]:
    query = db.query(Issue.category, func.count(Issue.id))
    if user:
        query = apply_jurisdiction_scope(query, user)
    rows = query.group_by(Issue.category).all()
    counts = {category: count for category, count in rows}
    # Return all official categories in order with real counts
    return [{"name": cat, "value": counts.get(cat, 0)} for cat in OFFICIAL_CATEGORIES]


def severity_distribution(db: Session, user: User | None = None) -> list[dict]:
    query = db.query(Issue.severity, func.count(Issue.id))
    if user:
        query = apply_jurisdiction_scope(query, user)
    rows = query.group_by(Issue.severity).all()
    counts = {r[0].value if hasattr(r[0], "value") else str(r[0]): r[1] for r in rows}
    return [
        {"severity": "critical", "label": "Critical", "count": counts.get("critical", 0), "color": "var(--critical)"},
        {"severity": "high", "label": "High", "count": counts.get("high", 0), "color": "var(--high)"},
        {"severity": "medium", "label": "Medium", "count": counts.get("medium", 0), "color": "var(--medium)"},
        {"severity": "low", "label": "Low", "count": counts.get("low", 0), "color": "var(--low)"},
    ]


def work_order_analytics(db: Session, user: User | None = None) -> dict:
    wo_query = db.query(WorkOrder).join(Issue, WorkOrder.issue_id == Issue.id)
    if user:
        wo_query = apply_jurisdiction_scope(wo_query, user, Issue)

    status_rows = wo_query.with_entities(WorkOrder.status, func.count(WorkOrder.id)).group_by(WorkOrder.status).all()
    status_counts = {r[0].value if hasattr(r[0], "value") else str(r[0]): r[1] for r in status_rows}

    total = sum(status_counts.values())
    pending = status_counts.get(WorkOrderStatus.PENDING.value, 0)
    assigned = status_counts.get(WorkOrderStatus.ASSIGNED.value, 0)
    in_progress = status_counts.get(WorkOrderStatus.IN_PROGRESS.value, 0)
    completed = status_counts.get(WorkOrderStatus.COMPLETED.value, 0)
    verified = status_counts.get(WorkOrderStatus.VERIFIED.value, 0) + status_counts.get(WorkOrderStatus.RESOLVED.value, 0)

    completion_rate = round(((completed + verified) / total) * 100, 1) if total > 0 else 0.0

    return {
        "total": total,
        "pending": pending,
        "assigned": assigned,
        "in_progress": in_progress,
        "completed": completed,
        "verified": verified,
        "completion_rate": completion_rate,
    }


def ward_analytics(db: Session, user: User | None = None) -> list[dict]:
    wards = {w.id: w.name for w in db.query(Ward).all()}

    query = db.query(Issue.ward_id, Issue.status, func.count(Issue.id))
    if user:
        query = apply_jurisdiction_scope(query, user)
    rows = query.group_by(Issue.ward_id, Issue.status).all()

    ward_map = {}
    for ward_id, status, count in rows:
        if ward_id is None:
            continue
        w_name = wards.get(ward_id, f"Ward {ward_id}")
        if w_name not in ward_map:
            ward_map[w_name] = {"ward": w_name, "total_issues": 0, "open_issues": 0, "resolved_issues": 0}
        ward_map[w_name]["total_issues"] += count
        if status == "resolved":
            ward_map[w_name]["resolved_issues"] += count
        else:
            ward_map[w_name]["open_issues"] += count

    return sorted(ward_map.values(), key=lambda x: x["total_issues"], reverse=True)


def weekly_trend(db: Session, weeks: int = 12, user: User | None = None) -> list[dict]:
    """
    Buckets issues into the last `weeks` 7-day windows by reported_at.
    Returns oldest -> newest, labelled W1..Wn.
    """
    now = datetime.now(timezone.utc)
    query = db.query(Issue.reported_at)
    if user:
        query = apply_jurisdiction_scope(query, user)
    issues = query.all()
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


def resolution_stats(db: Session, user: User | None = None) -> dict:
    base_query = db.query(Issue)
    if user:
        base_query = apply_jurisdiction_scope(base_query, user)

    total = base_query.count()
    resolved = base_query.filter(Issue.status == "resolved").count()

    resolved_issues = base_query.filter(Issue.status == "resolved").all()
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


def infrastructure_health(db: Session, user: User | None = None) -> dict:
    query = db.query(Issue).filter(Issue.status != "resolved")
    if user:
        query = apply_jurisdiction_scope(query, user)
    open_issues = query.all()

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


def authority_dashboard(db: Session, user: User | None = None) -> dict:
    base_query = db.query(Issue)
    if user:
        base_query = apply_jurisdiction_scope(base_query, user)

    total = base_query.count()
    critical = base_query.filter(Issue.severity == "critical").count()
    pending = base_query.filter(Issue.status != "resolved").count()
    resolved = base_query.filter(Issue.status == "resolved").count()
    stats = resolution_stats(db, user=user)
    health = infrastructure_health(db, user=user)

    wo_query = db.query(WorkOrder).join(Issue, WorkOrder.issue_id == Issue.id)
    if user:
        wo_query = apply_jurisdiction_scope(wo_query, user, Issue)
    open_wos = wo_query.filter(WorkOrder.status.in_([WorkOrderStatus.PENDING, WorkOrderStatus.ASSIGNED, WorkOrderStatus.IN_PROGRESS])).count()
    in_prog_wos = wo_query.filter(WorkOrder.status == WorkOrderStatus.IN_PROGRESS).count()
    completed_wos = wo_query.filter(WorkOrder.status.in_([WorkOrderStatus.COMPLETED, WorkOrderStatus.VERIFIED, WorkOrderStatus.RESOLVED])).count()

    return {
        "total_issues": total,
        "critical_issues": critical,
        "pending_issues": pending,
        "resolved_issues": resolved,
        "average_resolution_days": stats["average_resolution_days"],
        "infrastructure_health": health["city_health_score"],
        "open_work_orders": open_wos,
        "in_progress_work_orders": in_prog_wos,
        "completed_work_orders": completed_wos,
    }


def analytics_overview(db: Session, user: User | None = None) -> dict:
    base_query = db.query(Issue)
    if user:
        base_query = apply_jurisdiction_scope(base_query, user)

    total_reports = base_query.count()
    open_issues = base_query.filter(Issue.status != "resolved").count()
    resolved_issues = base_query.filter(Issue.status == "resolved").count()
    critical_issues = base_query.filter(Issue.severity == "critical").count()
    high_priority_issues = base_query.filter(Issue.priority_score >= 70).count()

    res_stats = resolution_stats(db, user=user)
    cat_breakdown = category_breakdown(db, user=user)
    sev_dist = severity_distribution(db, user=user)
    wo_stats = work_order_analytics(db, user=user)
    w_stats = ward_analytics(db, user=user)
    trend_data = weekly_trend(db, weeks=12, user=user)
    health_data = infrastructure_health(db, user=user)

    return {
        "summary": {
            "total_reports": total_reports,
            "open_issues": open_issues,
            "resolved_issues": resolved_issues,
            "critical_issues": critical_issues,
            "high_priority_issues": high_priority_issues,
            "resolution_rate": res_stats["resolution_rate"],
            "average_resolution_days": res_stats["average_resolution_days"],
        },
        "severity_distribution": sev_dist,
        "category_breakdown": cat_breakdown,
        "work_order_stats": wo_stats,
        "ward_breakdown": w_stats,
        "trends": trend_data,
        "health": health_data,
    }
