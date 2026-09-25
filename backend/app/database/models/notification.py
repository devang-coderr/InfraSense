from datetime import datetime, timezone

from sqlalchemy import Integer, String, DateTime, Boolean, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    issue_id: Mapped[int | None] = mapped_column(ForeignKey("issues.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(60))
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
