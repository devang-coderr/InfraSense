from datetime import datetime, timezone

from sqlalchemy import Integer, String, DateTime, Boolean, ForeignKey, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.database.models.enums import WorkOrderStatus


class WorkOrder(Base):
    __tablename__ = "work_orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))
    department_id: Mapped[int] = mapped_column(ForeignKey("departments.id"))
    assigned_to: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    priority: Mapped[int] = mapped_column(Integer, default=0)
    deadline: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    status: Mapped[WorkOrderStatus] = mapped_column(SAEnum(WorkOrderStatus), default=WorkOrderStatus.ASSIGNED)

    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    evidence: Mapped["ResolutionEvidence | None"] = relationship(back_populates="work_order", uselist=False)


class ResolutionEvidence(Base):
    __tablename__ = "resolution_evidence"

    id: Mapped[int] = mapped_column(primary_key=True)
    work_order_id: Mapped[int] = mapped_column(ForeignKey("work_orders.id"), unique=True)

    before_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    after_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    ai_verification_score: Mapped[int] = mapped_column(Integer, default=0)
    ai_verification_status: Mapped[str] = mapped_column(String(60), default="pending")
    authority_confirmed: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))

    work_order: Mapped["WorkOrder"] = relationship(back_populates="evidence")
