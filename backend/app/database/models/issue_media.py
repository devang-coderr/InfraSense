from datetime import datetime, timezone

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.database.models.enums import MediaType


class IssueMedia(Base):
    """
    Stores a REFERENCE to the file (file_url) plus location and capture-time
    evidence verification metadata (both device-reported and image EXIF).
    """

    __tablename__ = "issue_media"

    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int | None] = mapped_column(ForeignKey("issues.id"), nullable=True)
    file_url: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(50))
    media_type: Mapped[MediaType] = mapped_column(SAEnum(MediaType), default=MediaType.IMAGE)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Evidence Verification — Device Capture Metadata (Source A)
    device_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    device_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    device_captured_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Evidence Verification — Original Image EXIF Metadata (Source B)
    exif_latitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    exif_longitude: Mapped[float | None] = mapped_column(Float, nullable=True)
    exif_captured_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    camera_make: Mapped[str | None] = mapped_column(String(100), nullable=True)
    camera_model: Mapped[str | None] = mapped_column(String(100), nullable=True)

    # Evidence Verification — Calculated Consistency Metrics
    gps_distance_meters: Mapped[float | None] = mapped_column(Float, nullable=True)
    gps_consistency: Mapped[str | None] = mapped_column(String(20), nullable=True, default="unavailable")
    time_difference_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    time_consistency: Mapped[str | None] = mapped_column(String(20), nullable=True, default="unavailable")

    # Visual Fingerprint for Duplicate Detection
    perceptual_hash: Mapped[str | None] = mapped_column(String(32), nullable=True)

    issue: Mapped["Issue | None"] = relationship(back_populates="media")
