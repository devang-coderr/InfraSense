from fastapi import APIRouter, Depends, UploadFile, File, Form
from sqlalchemy.orm import Session

from app.ai.vision import analyze_image
from app.core.dependencies import get_current_user
from app.core.exceptions import AppError
from app.core.response import ok
from app.database.database import get_db
from app.database.models.issue_media import IssueMedia
from app.database.models.enums import MediaType
from app.database.models.user import User
from app.schemas.issue import AIAnalyzeResult
from app.services.severity_service import calculate_severity
from app.storage.base import get_storage

router = APIRouter(prefix="/api/v1", tags=["media", "ai"])

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "video/mp4",
}


@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not file or not file.filename:
        raise AppError("INVALID_FILE", "No file provided for upload.", 422)

    content_type = (file.content_type or "").lower().strip()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise AppError("INVALID_FILE_TYPE", "Only JPEG, PNG, WEBP images or MP4 videos are accepted.", 422)

    content = await file.read()
    if len(content) == 0:
        raise AppError("EMPTY_FILE", "Uploaded file is empty.", 422)

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise AppError("FILE_TOO_LARGE", "File exceeds the 10MB upload limit.", 422)

    storage = get_storage()
    try:
        url = storage.save(file.filename or "upload", content, file.content_type)
    except AppError:
        raise
    except Exception as exc:  # pragma: no cover - network/storage failure
        raise AppError("STORAGE_UPLOAD_FAILED", f"Could not save the file: {exc}", 502)

    media = IssueMedia(
        issue_id=None,
        file_url=url,
        file_type=file.content_type,
        media_type=MediaType.VIDEO if content_type.startswith("video") else MediaType.IMAGE,
        uploaded_by=user.id,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    return ok({"media_id": media.id, "file_url": media.file_url}, "File uploaded successfully")


@router.post("/ai/analyze-image")
async def ai_analyze_image(
    file: UploadFile = File(...),
    description: str = Form(default=""),
    user: User = Depends(get_current_user),
):
    """
    Powers the ReportForm's "AI SCANNING..." step. Returns baseline analysis.
    """
    if not file or not file.filename:
        raise AppError("INVALID_FILE", "No file provided for analysis.", 422)

    content_type = (file.content_type or "").lower().strip()
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise AppError("INVALID_FILE_TYPE", "Only JPEG, PNG, WEBP images or MP4 videos are accepted.", 422)

    content = await file.read()
    if len(content) == 0:
        raise AppError("EMPTY_FILE", "Uploaded file is empty.", 422)

    if len(content) > MAX_FILE_SIZE_BYTES:
        raise AppError("FILE_TOO_LARGE", "File exceeds the 10MB upload limit.", 422)

    category, confidence = analyze_image(description_hint=description, filename_hint=file.filename or "")
    severity, severity_score, _ = calculate_severity(category)

    return ok(
        AIAnalyzeResult(
            category=category,
            confidence=confidence,
            severity=severity.value,
            severity_score=severity_score,
        )
    )
