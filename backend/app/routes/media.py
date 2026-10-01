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


from app.services.evidence_service import extract_exif_metadata, verify_evidence_consistency, _parse_exif_datetime

@router.post("/media/upload")
async def upload_media(
    file: UploadFile = File(...),
    device_latitude: float | None = Form(default=None),
    device_longitude: float | None = Form(default=None),
    device_captured_at: str | None = Form(default=None),
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

    # Extract EXIF metadata safely from original image bytes
    exif_data = extract_exif_metadata(content) if not content_type.startswith("video") else {}
    parsed_device_time = _parse_exif_datetime(device_captured_at) if device_captured_at else None

    # Compute perceptual visual hash for duplicate detection
    from app.services.duplicate_service import compute_perceptual_hash
    p_hash = compute_perceptual_hash(content) if not content_type.startswith("video") else None

    # Compute location & time consistency against device-reported data
    verification = verify_evidence_consistency(
        device_latitude=device_latitude,
        device_longitude=device_longitude,
        device_captured_at=parsed_device_time,
        exif_latitude=exif_data.get("exif_latitude"),
        exif_longitude=exif_data.get("exif_longitude"),
        exif_captured_at=exif_data.get("exif_captured_at"),
    )

    media = IssueMedia(
        issue_id=None,
        file_url=url,
        file_type=file.content_type,
        media_type=MediaType.VIDEO if content_type.startswith("video") else MediaType.IMAGE,
        uploaded_by=user.id,
        device_latitude=device_latitude,
        device_longitude=device_longitude,
        device_captured_at=parsed_device_time,
        exif_latitude=exif_data.get("exif_latitude"),
        exif_longitude=exif_data.get("exif_longitude"),
        exif_captured_at=exif_data.get("exif_captured_at"),
        camera_make=exif_data.get("camera_make"),
        camera_model=exif_data.get("camera_model"),
        gps_distance_meters=verification.get("gps_distance_meters"),
        gps_consistency=verification.get("gps_consistency"),
        time_difference_seconds=verification.get("time_difference_seconds"),
        time_consistency=verification.get("time_consistency"),
        perceptual_hash=p_hash,
    )
    db.add(media)
    db.commit()
    db.refresh(media)

    return ok(
        {
            "media_id": media.id,
            "file_url": media.file_url,
            "camera_make": media.camera_make,
            "camera_model": media.camera_model,
            "evidence_verification": {
                "gps": verification["gps"],
                "capture_time": verification["capture_time"],
            },
        },
        "File uploaded successfully",
    )


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

    category, confidence = analyze_image(
        description_hint=description,
        filename_hint=file.filename or "",
        image_bytes=content,
    )
    severity, severity_score, _ = calculate_severity(category)

    return ok(
        AIAnalyzeResult(
            category=category,
            confidence=confidence,
            severity=severity.value,
            severity_score=severity_score,
            is_baseline=False,
            note="Classified with EfficientNet-B0 transfer learning model.",
        )
    )
