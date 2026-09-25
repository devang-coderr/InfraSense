from datetime import datetime, timezone

from sqlalchemy import String, Integer, Float, DateTime, ForeignKey, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.database import Base
from app.database.models.enums import Severity, IssueStatus


class Issue(Base):
    __tablename__ = "issues"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(80))
    description: Mapped[str] = mapped_column(Text, default="")
    image_description: Mapped[str] = mapped_column(Text, default="")

    reported_by: Mapped[int] = mapped_column(ForeignKey("users.id"))

    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    ward_id: Mapped[int | None] = mapped_column(ForeignKey("wards.id"), nullable=True)

    severity: Mapped[Severity] = mapped_column(SAEnum(Severity), default=Severity.LOW)
    severity_score: Mapped[int] = mapped_column(Integer, default=0)

    priority_score: Mapped[int] = mapped_column(Integer, default=0)
    confidence: Mapped[int] = mapped_column(Integer, default=0)

    status: Mapped[IssueStatus] = mapped_column(SAEnum(IssueStatus), default=IssueStatus.REPORTED)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"), nullable=True)

    duplicate_count: Mapped[int] = mapped_column(Integer, default=0)

    reported_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc)
    )

    ward: Mapped["Ward | None"] = relationship()
    department: Mapped["Department | None"] = relationship()
    reporter: Mapped["User"] = relationship()
    severity_factors: Mapped[list["IssueSeverityFactor"]] = relationship(
        back_populates="issue", cascade="all, delete-orphan"
    )
    priority_factors: Mapped[list["IssuePriorityFactor"]] = relationship(
        back_populates="issue", cascade="all, delete-orphan"
    )
    media: Mapped[list["IssueMedia"]] = relationship(back_populates="issue", cascade="all, delete-orphan")


class IssueSeverityFactor(Base):
    """Mirrors the frontend's SeverityFactor{label, score, max} exactly."""

    __tablename__ = "issue_severity_factors"

    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))
    label: Mapped[str] = mapped_column(String(80))
    score: Mapped[int] = mapped_column(Integer)
    max: Mapped[int] = mapped_column(Integer)

    issue: Mapped["Issue"] = relationship(back_populates="severity_factors")


class IssuePriorityFactor(Base):
    """Mirrors the frontend's PriorityFactor{label, score, max} exactly."""

    __tablename__ = "issue_priority_factors"

    id: Mapped[int] = mapped_column(primary_key=True)
    issue_id: Mapped[int] = mapped_column(ForeignKey("issues.id"))
    label: Mapped[str] = mapped_column(String(80))
    score: Mapped[int] = mapped_column(Integer)
    max: Mapped[int] = mapped_column(Integer)

    issue: Mapped["Issue"] = relationship(back_populates="priority_factors")
