from sqlalchemy.orm import object_session
from app.database.models.issue import Issue
from app.schemas.issue import (
    IssueOut,
    IssueMediaItem,
    EvidenceVerificationOut,
    GPSVerificationOut,
    TimeVerificationOut,
    DuplicateAssessmentOut,
    DuplicateSignalMatchOut,
    CitizenWorkOrderOut,
)
from app.schemas.common import SeverityFactorOut, PriorityFactorOut
from app.services.gis_service import map_xy


def issue_to_out(issue: Issue, duplicate_assessment: DuplicateAssessmentOut | None = None) -> IssueOut:
    x, y = map_xy(issue.latitude, issue.longitude)
    media_list = list(issue.media) if issue.media else []
    first_media = media_list[0] if media_list else None
    media_id = first_media.id if first_media else None
    media_url = first_media.file_url if first_media else None

    evidence_images = [
        IssueMediaItem(
            id=m.id,
            file_url=m.file_url,
            media_type=m.media_type.value if hasattr(m.media_type, "value") else str(m.media_type or "image"),
            device_latitude=m.device_latitude,
            device_longitude=m.device_longitude,
            device_captured_at=m.device_captured_at.isoformat() if m.device_captured_at else None,
            exif_latitude=m.exif_latitude,
            exif_longitude=m.exif_longitude,
            exif_captured_at=m.exif_captured_at.isoformat() if m.exif_captured_at else None,
            camera_make=m.camera_make,
            camera_model=m.camera_model,
            evidence_verification=EvidenceVerificationOut(
                gps=GPSVerificationOut(
                    device_available=m.device_latitude is not None and m.device_longitude is not None,
                    exif_available=m.exif_latitude is not None and m.exif_longitude is not None,
                    distance_meters=m.gps_distance_meters,
                    status=m.gps_consistency or "unavailable",
                ),
                capture_time=TimeVerificationOut(
                    device_available=m.device_captured_at is not None,
                    exif_available=m.exif_captured_at is not None,
                    difference_seconds=m.time_difference_seconds,
                    status=m.time_consistency or "unavailable",
                ),
            ),
        )
        for m in media_list
    ]
    media_ids = [m.id for m in media_list]
    media_urls = [m.file_url for m in media_list]

    resolved_assessment = duplicate_assessment or getattr(issue, "_duplicate_assessment", None)
    if resolved_assessment is None:
        sess = object_session(issue)
        if sess:
            from app.database.models.issue_duplicate import IssueDuplicate
            dup_links = (
                sess.query(IssueDuplicate)
                .filter(
                    (IssueDuplicate.master_issue_id == issue.id)
                    | (IssueDuplicate.duplicate_issue_id == issue.id)
                )
                .all()
            )
            if dup_links:
                matches = []
                primary_matched_id = None
                for link in dup_links:
                    other_id = (
                        link.master_issue_id
                        if link.duplicate_issue_id == issue.id
                        else link.duplicate_issue_id
                    )
                    if primary_matched_id is None:
                        primary_matched_id = str(other_id)
                    other_issue = sess.get(Issue, other_id)
                    reasons = [r.strip() for r in (link.reason or "").split(";") if r.strip()]
                    if not reasons:
                        reasons = ["Similar report in the same area"]
                    matches.append(
                        DuplicateSignalMatchOut(
                            issue_id=str(other_id),
                            category_match=other_issue.category.strip().lower() == issue.category.strip().lower() if other_issue else True,
                            category=other_issue.category if other_issue else issue.category,
                            distance_meters=link.distance_meters,
                            location_nearby=link.distance_meters <= 100.0,
                            similarity_score=link.similarity_score,
                            reasons=reasons,
                        )
                    )
                resolved_assessment = DuplicateAssessmentOut(
                    status="possible_duplicate",
                    matched_issue_id=primary_matched_id,
                    matches=matches,
                )

    citizen_work_orders = []
    wos = getattr(issue, "work_orders", None)
    if wos:
        for wo in wos:
            dept_name = wo.department.name if wo.department else None
            citizen_work_orders.append(
                CitizenWorkOrderOut(
                    id=wo.id,
                    department_name=dept_name,
                    status=wo.status.value if hasattr(wo.status, "value") else str(wo.status),
                    title=wo.title,
                    created_at=wo.created_at.isoformat() if wo.created_at else None,
                    started_at=wo.started_at.isoformat() if wo.started_at else None,
                    completed_at=wo.completed_at.isoformat() if wo.completed_at else None,
                    verified_at=wo.verified_at.isoformat() if wo.verified_at else None,
                    completion_notes=wo.completion_notes,
                )
            )
    primary_wo = citizen_work_orders[-1] if citizen_work_orders else None

    return IssueOut(
        id=str(issue.id),
        title=issue.title,
        category=issue.category,
        description=issue.description,
        ward=issue.ward.name if issue.ward else "Unassigned",
        lat=issue.latitude,
        lng=issue.longitude,
        x=x,
        y=y,
        severity=issue.severity.value,
        severityScore=issue.severity_score,
        severityFactors=[
            SeverityFactorOut(label=f.label, score=f.score, max=f.max) for f in issue.severity_factors
        ],
        priorityScore=issue.priority_score,
        priorityFactors=[
            PriorityFactorOut(label=f.label, score=f.score, max=f.max) for f in issue.priority_factors
        ],
        confidence=issue.confidence,
        status=issue.status.value,
        department=issue.department.name if issue.department else "Roads",
        duplicateCount=issue.duplicate_count,
        reportedAt=issue.reported_at.isoformat(),
        imageDescription=issue.image_description,
        state=issue.state,
        district=issue.district,
        media_id=media_id,
        media_url=media_url,
        file_url=media_url,
        image_url=media_url,
        media_ids=media_ids,
        media_urls=media_urls,
        evidence_images=evidence_images,
        duplicate_assessment=resolved_assessment,
        work_order=primary_wo,
        work_orders=citizen_work_orders,
    )

