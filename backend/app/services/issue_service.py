"""
Issue service — orchestrator for citizen report creation and pipeline.
"""
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.ai.vision import analyze_image
from app.database.models.ai_analysis import AIAnalysis
from app.database.models.issue import Issue, IssueSeverityFactor, IssuePriorityFactor
from app.database.models.enums import IssueStatus
from app.database.models.notification import Notification
from app.services import duplicate_service, department_service
from app.services.gis_service import nearest_ward
from app.services.priority_service import calculate_priority
from app.services.severity_service import calculate_severity
from app.schemas.issue import IssueCreateRequest

KNOWN_CATEGORIES: dict[str, str] = {
    "pothole": "Pothole",
    "open manhole": "Open Manhole",
    "road crack": "Road Crack",
    "traffic signal": "Traffic Signal",
    "streetlight": "Streetlight",
    "garbage": "Garbage",
    "water leakage": "Water Leakage",
    "traffic": "Traffic",
    "waterlogging": "Water Leakage",
}


def normalize_category(cat: str | None) -> str:
    if not cat:
        return "Pothole"
    cleaned = cat.strip().lower()
    return KNOWN_CATEGORIES.get(cleaned, cat.strip().title())


def create_issue_pipeline(db: Session, reporter_id: int, payload: IssueCreateRequest) -> Issue:
    # 1. Category normalization & AI scan (always evaluate final submitted description first)
    raw_cat, confidence = analyze_image(description_hint=payload.description)
    category = normalize_category(raw_cat)

    # If description did not trigger a specific keyword (returned default "Pothole"),
    # but a non-default ai_category was explicitly provided by client AI scan, respect it.
    if category == "Pothole" and payload.ai_category and payload.ai_category.strip().lower() != "pothole":
        category = normalize_category(payload.ai_category)
        if payload.ai_confidence:
            confidence = payload.ai_confidence

    # 2. Ward assignment (nearest-centre heuristic)
    ward = nearest_ward(db, payload.latitude, payload.longitude)

    # 3. Severity computation
    severity, severity_score, severity_factors = calculate_severity(category)

    lat = payload.latitude if payload.latitude is not None else 0.0
    lng = payload.longitude if payload.longitude is not None else 0.0

    # 4. Create Issue record
    issue = Issue(
        title=category,
        category=category,
        description=payload.description,
        image_description=payload.description or f"Reported photo — category: {category}",
        reported_by=reporter_id,
        latitude=lat,
        longitude=lng,
        ward_id=ward.id if ward else None,
        severity=severity,
        severity_score=severity_score,
        confidence=confidence,
        status=IssueStatus.AI_VERIFIED,
        duplicate_count=0,
        reported_at=datetime.now(timezone.utc),
    )
    db.add(issue)
    db.flush()  # assigns issue.id without committing yet

    # Link uploaded IssueMedia if media_id was provided
    if payload.media_id:
        from app.database.models.issue_media import IssueMedia
        media = db.get(IssueMedia, payload.media_id)
        if media and (media.issue_id is None or media.uploaded_by == reporter_id):
            media.issue_id = issue.id

    for f in severity_factors:
        db.add(IssueSeverityFactor(issue_id=issue.id, **f))

    db.add(
        AIAnalysis(
            issue_id=issue.id,
            model_name="baseline-rule-based",
            model_version="v1",
            is_baseline=True,
            category=category,
            confidence=confidence,
            severity_score=severity_score,
            damage_size=next((f["score"] for f in severity_factors if f["label"] == "Damage size"), 0),
        )
    )

    # 5. Duplicate detection (excludes the issue we just created)
    dup_match = duplicate_service.find_possible_duplicate(
        db, category=category, lat=payload.latitude, lng=payload.longitude, exclude_issue_id=issue.id
    )
    master_for_priority = issue
    if dup_match:
        master, distance_m = dup_match
        duplicate_service.record_duplicate(db, master=master, new_issue=issue, distance_m=distance_m)
        master_for_priority = master

    # 6. Priority calculation
    age_days = 0.0
    priority_score, priority_factors = calculate_priority(
        severity_score=master_for_priority.severity_score,
        duplicate_count=master_for_priority.duplicate_count,
        age_days=age_days,
    )
    master_for_priority.priority_score = priority_score
    for old in list(master_for_priority.priority_factors):
        db.delete(old)
    db.flush()
    for f in priority_factors:
        db.add(IssuePriorityFactor(issue_id=master_for_priority.id, **f))

    if master_for_priority.id != issue.id:
        issue.priority_score = priority_score

    # 7. Department assignment
    dept = department_service.get_department_by_category(db, category)
    if dept:
        issue.department_id = dept.id
        master_for_priority.department_id = dept.id

    # 8. Notification for the citizen
    db.add(
        Notification(
            user_id=reporter_id,
            issue_id=issue.id,
            type="report_received",
            title="Report received",
            message=f"Your report has been received and classified as '{category}'.",
        )
    )

    db.commit()
    db.refresh(issue)
    return issue


def recalculate_age_and_priority(db: Session, issue: Issue) -> None:
    """Called by periodic/manual refresh or read to age-adjust priority."""
    reported_at = issue.reported_at
    if reported_at.tzinfo is None:
        reported_at = reported_at.replace(tzinfo=timezone.utc)
    age_days = (datetime.now(timezone.utc) - reported_at).total_seconds() / 86400

    priority_score, priority_factors = calculate_priority(
        severity_score=issue.severity_score,
        duplicate_count=issue.duplicate_count,
        age_days=age_days,
    )
    issue.priority_score = priority_score
    for old in list(issue.priority_factors):
        db.delete(old)
    db.flush()
    for f in priority_factors:
        db.add(IssuePriorityFactor(issue_id=issue.id, **f))
