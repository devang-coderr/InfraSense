from datetime import datetime, timezone

from sqlalchemy import String, DateTime, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.database.models.enums import MediaType


class IssueMedia(Base):
    """
    Stores only a REFERENCE to the file (file_url). The actual image/video
    bytes live in object storage (local disk in dev, Supabase Storage/S3 in
    production) — never inside the database. See app/storage/.
    """

    __tablename__ = "issue_media"

    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int | None] = mapped_column(ForeignKey("issues.id"), nullable=True)
    file_url: Mapped[str] = mapped_column(String(500))
    file_type: Mapped[str] = mapped_column(String(50))
    media_type: Mapped[MediaType] = mapped_column(SAEnum(MediaType), default=MediaType.IMAGE)
    uploaded_by: Mapped[int] = mapped_column(ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    issue: Mapped["Issue | None"] = relationship(back_populates="media")
