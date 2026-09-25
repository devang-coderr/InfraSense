from datetime import datetime, timezone

from sqlalchemy import Integer, String, DateTime, ForeignKey, JSON, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database.database import Base


class WardRiskPrediction(Base):
    """
    `reasons` and `recommended_actions` are stored as JSON lists (rather
    than separate tables) to keep this MVP simple — see spec section 15,
    which explicitly allows simplifying the original two-table design.

    `is_baseline=True` marks this as the rule-based predictor in
    services/prediction_service.py, not a trained ML model.
    """

    __tablename__ = "ward_risk_predictions"

    id: Mapped[int] = mapped_column(primary_key=True)
    ward_id: Mapped[int] = mapped_column(ForeignKey("wards.id"))
    category: Mapped[str] = mapped_column(String(80))

    risk_score: Mapped[int] = mapped_column(Integer)
    prediction_window: Mapped[str] = mapped_column(String(60), default="Next 30 days")

    reasons: Mapped[list] = mapped_column(JSON, default=list)
    recommended_actions: Mapped[list] = mapped_column(JSON, default=list)

    model_name: Mapped[str] = mapped_column(String(80), default="baseline-rule-based")
    is_baseline: Mapped[bool] = mapped_column(Boolean, default=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
