from app.database.models.issue import Issue
from app.schemas.issue import IssueOut
from app.schemas.common import SeverityFactorOut, PriorityFactorOut
from app.services.gis_service import map_xy


def issue_to_out(issue: Issue) -> IssueOut:
    x, y = map_xy(issue.latitude, issue.longitude)
    first_media = issue.media[0] if issue.media else None
    media_id = first_media.id if first_media else None
    media_url = first_media.file_url if first_media else None

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
        media_id=media_id,
        media_url=media_url,
        file_url=media_url,
        image_url=media_url,
    )
