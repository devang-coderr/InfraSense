"""
Transparency service — public infrastructure statistics & district comparisons.

Computes aggregate reporting, status, and resolution rate metrics
from live database records. Does not expose private citizen or authority info.
"""
from datetime import datetime, timezone
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.constants import OFFICIAL_CATEGORIES
from app.database.models.enums import IssueStatus
from app.database.models.issue import Issue


def get_public_transparency_stats(
    db: Session,
    category: str | None = None,
    state: str | None = None,
) -> dict:
    """
    Returns aggregate infrastructure transparency statistics across districts and categories.
    """
    # 1. District breakdown query
    d_query = db.query(
        Issue.district,
        Issue.state,
        Issue.status,
        func.count(Issue.id),
    )
    if category and category.strip():
        d_query = d_query.filter(Issue.category == category.strip())
    if state and state.strip():
        d_query = d_query.filter(Issue.state == state.strip())

    d_rows = d_query.group_by(Issue.district, Issue.state, Issue.status).all()

    # Aggregate by district
    districts_map: dict[str, dict] = {}
    for dist_raw, st_raw, status, count in d_rows:
        dist_name = dist_raw.strip() if dist_raw and dist_raw.strip() else "Unassigned"
        st_name = st_raw.strip() if st_raw and st_raw.strip() else None
        key = f"{dist_name}_{st_name or ''}"

        if key not in districts_map:
            districts_map[key] = {
                "district_name": dist_name,
                "state": st_name,
                "total_reports": 0,
                "resolved": 0,
                "in_progress": 0,
                "pending": 0,
            }

        districts_map[key]["total_reports"] += count
        st_val = status.value if hasattr(status, "value") else str(status)
        if st_val == IssueStatus.RESOLVED.value or st_val == "resolved":
            districts_map[key]["resolved"] += count
        elif st_val == IssueStatus.IN_PROGRESS.value or st_val == "in_progress":
            districts_map[key]["in_progress"] += count
        else:
            districts_map[key]["pending"] += count

    districts_list = []
    for d in districts_map.values():
        total = d["total_reports"]
        res = d["resolved"]
        d["resolution_rate"] = round((res / total) * 100, 1) if total > 0 else 0.0
        districts_list.append(d)

    # Sort districts by total_reports desc, then resolution_rate desc
    districts_list.sort(key=lambda x: (x["total_reports"], x["resolution_rate"]), reverse=True)

    # 2. Overall totals
    total_reports = sum(d["total_reports"] for d in districts_list)
    resolved = sum(d["resolved"] for d in districts_list)
    in_progress = sum(d["in_progress"] for d in districts_list)
    pending = sum(d["pending"] for d in districts_list)
    resolution_rate = round((resolved / total_reports) * 100, 1) if total_reports > 0 else 0.0

    # 3. Category breakdown (all official categories)
    c_query = db.query(
        Issue.category,
        Issue.status,
        func.count(Issue.id),
    )
    if state and state.strip():
        c_query = c_query.filter(Issue.state == state.strip())
    c_rows = c_query.group_by(Issue.category, Issue.status).all()

    cats_map: dict[str, dict] = {}
    for cat in OFFICIAL_CATEGORIES:
        cats_map[cat] = {
            "category": cat,
            "total_reports": 0,
            "resolved": 0,
            "in_progress": 0,
            "pending": 0,
        }

    for cat_raw, status, count in c_rows:
        if cat_raw in cats_map:
            cats_map[cat_raw]["total_reports"] += count
            st_val = status.value if hasattr(status, "value") else str(status)
            if st_val == IssueStatus.RESOLVED.value or st_val == "resolved":
                cats_map[cat_raw]["resolved"] += count
            elif st_val == IssueStatus.IN_PROGRESS.value or st_val == "in_progress":
                cats_map[cat_raw]["in_progress"] += count
            else:
                cats_map[cat_raw]["pending"] += count

    categories_list = []
    for c in cats_map.values():
        total = c["total_reports"]
        res = c["resolved"]
        c["resolution_rate"] = round((res / total) * 100, 1) if total > 0 else 0.0
        categories_list.append(c)

    # 4. Last updated timestamp
    latest_dt = db.query(func.max(Issue.updated_at)).scalar()
    if not latest_dt:
        latest_dt = db.query(func.max(Issue.reported_at)).scalar()
    
    last_updated_str = latest_dt.isoformat() if latest_dt else datetime.now(timezone.utc).isoformat()

    return {
        "total_reports": total_reports,
        "resolved": resolved,
        "in_progress": in_progress,
        "pending": pending,
        "resolution_rate": resolution_rate,
        "category_filter": category.strip() if category and category.strip() else None,
        "last_updated": last_updated_str,
        "districts": districts_list,
        "categories": categories_list,
    }
