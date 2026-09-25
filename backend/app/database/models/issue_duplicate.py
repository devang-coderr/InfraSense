from datetime import datetime, timezone

from sqlalchemy import Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class IssueDuplicate(Base):
    __tablename__ = "issue_duplicates"

    id: Mapped[int] = mapped_column(primary_key=True)
    master_issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))
    duplicate_issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))
    similarity_score: Mapped[float] = mapped_column(Float)
    distance_meters: Mapped[float] = mapped_column(Float)
    reason: Mapped[str] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
