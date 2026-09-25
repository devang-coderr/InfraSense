from datetime import datetime, timezone

from sqlalchemy import String, Integer, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class AIAnalysis(Base):
    """
    Kept SEPARATE from the `issues` table on purpose: the model that
    produced a result can change over time (baseline heuristic today,
    a trained YOLO model later), and every past issue should keep a
    record of exactly which model/version produced its numbers.

    `is_baseline=True` means this result came from the rule-based
    placeholder in app/ai/vision.py, NOT a trained model. The frontend
    and any report about this project must not claim otherwise — see
    app/ai/vision.py docstring.
    """

    __tablename__ = "ai_analysis"

    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))

    model_name: Mapped[str] = mapped_column(String(80))
    model_version: Mapped[str] = mapped_column(String(40))
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=True)

    category: Mapped[str] = mapped_column(String(80))
    confidence: Mapped[int] = mapped_column(Integer)
    severity_score: Mapped[int] = mapped_column(Integer)

    damage_size: Mapped[int] = mapped_column(Integer, default=0)
    road_importance: Mapped[int] = mapped_column(Integer, default=0)
    traffic_exposure: Mapped[int] = mapped_column(Integer, default=0)
    nearby_risk: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
